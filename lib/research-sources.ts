/**
 * Shared source-gathering helpers for research features (clinical trials,
 * PubMed, and the 5-Minute Clinical Consult reference text). Extracted so
 * multiple API routes can reuse the same fetch + parse logic.
 *
 * NOTE: the existing research-summary route keeps its own private copies of
 * very similar helpers; this module is used by newer routes (e.g.
 * research-repurpose) without disturbing that working code.
 */
import { fileSize, listFiles, readBuffer } from "@/lib/research-storage";

const CT_API_BASE = "https://clinicaltrials.gov/api/v2";
const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const BOOKS_ROOT = "books";

// ---------------------------------------------------------------------------
// Source 1: ClinicalTrials.gov
// ---------------------------------------------------------------------------
export interface TrialDigest {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  briefSummary: string;
  interventions: string[];
  conditions: string[];
  sponsor: string;
  url: string;
}

export async function fetchTrials(
  condition: string,
  limit: number,
  term?: string,
): Promise<TrialDigest[]> {
  const url = new URL(`${CT_API_BASE}/studies`);
  if (condition) url.searchParams.set("query.cond", condition);
  // Optional free-text term (e.g. an OR'd list of drug names) — used to find
  // trials in a target condition that test a given set of interventions.
  if (term) url.searchParams.set("query.term", term);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("countTotal", "false");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.error(`research-sources: trials fetch failed ${res.status}`);
    return [];
  }
  const data = await res.json();
  const studies = (data.studies || []) as Record<string, unknown>[];

  return studies
    .map((study) => {
      const proto = (study.protocolSection as Record<string, unknown>) || {};
      const ident = (proto.identificationModule as Record<string, unknown>) || {};
      const statusModule = (proto.statusModule as Record<string, unknown>) || {};
      const designModule = (proto.designModule as Record<string, unknown>) || {};
      const descModule = (proto.descriptionModule as Record<string, unknown>) || {};
      const armsModule = (proto.armsInterventionsModule as Record<string, unknown>) || {};
      const condModule = (proto.conditionsModule as Record<string, unknown>) || {};
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
        interventions: interventionsList
          .map((i) => `${i.type || ""}: ${i.name || ""}`.trim())
          .slice(0, 4),
        conditions: (condModule.conditions as string[]) || [],
        sponsor: ((sponsorModule.leadSponsor as Record<string, unknown>)?.name as string) || "",
        url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : "",
      };
    })
    .filter((t) => t.nctId);
}

// ---------------------------------------------------------------------------
// Source 2: PubMed (top relevance, abstracts only)
// ---------------------------------------------------------------------------
export interface PubMedDigest {
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
    const authors = authorMatches
      .slice(0, 3)
      .map((m) => {
        const last = m.match(/<LastName>([^<]+)<\/LastName>/)?.[1] || "";
        const fore = m.match(/<ForeName>([^<]+)<\/ForeName>/)?.[1] || "";
        return `${fore} ${last}`.trim();
      })
      .join(", ");
    const journal = xmlValue(block, "Title");
    const year = xmlValue(block, "Year");
    const abstractBlock = block.match(/<Abstract>([\s\S]*?)<\/Abstract>/i)?.[1] || "";
    const texts = abstractBlock.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi) || [];
    const abstract = texts
      .map((t) => {
        const label = t.match(/Label="([^"]+)"/i)?.[1];
        const text = t.replace(/<[^>]+>/g, "").trim();
        return label ? `${label}: ${text}` : text;
      })
      .join(" ")
      .trim();
    if (pmid && abstract) out.push({ pmid, title, authors, journal, year, abstract });
  }
  return out;
}

/**
 * Search PubMed with a raw query term (relevance-sorted, abstracts only).
 * Pass the full boolean term; " AND hasabstract" is appended automatically.
 */
export async function fetchPubMed(term: string, limit: number): Promise<PubMedDigest[]> {
  const fullTerm = `${term} AND hasabstract`;
  const searchUrl = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(fullTerm)}&retmax=${limit}&retmode=json&sort=relevance&tool=maryforward&email=team@maryforward.com`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.error(`research-sources: pubmed esearch failed ${searchRes.status}`);
    return [];
  }
  const searchData = await searchRes.json();
  const ids = (searchData.esearchresult?.idlist as string[]) || [];
  if (ids.length === 0) return [];

  const fetchUrl = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml&tool=maryforward&email=team@maryforward.com`;
  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) {
    console.error(`research-sources: pubmed efetch failed ${fetchRes.status}`);
    return [];
  }
  return parsePubMedXml(await fetchRes.text());
}

// ---------------------------------------------------------------------------
// Source 3: 5-Minute Clinical Consult book
// ---------------------------------------------------------------------------
export interface BookDigest {
  title: string;
  pages: number[];
  excerpt: string;
}

// Module-scoped cache so repeated requests (and the two diseases in a
// repurposing query) skip the ~30s PDF parse. Keyed by relative book path.
interface CachedBook {
  pages: string[];
  fileSize: number;
}
const bookCache = new Map<string, CachedBook>();

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

export async function fetchBookExcerpt(condition: string): Promise<BookDigest | null> {
  let entries: string[] = [];
  try {
    entries = await listFiles(BOOKS_ROOT);
  } catch {
    return null;
  }
  // Prefer 5-minute consult
  const targetFile = entries.find((f) => /5.?minute/i.test(f) && f.toLowerCase().endsWith(".pdf"));
  if (!targetFile) return null;

  const relPath = `${BOOKS_ROOT}/${targetFile}`;
  let pages: string[];
  try {
    pages = await getBookPages(relPath);
  } catch (err) {
    console.error(`research-sources: book parse failed: ${err instanceof Error ? err.message : err}`);
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
  const top = scored.slice(0, 4);
  if (top.length === 0) return null;

  const sortedByPage = [...top].sort((a, b) => a.idx - b.idx);
  return {
    title: targetFile.replace(/\.pdf$/i, "").trim(),
    pages: sortedByPage.map((p) => p.idx + 1),
    excerpt: sortedByPage.map((p) => p.text).join("\n\n").substring(0, 12000),
  };
}
