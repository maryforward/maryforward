import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertSafeSegment,
  listFiles,
  listFolders,
  readBuffer,
} from "@/lib/research-storage";
import OpenAI from "openai";

// Allow up to 3 minutes for PDF parsing + OpenAI extraction
export const maxDuration = 180;

// PDFs live under resources/papers (in Vercel Blob in prod, on disk in dev).
const PAPERS_ROOT = "papers";

// Same keyword regexes used by the PubMed research route (fallback when OpenAI unavailable)
const preventionKeywords = /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i;
const diagnosisKeywords = /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i;
const treatmentKeywords = /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i;
const additionalTherapyKeywords = /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i;

// ---------------------------------------------------------------------------
// OpenAI-powered structured extraction
// ---------------------------------------------------------------------------

interface AiExtractedPaper {
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  categories: string[];
}

/**
 * Send raw PDF text to OpenAI and get back a clean, structured extraction
 * that mirrors what PubMed provides: title, authors, journal, year, and a
 * clean abstract with key findings. This replaces the regex-based heuristics.
 */
async function extractWithOpenAI(
  rawText: string,
  filename: string
): Promise<AiExtractedPaper | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Send first ~12000 chars — enough to cover abstract, intro, results,
    // and conclusion of most papers while staying within token limits.
    const truncated = rawText.substring(0, 12000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are a medical research paper parser. Given raw text extracted from a PDF of a medical research paper, produce a structured JSON extraction. Focus ONLY on the scientific findings — ignore page numbers, headers, footers, figure captions, table data, reference lists, and author affiliations.

Return valid JSON with exactly these fields:
{
  "title": "The paper's title",
  "authors": "First Author et al." or list of authors if available,
  "journal": "Journal name if identifiable, otherwise empty string",
  "year": "Publication year if identifiable, otherwise empty string",
  "abstract": "A clean, well-written 200-400 word summary of the paper's key findings, methods, results, and conclusions. Write this as a coherent abstract even if the original paper's abstract is missing or poorly extracted. Include specific data points, percentages, and outcomes where available. This should read like a PubMed abstract.",
  "categories": ["Array of applicable categories from: prevention, diagnosis, treatment, additionalTherapy"]
}

Category definitions:
- prevention: screening, risk reduction, preventive measures, prophylaxis, vaccination
- diagnosis: diagnostic methods, biomarkers, imaging, pathology, staging, prognosis, detection
- treatment: drugs, surgery, radiation, chemotherapy, dosage, regimens, standard therapies
- additionalTherapy: immunotherapy, targeted therapy, gene therapy, complementary approaches, palliative care, rehabilitation, clinical trials, novel/emerging treatments

A paper can belong to multiple categories. Always include at least one category.`,
        },
        {
          role: "user",
          content: `Parse this research paper (filename: ${filename}):\n\n${truncated}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON — handle possible markdown code fences
    const jsonStr = content.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonStr) as AiExtractedPaper;

    // Validate required fields
    if (!parsed.abstract || parsed.abstract.length < 50) return null;

    // Ensure categories is a valid array
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = ["treatment"];
    }

    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`OpenAI extraction failed for ${filename}: ${msg}`);
    return null;
  }
}

function folderNameToLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ParsedPaper {
  filename: string;
  title: string;
  text: string;
}

async function parsePdf(relPath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readBuffer(relPath);
  const result = await pdfParse(buffer);
  return result.text;
}

function extractTitle(filename: string, text: string): string {
  // Try to use the first meaningful line of the PDF as the title
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 10);
  if (lines.length > 0 && lines[0].length < 200) {
    return lines[0];
  }
  // Fallback: use the filename
  return filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

/**
 * Extract the meaningful body text from a research paper PDF, skipping
 * front-matter (editors, dates, author affiliations, copyright notices).
 *
 * Strategy:
 * 1. Look for a labelled abstract section and start there.
 * 2. If no explicit label, skip lines that look like metadata and take
 *    the remaining text.
 */
function extractBodyText(fullText: string): string {
  // 1. Try to find an explicit "Abstract" section
  const abstractMatch = fullText.match(
    /\b(Abstract|ABSTRACT|Summary|SUMMARY)\s*[:\-—]?\s*/
  );
  if (abstractMatch && abstractMatch.index !== undefined) {
    return fullText.substring(abstractMatch.index).trim();
  }

  // 2. Try to find "Introduction" or "Background" section
  const introMatch = fullText.match(
    /\b(1\.\s*Introduction|INTRODUCTION|Background|BACKGROUND)\b/
  );
  if (introMatch && introMatch.index !== undefined) {
    return fullText.substring(introMatch.index).trim();
  }

  // 3. Fallback: skip metadata-heavy lines at the top.
  //    Metadata lines are typically short, contain emails, affiliations, dates.
  const lines = fullText.split("\n");
  const metadataRe = /^(Academic Editor|Received:|Revised:|Accepted:|Published:|Citation:|Copyright:|Licensee|Correspondence:|Tel\.:|https?:\/\/|@|MDPI|doi\.org)/i;
  const affiliationRe = /^(Department of|Division of|University of|College of|Hospital|Centre|Center|School of)/i;

  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Keep skipping while lines are short metadata or match metadata patterns
    if (
      line.length < 15 ||
      metadataRe.test(line) ||
      (line.length < 120 && affiliationRe.test(line)) ||
      /^\d+$/.test(line) ||        // page numbers
      /^[*\d,]+$/.test(line)        // footnote markers
    ) {
      startIdx = i + 1;
      continue;
    }
    // Once we hit a long substantive line, stop skipping
    if (line.length > 150) break;
  }

  return lines.slice(startIdx).join("\n").trim();
}

/**
 * Extract clean sentences from paper body text, filtering out junk
 * (short fragments, emails, references, page numbers).
 */
function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    // Remove common section headings used as inline labels
    .replace(
      /\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi,
      ""
    )
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 600);
}

/**
 * Pick the most relevant sentences for a given keyword regex.
 */
function pickRelevantSentences(sentences: string[], keyword: RegExp, max: number): string[] {
  const matching = sentences.filter((s) => keyword.test(s));
  return matching.length > 0 ? matching.slice(0, max) : sentences.slice(0, 1);
}

/**
 * Process papers using OpenAI for structured extraction, with regex fallback.
 * OpenAI calls are run concurrently (up to 5 at a time) to keep latency low.
 */
async function categorizePapersWithAI(papers: ParsedPaper[], diseaseName: string) {
  const sections = {
    diseaseName,
    summary: [] as string[],
    generalPrevention: [] as string[],
    diagnosis: [] as string[],
    treatment: [] as string[],
    additionalTherapy: [] as string[],
  };

  const articles: {
    pmid: string;
    title: string;
    authors: string;
    journal: string;
    pubDate: string;
    abstract: string;
    categories: string[];
  }[] = [];

  // Run OpenAI extractions concurrently in batches of 5
  const CONCURRENCY = 5;
  const aiResults: (AiExtractedPaper | null)[] = new Array(papers.length).fill(null);

  for (let i = 0; i < papers.length; i += CONCURRENCY) {
    const batch = papers.slice(i, i + CONCURRENCY);
    const promises = batch.map((paper) =>
      extractWithOpenAI(paper.text, paper.filename)
    );
    const results = await Promise.all(promises);
    results.forEach((result, j) => {
      aiResults[i + j] = result;
    });
  }

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    const ai = aiResults[i];

    let title: string;
    let authors: string;
    let journal: string;
    let pubDate: string;
    let abstract: string;
    let categories: string[];

    if (ai) {
      // OpenAI succeeded — use clean structured data
      title = ai.title || paper.title;
      authors = ai.authors || "";
      journal = ai.journal || paper.filename;
      pubDate = ai.year || "";
      abstract = ai.abstract;
      categories = ai.categories;
      console.log(`  AI extraction OK: "${title}" → [${categories.join(", ")}]`);
    } else {
      // Fallback: original regex-based extraction
      const bodyText = extractBodyText(paper.text);
      if (!bodyText) continue;

      title = paper.title;
      authors = "";
      journal = paper.filename;
      pubDate = "";
      abstract = bodyText.substring(0, 8000).trim();

      const fullText = paper.text;
      categories = [];
      if (preventionKeywords.test(fullText)) categories.push("prevention");
      if (diagnosisKeywords.test(fullText)) categories.push("diagnosis");
      if (treatmentKeywords.test(fullText)) categories.push("treatment");
      if (additionalTherapyKeywords.test(fullText)) categories.push("additionalTherapy");
      if (categories.length === 0) categories.push("treatment");
      console.log(`  Regex fallback: "${title}" → [${categories.join(", ")}]`);
    }

    // Build section entries using the (now clean) abstract text
    const sentences = extractSentences(abstract);
    if (sentences.length === 0) continue;

    const summarySnippet = sentences.slice(0, 3).join(" ");
    sections.summary.push(`**${title}** — ${summarySnippet}`);

    if (categories.includes("prevention")) {
      const picked = pickRelevantSentences(sentences, preventionKeywords, 3);
      sections.generalPrevention.push(`**${title}** — ${picked.join(" ")}`);
    }
    if (categories.includes("diagnosis")) {
      const picked = pickRelevantSentences(sentences, diagnosisKeywords, 3);
      sections.diagnosis.push(`**${title}** — ${picked.join(" ")}`);
    }
    if (categories.includes("treatment")) {
      const picked = pickRelevantSentences(sentences, treatmentKeywords, 3);
      sections.treatment.push(`**${title}** — ${picked.join(" ")}`);
    }
    if (categories.includes("additionalTherapy")) {
      const picked = pickRelevantSentences(sentences, additionalTherapyKeywords, 3);
      sections.additionalTherapy.push(`**${title}** — ${picked.join(" ")}`);
    }
    // If no category matched sentences (rare with AI), add to treatment
    if (!categories.includes("prevention") && !categories.includes("diagnosis") &&
        !categories.includes("treatment") && !categories.includes("additionalTherapy")) {
      sections.treatment.push(`**${title}** — ${sentences.slice(0, 3).join(" ")}`);
    }

    articles.push({
      pmid: "",
      title,
      authors,
      journal,
      pubDate,
      abstract,
      categories,
    });
  }

  return { sections, articles };
}

// GET: List available disease folders
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

    // Verify case is assigned
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

    // Read disease folder names from the papers library
    let entries: string[] = [];
    try {
      entries = await listFolders(PAPERS_ROOT);
    } catch {
      // Library may not exist yet
      entries = [];
    }

    const folders = await Promise.all(
      entries.map(async (name) => {
        const files = await listFiles(`${PAPERS_ROOT}/${name}`);
        return {
          name,
          label: folderNameToLabel(name),
          fileCount: files.length,
        };
      })
    );

    // Only return folders that have at least one PDF
    return NextResponse.json({
      folders: folders.filter((f) => f.fileCount > 0),
    });
  } catch (error) {
    console.error("Research library folders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Parse PDFs from selected folder and generate categorized report
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
    const { folder } = body;

    if (!folder || typeof folder !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    try {
      assertSafeSegment(folder);
    } catch {
      return NextResponse.json(
        { error: "Invalid folder" },
        { status: 400 }
      );
    }

    // List PDF files in the folder
    let pdfFiles: string[] = [];
    try {
      pdfFiles = await listFiles(`${PAPERS_ROOT}/${folder}`);
    } catch {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    if (pdfFiles.length === 0) {
      return NextResponse.json({
        totalCount: 0,
        articles: [],
        sections: {
          diseaseName: folderNameToLabel(folder),
          summary: [],
          generalPrevention: [],
          diagnosis: [],
          treatment: [],
          additionalTherapy: [],
        },
      });
    }

    // Parse each PDF
    const papers: ParsedPaper[] = [];
    const errors: string[] = [];
    for (const file of pdfFiles) {
      try {
        const text = await parsePdf(`${PAPERS_ROOT}/${folder}/${file}`);
        const title = extractTitle(file, text);
        papers.push({ filename: file, title, text });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to parse PDF ${file}:`, msg);
        errors.push(`${file}: ${msg}`);
      }
    }

    console.log(`Research library: parsed ${papers.length}/${pdfFiles.length} PDFs from "${folder}". Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.error("Parse errors:", errors.slice(0, 5).join("; "));
    }

    if (papers.length === 0) {
      return NextResponse.json({
        totalCount: 0,
        articles: [],
        sections: {
          diseaseName: folderNameToLabel(folder),
          summary: [],
          generalPrevention: [],
          diagnosis: [],
          treatment: [],
          additionalTherapy: [],
        },
      });
    }

    const diseaseName = folderNameToLabel(folder);
    console.log(`Research library: starting AI extraction for ${papers.length} papers...`);
    const { sections, articles } = await categorizePapersWithAI(papers, diseaseName);
    console.log(`Research library: AI extraction complete. ${articles.length} articles produced.`);

    return NextResponse.json({
      totalCount: papers.length,
      articles,
      sections,
    });
  } catch (error) {
    console.error("Research library error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
