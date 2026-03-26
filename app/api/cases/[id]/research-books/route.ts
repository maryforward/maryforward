import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";

const BOOKS_DIR = resolve(process.cwd(), "resources", "books");

const preventionKeywords = /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i;
const diagnosisKeywords = /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i;
const treatmentKeywords = /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i;
const additionalTherapyKeywords = /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i;

// ---------------------------------------------------------------------------
// In-memory cache for parsed book pages (avoids re-parsing large PDFs)
// ---------------------------------------------------------------------------
interface CachedBook {
  pages: { text: string }[];
  parsedAt: number;
  fileSize: number;
}

const bookCache = new Map<string, CachedBook>();

async function getBookPages(filePath: string): Promise<{ text: string }[]> {
  // Check cache
  const cached = bookCache.get(filePath);
  if (cached) {
    // Verify file hasn't changed by checking size
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size === cached.fileSize) {
        console.log(`Research books: using cached parse for "${filePath}"`);
        return cached.pages;
      }
    } catch {
      // File may have been deleted, clear cache
      bookCache.delete(filePath);
    }
  }

  // Parse fresh
  console.log(`Research books: parsing "${filePath}" (not cached)...`);
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readFile(filePath);
  const pages: { text: string }[] = [];

  await pdfParse(buffer, {
    pagerender: function (pageData: { getTextContent: () => Promise<{ items: { str: string; width: number; transform: number[] }[] }> }) {
      return pageData.getTextContent().then(function (textContent: { items: { str: string; width: number; transform: number[] }[] }) {
        // Build text by analysing item positions:
        // - transform[4] = x position, transform[5] = y position
        // - width = rendered width of the text item (includes trailing space if any)
        // - A y-shift > 3 means a new line
        //
        // Many PDF items already include a trailing space in their `str`
        // (e.g. "focal ", "source "). Their `width` covers that space,
        // so the gap to the next item is negative/zero. We simply
        // concatenate these directly.
        //
        // For items WITHOUT a trailing space (word fragments like "hea",
        // "lt"), we check the positional gap to decide: small/negative
        // gap → join as one word, large gap → insert a space.
        const lines: string[] = [];
        let currentLine = "";
        let prevY: number | null = null;
        let prevEndX = 0;
        let prevFontSize = 0;
        let prevHadTrailingSpace = false;

        for (const item of textContent.items) {
          const x = item.transform[4];
          const y = Math.round(item.transform[5]);
          const fontSize = Math.abs(item.transform[0]);
          const width = item.width || 0;
          const startsWithSpace = item.str.startsWith(" ");

          if (prevY !== null && Math.abs(y - prevY) > 3) {
            // New line
            lines.push(currentLine.trim());
            currentLine = item.str;
          } else if (prevY !== null) {
            if (prevHadTrailingSpace || startsWithSpace) {
              // Previous item already has a trailing space or this one
              // starts with a space — just concatenate, spacing is built in.
              currentLine += item.str;
            } else {
              // Neither side has a space. Check the positional gap to
              // decide if these are fragments of one word or separate words.
              const gap = x - prevEndX;
              const spaceThreshold = (prevFontSize || fontSize) * 0.2;

              if (gap > spaceThreshold) {
                currentLine += " " + item.str;
              } else {
                // Fragments of the same word — join directly
                currentLine += item.str;
              }
            }
          } else {
            currentLine = item.str;
          }

          prevY = y;
          prevEndX = x + width;
          prevFontSize = fontSize;
          prevHadTrailingSpace = item.str.endsWith(" ");
        }

        if (currentLine.trim()) lines.push(currentLine.trim());

        // Post-process: collapse multiple spaces, trim lines
        const pageText = lines
          .map((l) => l.replace(/\s+/g, " ").trim())
          .join("\n");
        pages.push({ text: pageText });
        return pageText;
      });
    },
  });

  // Store in cache
  const fileStat = await stat(filePath);
  bookCache.set(filePath, {
    pages,
    parsedAt: Date.now(),
    fileSize: fileStat.size,
  });

  console.log(`Research books: cached ${pages.length} pages for "${filePath}"`);
  return pages;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bookNameToLabel(filename: string): string {
  return filename.replace(/\.pdf$/i, "").trim();
}

// ---------------------------------------------------------------------------
// Diagnosis broadening via OpenAI: ask an LLM to produce simpler/broader
// search terms so that "Breast Invasive Ductal Carcinoma" → "Breast Cancer"
// ---------------------------------------------------------------------------
import OpenAI from "openai";

const diagnosisTermCache = new Map<string, string[]>();

/**
 * Use OpenAI to generate broader/simpler search terms for a diagnosis.
 * Returns the original term first, followed by LLM-suggested alternatives,
 * ordered from most specific to most general.
 */
async function generateSearchTerms(diagnosis: string): Promise<string[]> {
  const original = diagnosis.toLowerCase().trim();

  // Check cache first
  const cached = diagnosisTermCache.get(original);
  if (cached) return cached;

  const terms: string[] = [original];

  // If no API key, return just the original term
  if (!process.env.OPENAI_API_KEY) {
    console.log("Research books: no OPENAI_API_KEY, skipping diagnosis broadening");
    return terms;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content:
            "You are a medical terminology expert. Given a specific medical diagnosis, return a JSON array of progressively broader/simpler search terms that a medical textbook might use as a chapter or section heading. Order from most specific to most general. Include common names, parent disease categories, and the terms a general medical reference book would use. Return ONLY a JSON array of lowercase strings, no explanation.",
        },
        {
          role: "user",
          content: `Diagnosis: "${diagnosis}"`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    // Parse the JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed: string[] = JSON.parse(match[0]);
      const seen = new Set<string>([original]);
      for (const term of parsed) {
        const t = String(term).toLowerCase().trim();
        if (t.length > 1 && !seen.has(t)) {
          seen.add(t);
          terms.push(t);
        }
      }
    }

    console.log(`Research books: broadened "${diagnosis}" → [${terms.join(", ")}]`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Research books: OpenAI diagnosis broadening failed: ${msg}`);
    // Fall back to original term only
  }

  // Cache for future calls in this server session
  diagnosisTermCache.set(original, terms);
  return terms;
}

/**
 * Detect pages that are front-matter, table-of-contents, acknowledgments,
 * contributor lists, or other non-clinical content. These pages may mention
 * a disease name incidentally but contain no useful medical information.
 */
function isFrontMatterPage(text: string): boolean {
  // Normalize whitespace (tabs, multiple spaces) to single spaces for matching
  const normalized = text.replace(/[\t ]+/g, " ");
  const lower = normalized.toLowerCase();

  // Dedication / acknowledgment pages
  if (/\b(dedicated to|is dedicated|acknowledgments?|contributing authors?|editor-in-chief|associate editors?)\b/i.test(normalized)) {
    return true;
  }

  // Table-of-contents pages: many short entries with "5MinuteConsult" or page numbers
  const tocMatches = (normalized.match(/5\s*Minute\s*Consult/gi) || []).length;
  if (tocMatches > 3) return true;

  // Pages that are mostly names/affiliations (contributor lists)
  const lines = normalized.split("\n").map((l) => l.trim()).filter((l) => l.length > 5);
  if (lines.length > 5) {
    const nameLines = lines.filter((l) =>
      /^[A-Z][a-z]+ [A-Z]\.? [A-Z][a-z]+/.test(l) || // "John A. Smith"
      /\b(MD|PhD|DO|FAAFP|MPH|MS|RN|NP)\b/.test(l) || // Credentials
      /\b(Department of|University of|Medical School|Hospital|Professor|Resident)\b/i.test(l)
    );
    if (nameLines.length / lines.length > 0.4) return true;
  }

  // Copyright/publishing pages
  if (/\b(copyright|licensee|all rights reserved|ISBN|published by|wolters kluwer|lippincott)\b/i.test(normalized)) {
    const contentWords = lower.split(/\s+/).filter((w) => w.length > 3);
    if (contentWords.length < 150) return true;
  }

  // Preface/foreword pages (usually personal, not clinical)
  if (/\b(preface|foreword)\b/i.test(normalized) && normalized.length < 3000) {
    return true;
  }

  // Short personal pages (dedications, thanks) — no clinical content
  if (normalized.length < 1500 && /\b(thank you|thanks|i love you|mom|dad)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Score how prominently the search term features on a page.
 * Returns 0 if the page is not relevant enough to include.
 *
 * High scores indicate the disease is a PRIMARY topic of the page
 * (e.g. page heading, repeated mentions, or appears in the first
 * few lines). Low scores indicate a passing mention (e.g. "including
 * COVID-19" in a test panel on a page about something else).
 */
function pageRelevanceScore(
  pageText: string,
  fullPhrase: string,
  searchWords: string[]
): number {
  const normalized = pageText.replace(/[\t ]+/g, " ");
  const lower = normalized.toLowerCase();
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  if (!lower.includes(fullPhrase)) {
    // Check if all search words appear
    const allMatch = searchWords.every((w) => lower.includes(w));
    if (!allMatch) return 0;
  }

  let score = 0;

  // 1. Appears in the first 3 lines (likely a page heading / title)
  //    This is the strongest signal — the page IS about this disease.
  const topLines = lines.slice(0, 3).join(" ").toLowerCase();
  if (topLines.includes(fullPhrase)) {
    score += 50;
  }

  // 2. Check if the term only appears inside citation/reference contexts.
  const refLineRe = /\b(et al\.|doi\s*:|J\s+Med|Clin\s+Med|\d{4};\d+\(\d+\)|\[published|https?:\/\/)/i;
  let mentionsInBody = 0;
  let mentionsInRefs = 0;
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (!lineLower.includes(fullPhrase)) continue;
    if (refLineRe.test(line)) {
      mentionsInRefs++;
    } else {
      mentionsInBody++;
    }
  }

  // If all mentions are in references/citations, page is not about the disease
  if (mentionsInBody === 0 && mentionsInRefs > 0) {
    return 0;
  }

  // 3. Count body mentions — but only give significant score for REPEATED mentions.
  //    A single passing mention (e.g. "COVID toes" on a frostbite page) should not
  //    be enough to include the page. The disease must be a substantial topic.
  if (mentionsInBody === 1 && score < 50) {
    // Single mention outside the heading — likely a passing reference.
    // Only give a small score; the page needs other signals to pass the threshold.
    score += 5;
  } else {
    score += mentionsInBody * 10;
  }

  // 4. Penalize if the page heading is clearly about a different disease/topic
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Detect heading: short line, all-caps, or starts with bullet/section marker
    const isHeading = firstLine.length < 150 && (
      /^[A-Z\s,\-()\/]+$/.test(firstLine) ||
      firstLine === firstLine.toUpperCase() ||
      /^●\s/.test(firstLine)
    );
    if (isHeading && !firstLine.toLowerCase().includes(fullPhrase)) {
      score -= 30; // Page is about a different topic
    }
  }

  return score;
}

function findRelevantPages(
  pages: { text: string }[],
  searchTerm: string
): { pageNum: number; text: string }[] {
  const searchWords = searchTerm
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (searchWords.length === 0) return [];

  const fullPhrase = searchTerm.toLowerCase().trim();

  // Score all pages and keep only those where the disease is a primary topic
  const scored: { pageNum: number; text: string; score: number }[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i].text;
    if (pageText.trim().length < 100) continue;
    if (isFrontMatterPage(pageText)) continue;

    const score = pageRelevanceScore(pageText, fullPhrase, searchWords);
    if (score > 0) {
      scored.push({ pageNum: i + 1, text: pageText, score });
    }
  }

  // Sort by relevance score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Only include pages that score above a minimum threshold.
  // A passing mention (score ~2-12) should be excluded.
  // A page where the disease is the topic (score 20+) is kept.
  // A page must score at least 20 to be included. This means the disease must
  // either appear in the heading (50 pts) or be mentioned multiple times in
  // body text. A single passing mention (-30 for wrong heading + 5 for one
  // mention = -25) will never pass.
  const MIN_SCORE = 20;
  const relevant = scored.filter((p) => p.score >= MIN_SCORE);

  console.log(
    `Research books: page scores for "${searchTerm}":`,
    scored.map((p) => `p${p.pageNum}=${p.score}`).join(", ") || "none"
  );

  return relevant.map(({ pageNum, text }) => ({ pageNum, text }));
}

function buildBookReport(
  relevantPages: { pageNum: number; text: string }[],
  diagnosis: string,
  bookTitle: string
) {
  const allText = relevantPages.map((p) => p.text).join("\n");
  const pageNumbers = relevantPages.map((p) => p.pageNum);
  const pageRange = pageNumbers.length > 0
    ? `pp. ${Math.min(...pageNumbers)}–${Math.max(...pageNumbers)}`
    : "";

  // Split on line breaks first, then on sentence boundaries within each line.
  // This preserves bullet-point structure from the source PDF.
  const lines = allText.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const sentences: string[] = [];
  const bulletRe = /^[\u2022\u2023\u25E6\u25AA\u25CF•\-–—*]\s*/;

  // Protect abbreviations, URLs, and common patterns from sentence splitting.
  // Replace their periods with a placeholder, split, then restore.
  const PERIOD_PLACEHOLDER = "\x00";
  function protectPeriods(text: string): string {
    return text
      // URLs: anything.com/.org/.edu/.gov/.net
      .replace(/(\w)\.(com|org|edu|gov|net|io)\b/gi, `$1${PERIOD_PLACEHOLDER}$2`)
      // Common abbreviations
      .replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|vs|etc|e\.g|i\.e|al|Fig|Vol|No|Dept|Assoc|Univ|Med|Surg|Clin|Int|Rev|Pharmacol|Ther|Prev)\./gi,
        (m) => m.replace(/\./g, PERIOD_PLACEHOLDER))
      // Single letter followed by period (initials like "J." or "A.")
      .replace(/\b([A-Z])\.\s*(?=[A-Z])/g, `$1${PERIOD_PLACEHOLDER} `)
      // Numbers followed by period (e.g., "1." "2.")
      .replace(/(\d)\.\s*(?=\d)/g, `$1${PERIOD_PLACEHOLDER} `);
  }
  function restorePeriods(text: string): string {
    return text.replace(new RegExp(PERIOD_PLACEHOLDER, "g"), ".");
  }

  // Sentences that start with these words are likely fragments from a bad split
  const fragmentStartRe = /^(and|or|but|nor|yet|so|also|as well as|in addition|noticed|including|resulting|which|that|than|because|while|although|however|therefore|thus|furthermore|moreover|with|without|for|to|from|into|by|at|of|the)\b/i;

  for (const line of lines) {
    // If the line looks like a bullet / short item, keep it as-is
    if (line.length < 500 && bulletRe.test(line)) {
      if (line.length > 15) sentences.push(line);
    } else {
      // Split on sentence boundaries, protecting abbreviations/URLs
      const protected_ = protectPeriods(line);
      const rawParts = protected_.split(/(?<=[.!?])\s+/).map((s) => restorePeriods(s.trim()));

      // Merge fragments back into the previous sentence
      const merged: string[] = [];
      for (const part of rawParts) {
        if (merged.length > 0 && fragmentStartRe.test(part)) {
          merged[merged.length - 1] += " " + part;
        } else {
          merged.push(part);
        }
      }

      const filtered = merged.filter((s) => s.length > 30 && s.length < 600);
      sentences.push(...filtered);
    }
  }

  // Final filter: remove sentences that are not useful clinical content
  const cleanSentences = sentences.filter((s) => {
    // TOC entries
    if (/5\s*Minute\s*Consult/i.test(s)) return false;
    // Author names with credentials: "Frank Estrella, DO and Jon..."
    if (/^[A-Z][a-z]+ (?:[A-Z]\.? )?[A-Z][a-z]+,?\s*(MD|PhD|DO|RN|MPH|FAAFP|MS)\b/.test(s)) return false;
    // Citation / reference lines: "Babapoor-Farrokhran S, Rasekhi RT..."
    if (/^[A-Z][a-z]+-?[A-Z]?[a-z]* [A-Z],/.test(s)) return false;
    // DOI / publication metadata
    if (/\bdoi\s*[:.]?\s*10\./i.test(s)) return false;
    if (/\[published online/i.test(s)) return false;
    // Lines that are mostly abbreviations or lab values without context
    if (/^(CBC|LP |CSF|CXR|UA |CAP)\b/.test(s) && s.length < 80) return false;
    return true;
  });

  const preventionSentences = cleanSentences.filter((s) => preventionKeywords.test(s));
  const diagnosisSentences = cleanSentences.filter((s) => diagnosisKeywords.test(s));
  const treatmentSentences = cleanSentences.filter((s) => treatmentKeywords.test(s));
  const additionalSentences = cleanSentences.filter((s) => additionalTherapyKeywords.test(s));

  const maxPerCategory = 15;

  return {
    bookTitle,
    pageRange,
    pageCount: relevantPages.length,
    diagnosis,
    categories: {
      summary: cleanSentences.slice(0, 20),
      prevention: preventionSentences.slice(0, maxPerCategory),
      diagnosis: diagnosisSentences.slice(0, maxPerCategory),
      treatment: treatmentSentences.slice(0, maxPerCategory),
      additionalTherapy: additionalSentences.slice(0, maxPerCategory),
    },
  };
}

// ---------------------------------------------------------------------------
// GET: List available books
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const caseData = await prisma.case.findFirst({
      where: { id, assignedClinicianId: session.user.id },
      select: { id: true },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found or not assigned to you" },
        { status: 404 }
      );
    }

    let files: string[] = [];
    try {
      const dirEntries = await readdir(BOOKS_DIR);
      files = dirEntries.filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
    } catch {
      files = [];
    }

    const books = files.map((f) => ({
      filename: f,
      label: bookNameToLabel(f),
    }));

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Research books list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST: Search book for content relevant to the case diagnosis
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const caseData = await prisma.case.findFirst({
      where: { id, assignedClinicianId: session.user.id },
      select: { primaryDiagnosis: true },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found or not assigned to you" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { book } = body;

    if (!book || typeof book !== "string") {
      return NextResponse.json(
        { error: "Book filename is required" },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    const filePath = resolve(BOOKS_DIR, book);
    if (!filePath.startsWith(BOOKS_DIR)) {
      return NextResponse.json(
        { error: "Invalid book" },
        { status: 400 }
      );
    }

    const diagnosis = caseData.primaryDiagnosis || "";
    if (!diagnosis) {
      return NextResponse.json(
        { error: "Case has no primary diagnosis to search for" },
        { status: 400 }
      );
    }

    // Get pages (cached after first parse)
    let pages: { text: string }[];
    try {
      pages = await getBookPages(filePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to parse book "${book}":`, msg);
      return NextResponse.json(
        { error: "Failed to read the book. It may be too large or corrupted." },
        { status: 502 }
      );
    }

    const bookTitle = bookNameToLabel(book);

    // Try the original diagnosis first, then progressively broader terms
    const searchTerms = await generateSearchTerms(diagnosis);
    let relevantPages: { pageNum: number; text: string }[] = [];
    let matchedTerm = diagnosis;

    for (const term of searchTerms) {
      relevantPages = findRelevantPages(pages, term);
      if (relevantPages.length > 0) {
        matchedTerm = term;
        console.log(`Research books: found ${relevantPages.length} pages for "${term}" (original: "${diagnosis}") in "${book}"`);
        break;
      }
      console.log(`Research books: no results for "${term}", trying next variant...`);
    }

    if (relevantPages.length === 0) {
      console.log(`Research books: no results for any variant of "${diagnosis}" in "${book}"`);
      const response = NextResponse.json({ totalCount: 0, bookReport: null });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // Use the original diagnosis name in the report, but note the matched term if different
    const bookReport = buildBookReport(relevantPages, diagnosis, bookTitle);

    const response = NextResponse.json({ totalCount: relevantPages.length, bookReport });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Research books error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
