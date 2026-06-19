import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fileSize, listFiles, readBuffer } from "@/lib/research-storage";
import OpenAI from "openai";

// PDF parsing + 3 source fetches + OpenAI synthesis can be slow
export const maxDuration = 300;

const CT_API_BASE = "https://clinicaltrials.gov/api/v2";
const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const BOOKS_ROOT = "books";

// Module-scoped cache so repeated summary requests for the same book skip the
// ~30s PDF parse. Keyed by absolute file path.
interface CachedBook {
  pages: string[];
  fileSize: number;
}
const bookCache = new Map<string, CachedBook>();

// ---------------------------------------------------------------------------
// Source 1: ClinicalTrials.gov
// ---------------------------------------------------------------------------
interface TrialDigest {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  briefSummary: string;
  interventions: string[];
  sponsor: string;
  url: string;
}

async function fetchTrials(condition: string, limit: number): Promise<TrialDigest[]> {
  const url = new URL(`${CT_API_BASE}/studies`);
  url.searchParams.set("query.cond", condition);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("countTotal", "false");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.error(`research-summary: trials fetch failed ${res.status}`);
    return [];
  }
  const data = await res.json();
  const studies = (data.studies || []) as Record<string, unknown>[];

  return studies.map((study) => {
    const proto = (study.protocolSection as Record<string, unknown>) || {};
    const ident = (proto.identificationModule as Record<string, unknown>) || {};
    const statusModule = (proto.statusModule as Record<string, unknown>) || {};
    const designModule = (proto.designModule as Record<string, unknown>) || {};
    const descModule = (proto.descriptionModule as Record<string, unknown>) || {};
    const armsModule = (proto.armsInterventionsModule as Record<string, unknown>) || {};
    const sponsorModule = (proto.sponsorCollaboratorsModule as Record<string, unknown>) || {};
    const phases = (designModule.phases as string[]) || [];
    const interventionsList = (armsModule.interventions as Array<Record<string, unknown>>) || [];
    const nctId = (ident.nctId as string) || "";
    return {
      nctId,
      title: (ident.briefTitle as string) || "",
      status: (statusModule.overallStatus as string) || "",
      phase: phases.join(", ") || "N/A",
      briefSummary: (descModule.briefSummary as string) || "",
      interventions: interventionsList.map((i) => `${i.type || ""}: ${i.name || ""}`.trim()).slice(0, 3),
      sponsor: ((sponsorModule.leadSponsor as Record<string, unknown>)?.name as string) || "",
      url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : "",
    };
  }).filter((t) => t.nctId);
}

// ---------------------------------------------------------------------------
// Source 2: PubMed (top relevance, abstracts only)
// ---------------------------------------------------------------------------
interface PubMedDigest {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
}

function xmlValue(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function parsePubMedXml(xml: string): PubMedDigest[] {
  const out: PubMedDigest[] = [];
  const blocks = xml.split("<PubmedArticle>");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const pmid = xmlValue(block, "PMID");
    const title = xmlValue(block, "ArticleTitle").replace(/<[^>]+>/g, "");
    const authorMatches = block.match(/<LastName>([^<]+)<\/LastName>\s*<ForeName>([^<]+)<\/ForeName>/g) || [];
    const authors = authorMatches.slice(0, 3).map((m) => {
      const last = m.match(/<LastName>([^<]+)<\/LastName>/)?.[1] || "";
      const fore = m.match(/<ForeName>([^<]+)<\/ForeName>/)?.[1] || "";
      return `${fore} ${last}`.trim();
    }).join(", ");
    const journal = xmlValue(block, "Title");
    const year = xmlValue(block, "Year");
    const abstractBlock = block.match(/<Abstract>([\s\S]*?)<\/Abstract>/i)?.[1] || "";
    const texts = abstractBlock.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi) || [];
    const abstract = texts.map((t) => {
      const label = t.match(/Label="([^"]+)"/i)?.[1];
      const text = t.replace(/<[^>]+>/g, "").trim();
      return label ? `${label}: ${text}` : text;
    }).join(" ").trim();
    if (pmid && abstract) out.push({ pmid, title, authors, journal, year, abstract });
  }
  return out;
}

async function fetchPubMed(condition: string, limit: number): Promise<PubMedDigest[]> {
  const term = `${condition} AND hasabstract`;
  const searchUrl = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=${limit}&retmode=json&sort=relevance&tool=maryforward&email=team@maryforward.com`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.error(`research-summary: pubmed esearch failed ${searchRes.status}`);
    return [];
  }
  const searchData = await searchRes.json();
  const ids = (searchData.esearchresult?.idlist as string[]) || [];
  if (ids.length === 0) return [];

  const fetchUrl = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml&tool=maryforward&email=team@maryforward.com`;
  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) {
    console.error(`research-summary: pubmed efetch failed ${fetchRes.status}`);
    return [];
  }
  return parsePubMedXml(await fetchRes.text());
}

// ---------------------------------------------------------------------------
// Source 3: 5-Minute Clinical Consult book
// ---------------------------------------------------------------------------
interface BookDigest {
  title: string;
  pages: number[];
  excerpt: string;
}

async function getBookPages(relPath: string): Promise<string[]> {
  const cached = bookCache.get(relPath);
  if (cached) {
    try {
      if ((await fileSize(relPath)) === cached.fileSize) return cached.pages;
    } catch {
      bookCache.delete(relPath);
    }
  }
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readBuffer(relPath);
  const pages: string[] = [];
  await pdfParse(buffer, {
    pagerender: function (pageData: { getTextContent: () => Promise<{ items: { str: string }[] }> }) {
      return pageData.getTextContent().then((tc) => {
        const text = tc.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
        pages.push(text);
        return text;
      });
    },
  });
  bookCache.set(relPath, { pages, fileSize: await fileSize(relPath) });
  return pages;
}

async function fetchBookExcerpt(condition: string): Promise<BookDigest | null> {
  let entries: string[] = [];
  try {
    entries = await listFiles(BOOKS_ROOT);
  } catch {
    return null;
  }
  // Prefer 5-minute consult; fall back to any pdf if it's the only one
  const targetFile = entries.find((f) => /5.?minute/i.test(f) && f.toLowerCase().endsWith(".pdf"));
  if (!targetFile) return null;

  const relPath = `${BOOKS_ROOT}/${targetFile}`;
  let pages: string[];
  try {
    pages = await getBookPages(relPath);
  } catch (err) {
    console.error(`research-summary: book parse failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  const lower = condition.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  const scored: { idx: number; score: number; text: string }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const t = pages[i];
    if (t.length < 200) continue;
    const tl = t.toLowerCase();
    let score = 0;
    if (tl.includes(lower)) score += 20;
    for (const w of words) {
      const matches = tl.split(w).length - 1;
      score += matches * 2;
    }
    if (score > 0) scored.push({ idx: i, score, text: t });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);
  if (top.length === 0) return null;

  const sortedByPage = [...top].sort((a, b) => a.idx - b.idx);
  return {
    title: targetFile.replace(/\.pdf$/i, "").trim(),
    pages: sortedByPage.map((p) => p.idx + 1),
    excerpt: sortedByPage.map((p) => p.text).join("\n\n").substring(0, 20000),
  };
}

// ---------------------------------------------------------------------------
// OpenAI synthesis
// ---------------------------------------------------------------------------
export interface SummaryReport {
  condition: string;
  medical: {
    background: string;
    diagnosis_workup: string;
    treatment_approach: string;
    ongoing_research: string;
  };
  plain: {
    what_this_is: string;
    how_doctors_find_it: string;
    treatment_options: string;
    studies_underway: string;
  };
  sources: {
    trials: { nctId: string; title: string; status: string; phase: string; url: string }[];
    pubmed: { pmid: string; title: string; authors: string; journal: string; year: string }[];
    book: { title: string; pages: number[] } | null;
  };
}

const SYSTEM_PROMPT = `You are a medical research synthesis expert producing a combined summary report for a clinician and their patient.

You will receive source material from up to three sources for a single medical condition:
- Clinical Trials (from ClinicalTrials.gov)
- PubMed research articles (peer-reviewed literature)
- A 5-Minute Clinical Consult book excerpt (reference textbook)

LENGTH IS IMPORTANT. The final report must fill approximately 5 printed pages of body text (excluding references): roughly 2.5 pages of medical content and 2.5 pages of plain-language content. Aim for substantive depth in every section — do not leave any section short.

Produce a single JSON object with TWO halves:

1. "medical" — for the treating clinician. Use professional medical terminology. Four sections, each MINIMUM 280 words and TARGET 320-400 words (so the four together fill ~2.5 pages):
   - background: pathophysiology, epidemiology, risk factors, clinical presentation, prognosis
   - diagnosis_workup: diagnostic criteria, history-taking, physical exam findings, imaging, labs, biopsy/staging, differentials
   - treatment_approach: standard-of-care therapies, first-line and second-line regimens, surgical/procedural options, dosing principles, guideline references, complication management
   - ongoing_research: notable trials by phase and design, key endpoints, emerging therapies, recent literature findings, future directions

2. "plain" — for the patient. Use everyday language, short sentences, and avoid jargon (briefly explain any medical term you cannot avoid). Four sections, each MINIMUM 280 words and TARGET 320-400 words (so the four together fill ~2.5 pages):
   - what_this_is: what the condition is, who it affects, why it happens, what symptoms to expect
   - how_doctors_find_it: what the doctor will ask, examine, scan, and test for, in everyday words
   - treatment_options: the main treatment choices, what each one does, common side effects, what the patient can expect
   - studies_underway: a friendly description of relevant clinical trials and recent research, why studies matter, and how the patient can ask about joining

Use multiple paragraphs per section (separate with blank lines). Do NOT pad with filler — use the source material to provide real depth. If a particular section has thin source material, draw on general medical knowledge for that condition but stay accurate and conservative.

Citation rules: when referencing a source, cite inline using [T1], [T2]... for trials in the order they appear in the source list; [P1], [P2]... for PubMed in the order they appear; [B] for the book. Use citations naturally — not every sentence needs one, but each section should cite multiple sources where applicable.

Tone: factual, neutral, evidence-based. Do not invent specific numbers, drug doses, or trial outcomes that are not supported by the sources.

Return ONLY valid JSON matching this exact shape:
{
  "medical": { "background": "...", "diagnosis_workup": "...", "treatment_approach": "...", "ongoing_research": "..." },
  "plain": { "what_this_is": "...", "how_doctors_find_it": "...", "treatment_options": "...", "studies_underway": "..." }
}`;

function buildUserPrompt(
  condition: string,
  trials: TrialDigest[],
  pubmed: PubMedDigest[],
  book: BookDigest | null,
): string {
  const parts: string[] = [`Condition: ${condition}`, ""];

  if (trials.length > 0) {
    parts.push(`=== CLINICAL TRIALS (${trials.length}) ===`);
    trials.forEach((t, i) => {
      const ref = `T${i + 1}`;
      parts.push(`[${ref}] ${t.title}`);
      parts.push(`  Status: ${t.status} | Phase: ${t.phase} | Sponsor: ${t.sponsor}`);
      if (t.interventions.length > 0) parts.push(`  Interventions: ${t.interventions.join("; ")}`);
      if (t.briefSummary) parts.push(`  Summary: ${t.briefSummary.substring(0, 1200)}`);
      parts.push("");
    });
  }

  if (pubmed.length > 0) {
    parts.push(`=== PUBMED ARTICLES (${pubmed.length}) ===`);
    pubmed.forEach((p, i) => {
      const ref = `P${i + 1}`;
      parts.push(`[${ref}] ${p.title}`);
      parts.push(`  ${p.authors} — ${p.journal} ${p.year}`.trim());
      parts.push(`  Abstract: ${p.abstract.substring(0, 1500)}`);
      parts.push("");
    });
  }

  if (book) {
    parts.push(`=== 5-MINUTE CLINICAL CONSULT [B] ===`);
    parts.push(`Source: ${book.title}, pages ${book.pages.join(", ")}`);
    parts.push(book.excerpt);
    parts.push("");
  }

  return parts.join("\n");
}

interface AiResponse {
  medical: SummaryReport["medical"];
  plain: SummaryReport["plain"];
}

async function synthesizeWithOpenAI(
  condition: string,
  trials: TrialDigest[],
  pubmed: PubMedDigest[],
  book: BookDigest | null,
): Promise<AiResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    // ~5 pages of body text needs ~3500 words ≈ 5000 tokens. Give headroom
    // for the eight sections plus JSON structural overhead.
    max_tokens: 10000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(condition, trials, pubmed, book) },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty response");
  const parsed = JSON.parse(content) as AiResponse;

  // Minimal shape check; if anything is missing, fill with a marker so the
  // client can still render the report instead of failing entirely.
  const emptyMedical = { background: "", diagnosis_workup: "", treatment_approach: "", ongoing_research: "" };
  const emptyPlain = { what_this_is: "", how_doctors_find_it: "", treatment_options: "", studies_underway: "" };
  return {
    medical: { ...emptyMedical, ...(parsed.medical || {}) },
    plain: { ...emptyPlain, ...(parsed.plain || {}) },
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      return NextResponse.json({ error: "Case not found or not assigned to you" }, { status: 404 });
    }

    const body = await request.json();
    const condition: string = (body.condition || caseData.primaryDiagnosis || "").trim();
    const includeTrials = body.includeTrials !== false;
    const includePubMed = body.includePubMed !== false;
    const includeBook = body.includeBook !== false;

    if (!condition) {
      return NextResponse.json(
        { error: "No condition specified and case has no primary diagnosis" },
        { status: 400 },
      );
    }

    console.log(`research-summary: condition="${condition}", trials=${includeTrials}, pubmed=${includePubMed}, book=${includeBook}`);

    const TRIALS_LIMIT = 15;
    const PUBMED_LIMIT = 15;

    const [trials, pubmed, book] = await Promise.all([
      includeTrials ? fetchTrials(condition, TRIALS_LIMIT).catch((e) => {
        console.error("research-summary: trials error:", e);
        return [];
      }) : Promise.resolve([] as TrialDigest[]),
      includePubMed ? fetchPubMed(condition, PUBMED_LIMIT).catch((e) => {
        console.error("research-summary: pubmed error:", e);
        return [];
      }) : Promise.resolve([] as PubMedDigest[]),
      includeBook ? fetchBookExcerpt(condition).catch((e) => {
        console.error("research-summary: book error:", e);
        return null;
      }) : Promise.resolve(null),
    ]);

    console.log(`research-summary: gathered trials=${trials.length}, pubmed=${pubmed.length}, book=${book ? "yes" : "no"}`);

    if (trials.length === 0 && pubmed.length === 0 && !book) {
      return NextResponse.json(
        { error: "No source material found from any selected source." },
        { status: 404 },
      );
    }

    const ai = await synthesizeWithOpenAI(condition, trials, pubmed, book);

    const report: SummaryReport = {
      condition,
      medical: ai.medical,
      plain: ai.plain,
      sources: {
        trials: trials.map((t) => ({
          nctId: t.nctId,
          title: t.title,
          status: t.status,
          phase: t.phase,
          url: t.url,
        })),
        pubmed: pubmed.map((p) => ({
          pmid: p.pmid,
          title: p.title,
          authors: p.authors,
          journal: p.journal,
          year: p.year,
        })),
        book: book ? { title: book.title, pages: book.pages } : null,
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("research-summary error:", msg);
    return NextResponse.json({ error: msg || "Internal server error" }, { status: 500 });
  }
}
