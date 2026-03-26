"use client";

import { useState, useEffect, useCallback } from "react";
import { simplifyMedicalText, SIMPLE_REPORT_STYLES } from "@/lib/medical-simplify";

interface ResearchSection {
  diseaseName: string;
  summary: string[];
  generalPrevention: string[];
  diagnosis: string[];
  treatment: string[];
  additionalTherapy: string[];
}

interface LibraryArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string;
  abstract: string;
  categories?: string[];
}

interface LibraryResult {
  totalCount: number;
  sections: ResearchSection;
  articles: LibraryArticle[];
}

interface LibraryFolder {
  name: string;
  label: string;
  fileCount: number;
}

// ---------------------------------------------------------------------------
// Keyword regexes for categorization
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  prevention: /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i,
  diagnosis: /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i,
  treatment: /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i,
  additionalTherapy: /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i,
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** Split text into sentences, filtering out junk lines. */
function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    // Remove common section labels
    .replace(/\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 500);
}

/** Pick the most relevant sentences for a given keyword regex, max N per document. */
function pickRelevantSentences(sentences: string[], keyword: RegExp, max: number): string[] {
  const matching = sentences.filter((s) => keyword.test(s));
  if (matching.length > 0) return matching.slice(0, max);
  // Fallback: return first sentence as general context
  return sentences.slice(0, 1);
}

/** Check if two texts overlap significantly (>60% shared words). */
function hasSignificantOverlap(textA: string, textB: string): boolean {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter((w) => w.length > 4));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter((w) => w.length > 4));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  const smaller = Math.min(wordsA.size, wordsB.size);
  return shared / smaller > 0.6;
}

/** Remove duplicate/near-duplicate articles, keeping the first occurrence. */
function deduplicateArticles(articles: LibraryArticle[]): LibraryArticle[] {
  const kept: LibraryArticle[] = [];
  for (const article of articles) {
    const text = `${article.title} ${article.abstract}`.substring(0, 2000);
    const isDupe = kept.some((k) =>
      hasSignificantOverlap(text, `${k.title} ${k.abstract}`.substring(0, 2000))
    );
    if (!isDupe) kept.push(article);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Report builders — synthesized narrative with superscript citations
// ---------------------------------------------------------------------------

interface TaggedSentence {
  text: string;
  sourceIdx: number;
}

interface CategorizedSentences {
  prevention: TaggedSentence[];
  diagnosis: TaggedSentence[];
  treatment: TaggedSentence[];
  additionalTherapy: TaggedSentence[];
}

/**
 * Collect relevant sentences from all articles for each category.
 * Each sentence is tagged with its source article index.
 */
function collectCategorySentences(articles: LibraryArticle[]): CategorizedSentences {
  const result: CategorizedSentences = {
    prevention: [],
    diagnosis: [],
    treatment: [],
    additionalTherapy: [],
  };

  // Two passes: first pass adds 1 best sentence per article per category to
  // ensure every paper is represented. Second pass adds up to 2 more.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article.abstract || !article.abstract.trim()) continue;

      const sentences = extractSentences(article.abstract);
      const cats = article.categories;

      const belongs = (cat: string) =>
        cats && cats.length > 0
          ? cats.includes(cat)
          : CATEGORY_KEYWORDS[cat]?.test(`${article.title} ${article.abstract}`);

      if (pass === 0) {
        // First pass: 1 best sentence per article per category
        if (belongs("prevention")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.prevention, 1);
          picked.forEach((s) => result.prevention.push({ text: s, sourceIdx: i }));
        }
        if (belongs("diagnosis")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.diagnosis, 1);
          picked.forEach((s) => result.diagnosis.push({ text: s, sourceIdx: i }));
        }
        if (belongs("treatment")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.treatment, 1);
          picked.forEach((s) => result.treatment.push({ text: s, sourceIdx: i }));
        }
        if (belongs("additionalTherapy")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.additionalTherapy, 1);
          picked.forEach((s) => result.additionalTherapy.push({ text: s, sourceIdx: i }));
        }
        if (!belongs("prevention") && !belongs("diagnosis") && !belongs("treatment") && !belongs("additionalTherapy")) {
          sentences.slice(0, 1).forEach((s) => result.treatment.push({ text: s, sourceIdx: i }));
        }
      } else {
        // Second pass: add 2 more sentences per article for depth
        if (belongs("prevention")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.prevention, 3).slice(1);
          picked.forEach((s) => result.prevention.push({ text: s, sourceIdx: i }));
        }
        if (belongs("diagnosis")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.diagnosis, 3).slice(1);
          picked.forEach((s) => result.diagnosis.push({ text: s, sourceIdx: i }));
        }
        if (belongs("treatment")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.treatment, 3).slice(1);
          picked.forEach((s) => result.treatment.push({ text: s, sourceIdx: i }));
        }
        if (belongs("additionalTherapy")) {
          const picked = pickRelevantSentences(sentences, CATEGORY_KEYWORDS.additionalTherapy, 3).slice(1);
          picked.forEach((s) => result.additionalTherapy.push({ text: s, sourceIdx: i }));
        }
      }
    }
  }

  return result;
}

/**
 * Build flowing paragraphs from a pool of tagged sentences.
 * Groups ~5 sentences into each paragraph, combining citations at the end.
 * Returns the HTML and the set of source indices actually used.
 */
function buildNarrativeParagraphs(
  sentences: TaggedSentence[],
  maxSentences: number = 200,
  simple: boolean = false
): { html: string; usedSources: Set<number> } {
  const capped = sentences.slice(0, maxSentences);
  const usedSources = new Set<number>();
  if (capped.length === 0) return { html: "", usedSources };

  const paragraphs: string[] = [];
  const sentencesPerParagraph = simple ? 3 : 5;

  for (let i = 0; i < capped.length; i += sentencesPerParagraph) {
    const group = capped.slice(i, i + sentencesPerParagraph);
    const text = group
      .map((s) => {
        const cleaned = stripHtml(s.text);
        return simple ? simplifyMedicalText(cleaned) : cleaned;
      })
      .join(" ");

    const sourceNums = [...new Set(group.map((s) => s.sourceIdx))].sort((a, b) => a - b);
    sourceNums.forEach((n) => usedSources.add(n));
    const citations = sourceNums.map((n) => `${n + 1}`).join(",");

    paragraphs.push(`<p>${text}<sup>[${citations}]</sup></p>`);
  }

  return { html: paragraphs.join("\n"), usedSources };
}



const REPORT_STYLES = `
    @media print { @page { margin: 0.8in; } body { font-size: 12px; } }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; }
    h1 { font-size: 22px; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 4px; color: #0c4a6e; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
    h2 { font-size: 16px; color: #0369a1; margin-top: 32px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section { margin-bottom: 28px; }
    .section p { font-size: 13px; color: #334155; margin: 0 0 16px 0; text-align: justify; line-height: 1.8; }
    .section p:last-child { margin-bottom: 0; }
    sup { font-size: 9px; color: #0369a1; font-weight: 600; }
    .disease-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
    .disease-banner h3 { margin: 0; font-size: 15px; color: #0c4a6e; }
    .intro { font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.8; }
    .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
    .references ol { padding-left: 0; list-style: none; }
    .references li { font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.6; padding-bottom: 6px; border-bottom: 1px solid #f8fafc; }
    .references li:last-child { border-bottom: none; }
    .references li strong { color: #0369a1; }
    .ref-source { color: #94a3b8; }
    .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .section-note { font-size: 13px; color: #64748b; font-style: italic; margin-bottom: 16px; line-height: 1.7; }
`;

function generateReportHtml(articles: LibraryArticle[], diseaseName: string, simple: boolean): string {
  const cleanName = stripHtml(diseaseName);

  // Deduplicate — remove papers with >60% word overlap
  const dedupedArticles = deduplicateArticles(articles);
  const categorized = collectCategorySentences(dedupedArticles);

  const sectionDefs = simple
    ? [
        { key: "prevention" as const, title: "Prevention — How to Reduce Your Risk", note: "This section summarizes what researchers have found about lowering the chances of getting this condition or stopping it from getting worse." },
        { key: "diagnosis" as const, title: "Diagnosis — How Doctors Find This Condition", note: "This section covers the tests, scans, and methods researchers have studied for detecting and confirming this condition." },
        { key: "treatment" as const, title: "Treatment — What Can Be Done About It", note: "This section describes what researchers have found about treatments, including medicines, procedures, and other approaches." },
        { key: "additionalTherapy" as const, title: "Other Options — Additional Therapies Being Explored", note: "This section covers newer or less common approaches that researchers are studying, such as immune-based treatments, supportive care, and clinical trials." },
      ]
    : [
        { key: "prevention" as const, title: "General Prevention", note: "" },
        { key: "diagnosis" as const, title: "Diagnosis", note: "" },
        { key: "treatment" as const, title: "Treatment", note: "" },
        { key: "additionalTherapy" as const, title: "Additional Therapy", note: "" },
      ];

  // Track all source indices actually cited in the report
  const allUsedSources = new Set<number>();

  const sectionHtml = sectionDefs
    .filter((s) => categorized[s.key].length > 0)
    .map((s) => {
      const { html: paragraphs, usedSources } = buildNarrativeParagraphs(categorized[s.key], 200, simple);
      usedSources.forEach((idx) => allUsedSources.add(idx));
      const noteHtml = s.note ? `<p class="section-note">${s.note}</p>` : "";
      return `
      <div class="section">
        <h2>${s.title}</h2>
        ${noteHtml}
        ${paragraphs}
      </div>`;
    })
    .join("");

  // Build overview: pool first 2 sentences from each article into flowing paragraphs
  const overviewSentences: TaggedSentence[] = [];
  dedupedArticles.forEach((a, i) => {
    if (!a.abstract || !a.abstract.trim()) return;
    const sentences = extractSentences(a.abstract);
    sentences.slice(0, 2).forEach((s) => overviewSentences.push({ text: s, sourceIdx: i }));
  });
  const { html: overviewParagraphs, usedSources: overviewUsed } = buildNarrativeParagraphs(overviewSentences, 200, simple);
  overviewUsed.forEach((idx) => allUsedSources.add(idx));

  const overviewHtml = overviewParagraphs
    ? `
      <div class="section">
        <h2>${simple ? "What Is This Condition?" : "Summary"}</h2>
        ${simple ? '<p class="section-note">Here is a general overview of this condition based on what researchers have published. This will help you understand the basics before reading the more detailed sections below.</p>' : ""}
        ${overviewParagraphs}
      </div>`
    : "";

  const eliminatedCount = articles.length - dedupedArticles.length;
  const dedupNote = eliminatedCount > 0
    ? ` (${eliminatedCount} duplicate${eliminatedCount > 1 ? "s" : ""} removed)`
    : "";

  // Only include referenced articles in the references section
  const refsHtml = dedupedArticles
    .map((a, i) => {
      if (!allUsedSources.has(i)) return null;
      const title = stripHtml(a.title);
      const source = stripHtml(a.journal).replace(/\.pdf$/i, "");
      return `<li><strong>[${i + 1}]</strong> ${title} <span class="ref-source">(${source})</span></li>`;
    })
    .filter(Boolean)
    .join("\n          ");

  const citedCount = allUsedSources.size;
  const title = simple
    ? "Understanding Your Condition — A Plain-Language Research Summary"
    : "Document Library Research Report";
  const introText = simple
    ? `This guide summarizes findings from <strong>${citedCount} research documents</strong>${dedupNote} about <strong>${cleanName}</strong>. Medical terms have been replaced with everyday language wherever possible. Each section is designed to answer a common question you might have. The small numbers <sup>[1]</sup> at the end of paragraphs show where the information came from.`
    : `This report synthesizes findings from <strong>${citedCount} documents</strong>${dedupNote} related to <strong>${cleanName}</strong>. Citations reference the source documents listed in the References section.`;

  const keyTermsHtml = simple
    ? `
      <div class="key-terms">
        <h3>A note about this guide</h3>
        <p>Research papers use technical language. We have tried to replace complex terms with simpler words, but some medical names for drugs, tests, or body parts may still appear. If you see a word you don't understand, ask your doctor or nurse to explain it — that is always okay to do.</p>
      </div>`
    : "";

  const styles = simple ? SIMPLE_REPORT_STYLES : REPORT_STYLES;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${cleanName}</title>
  <style>${styles}</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward &mdash; Based on ${citedCount} source documents${dedupNote}</div>
  <div class="disease-banner"><h3>Condition: ${cleanName}</h3></div>
  <p class="intro">${introText}</p>
  ${keyTermsHtml}
  ${overviewHtml}
  ${sectionHtml}
  <div class="references">
    <h2>References</h2>
    <ol>
      ${refsHtml}
    </ol>
  </div>
  <p class="disclaimer">${simple
    ? "This guide was created from curated research documents to help you learn about your condition. It is not a substitute for talking to your doctor. Always discuss any questions or concerns with your healthcare provider before making decisions about your health."
    : "This report is a summary of curated research documents and is intended for informational purposes only. It does not replace professional medical advice. Always consult with your healthcare provider about any medical decisions."
  }</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

function SectionBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;

  return (
    <div className="glass p-5">
      <h3 className={`text-base font-semibold ${color}`}>{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-300 leading-relaxed">
            <span
              dangerouslySetInnerHTML={{
                __html: item
                  .replace(/\*\*(.+?)\*\*/g, "<strong class='text-slate-100'>$1</strong>"),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function OtherResearchButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LibraryResult | null>(null);

  const fetchFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/research-library`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch {
      // Silently fail
    } finally {
      setFoldersLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (isOpen && folders.length === 0) {
      fetchFolders();
    }
  }, [isOpen, folders.length, fetchFolders]);

  const openPrintWindow = (html: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleExportPdf = () => {
    if (!result) return;
    openPrintWindow(generateReportHtml(result.articles, result.sections.diseaseName, false));
  };

  const handleSimpleReport = () => {
    if (!result) return;
    openPrintWindow(generateReportHtml(result.articles, result.sections.diseaseName, true));
  };

  const handleSearch = async () => {
    if (!selectedFolder) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/research-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: selectedFolder }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load documents");
      }

      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btnSecondary flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        Other Research
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">
                Other Research — Document Library
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Filter */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">
                Select a disease category to generate a report from curated PDF documents:
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Disease Category
                  </label>
                  {foldersLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                      <SpinnerIcon />
                      Loading categories...
                    </div>
                  ) : folders.length === 0 ? (
                    <p className="py-2 text-sm text-slate-500">
                      No document categories available. Add PDF files to the resources/papers/ directory.
                    </p>
                  ) : (
                    <select
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="" className="bg-slate-800 text-slate-200">
                        Select a category...
                      </option>
                      {folders.map((folder) => (
                        <option key={folder.name} value={folder.name} className="bg-slate-800 text-slate-200">
                          {folder.label} ({folder.fileCount} {folder.fileCount === 1 ? "document" : "documents"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {folders.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={handleSearch}
                    disabled={loading || !selectedFolder}
                    className="btn btnPrimary flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon />
                        Analyzing Documents...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
              )}
              {result && result.totalCount === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">No readable documents found in this category.</div>
              )}
              {result && result.totalCount > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Analyzed {result.totalCount} {result.totalCount === 1 ? "document" : "documents"}, categorized by topic.
                  </p>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-5">
                    <h3 className="text-base font-semibold text-sky-300">Category: {result.sections.diseaseName}</h3>
                  </div>
                  <SectionBlock title="Summary" items={result.sections.summary} color="text-slate-100" />
                  <SectionBlock title="General Prevention" items={result.sections.generalPrevention} color="text-emerald-300" />
                  <SectionBlock title="Diagnosis" items={result.sections.diagnosis} color="text-violet-300" />
                  <SectionBlock title="Treatment" items={result.sections.treatment} color="text-amber-300" />
                  <SectionBlock title="Additional Therapy" items={result.sections.additionalTherapy} color="text-teal-300" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between border-t border-white/10 px-6 py-3">
              <div>
                {result && result.totalCount > 0 && (
                  <div className="flex gap-2">
                    <button onClick={handleExportPdf} className="btn btnSecondary flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to PDF
                    </button>
                    <button onClick={handleSimpleReport} className="btn btnSecondary flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Simple Report
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="btn btnSecondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
