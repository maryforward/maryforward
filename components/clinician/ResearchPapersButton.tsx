"use client";

import { useState } from "react";
import { simplifyMedicalText, SIMPLE_REPORT_STYLES } from "@/lib/medical-simplify";

interface ResearchSection {
  diseaseName: string;
  summary: string[];
  generalPrevention: string[];
  diagnosis: string[];
  treatment: string[];
  additionalTherapy: string[];
}

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string;
  abstract: string;
}

interface ResearchResult {
  totalCount: number;
  sections: ResearchSection;
  articles: PubMedArticle[];
}

const PUBLICATION_DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "1year", label: "Last 1 year" },
  { value: "5years", label: "Last 5 years" },
  { value: "10years", label: "Last 10 years" },
];

const TEXT_AVAILABILITY_OPTIONS = [
  { value: "", label: "Any" },
  { value: "hasabstract", label: "Abstract" },
  { value: "free full text", label: "Free full text" },
  { value: "full text", label: "Full text" },
];

const ARTICLE_TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "clinical trial", label: "Clinical Trial" },
  { value: "meta-analysis", label: "Meta-Analysis" },
  { value: "randomized controlled trial", label: "Randomized Controlled Trial" },
  { value: "review", label: "Review" },
  { value: "systematic review", label: "Systematic Review" },
  { value: "case reports", label: "Case Reports" },
  { value: "comparative study", label: "Comparative Study" },
  { value: "observational study", label: "Observational Study" },
  { value: "practice guideline", label: "Practice Guideline" },
  { value: "multicenter study", label: "Multicenter Study" },
  { value: "controlled clinical trial", label: "Controlled Clinical Trial" },
  { value: "clinical trial, phase i", label: "Clinical Trial, Phase I" },
  { value: "clinical trial, phase ii", label: "Clinical Trial, Phase II" },
  { value: "clinical trial, phase iii", label: "Clinical Trial, Phase III" },
  { value: "clinical trial, phase iv", label: "Clinical Trial, Phase IV" },
  { value: "guideline", label: "Guideline" },
  { value: "validation study", label: "Validation Study" },
  { value: "journal article", label: "Journal Article" },
  { value: "preprint", label: "Preprint" },
];

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  prevention: /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i,
  diagnosis: /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i,
  treatment: /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i,
  additionalTherapy: /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i,
};

// ---------------------------------------------------------------------------
// Utilities
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
                  .replace(/\*\*(.+?)\*\*/g, "<strong class='text-slate-100'>$1</strong>")
                  .replace(
                    /\[PMID: (\d+)\]/g,
                    '<a href="https://pubmed.ncbi.nlm.nih.gov/$1/" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline">[PMID: $1]</a>'
                  ),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 500);
}

function pickRelevantSentences(sentences: string[], keyword: RegExp, max: number): string[] {
  const matching = sentences.filter((s) => keyword.test(s));
  if (matching.length > 0) return matching.slice(0, max);
  return sentences.slice(0, 1);
}

// ---------------------------------------------------------------------------
// Synthesized narrative report generation
// ---------------------------------------------------------------------------

interface TaggedSentence {
  text: string;
  sourceIdx: number;
}

/**
 * Collect relevant sentences from all articles, pooled by category.
 * Each sentence tagged with its source article index.
 */
function collectCategorySentences(articles: PubMedArticle[]): Record<string, TaggedSentence[]> {
  const result: Record<string, TaggedSentence[]> = {
    prevention: [],
    diagnosis: [],
    treatment: [],
    additionalTherapy: [],
  };

  // Two passes: first ensures every article gets at least 1 sentence per
  // category so no paper is silently dropped. Second adds depth.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article.abstract || !article.abstract.trim()) continue;

      const sentences = extractSentences(article.abstract);
      const text = `${article.title} ${article.abstract}`;

      if (pass === 0) {
        let categorized = false;
        for (const [cat, regex] of Object.entries(CATEGORY_KEYWORDS)) {
          if (regex.test(text)) {
            const picked = pickRelevantSentences(sentences, regex, 1);
            picked.forEach((s) => result[cat].push({ text: s, sourceIdx: i }));
            categorized = true;
          }
        }
        if (!categorized) {
          sentences.slice(0, 1).forEach((s) => result.treatment.push({ text: s, sourceIdx: i }));
        }
      } else {
        for (const [cat, regex] of Object.entries(CATEGORY_KEYWORDS)) {
          if (regex.test(text)) {
            const picked = pickRelevantSentences(sentences, regex, 3).slice(1);
            picked.forEach((s) => result[cat].push({ text: s, sourceIdx: i }));
          }
        }
      }
    }
  }

  return result;
}

/**
 * Build flowing paragraphs from a pool of tagged sentences.
 * Groups ~5 sentences per paragraph, combined citations at the end.
 * Returns HTML and the set of source indices actually used.
 */
function buildNarrativeParagraphs(
  sentences: TaggedSentence[],
  maxSentences: number = 1500,
  simple: boolean = false
): { html: string; usedSources: Set<number> } {
  const capped = sentences.slice(0, maxSentences);
  const usedSources = new Set<number>();
  if (capped.length === 0) return { html: "", usedSources };

  const paragraphs: string[] = [];
  const groupSize = simple ? 3 : 5;

  for (let i = 0; i < capped.length; i += groupSize) {
    const group = capped.slice(i, i + groupSize);
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

function buildReferenceEntry(article: PubMedArticle, idx: number): string {
  const author = article.authors ? article.authors.split(",")[0] + " et al." : "Unknown";
  const year = article.pubDate || "n.d.";
  const title = stripHtml(article.title);
  const journal = stripHtml(article.journal);
  const pmidLink = article.pmid
    ? ` <a href="https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/">PMID: ${article.pmid}</a>`
    : "";
  return `<li><strong>[${idx + 1}]</strong> ${author} (${year}). ${title}. <em>${journal}</em>.${pmidLink}</li>`;
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
    .references a { color: #0369a1; text-decoration: none; }
    .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .section-note { font-size: 13px; color: #64748b; font-style: italic; margin-bottom: 16px; line-height: 1.7; }
`;

function generateReportHtml(articles: PubMedArticle[], diseaseName: string, simple: boolean): string {
  const cleanName = stripHtml(diseaseName);
  const withAbstract = articles.filter((a) => a.abstract && a.abstract.trim());
  const categorized = collectCategorySentences(withAbstract);

  const allUsedSources = new Set<number>();

  const sectionDefs = simple
    ? [
        { key: "prevention", title: "Prevention — How to Reduce Your Risk", note: "This section summarizes what researchers have found about lowering the chances of getting this condition or stopping it from getting worse." },
        { key: "diagnosis", title: "Diagnosis — How Doctors Find This Condition", note: "This section covers the tests, scans, and methods researchers have studied for detecting and confirming this condition." },
        { key: "treatment", title: "Treatment — What Can Be Done About It", note: "This section describes what researchers have found about treatments, including medicines, procedures, and other approaches." },
        { key: "additionalTherapy", title: "Other Options — Additional Therapies Being Explored", note: "This section covers newer or less common approaches that researchers are studying, such as immune-based treatments, supportive care, and clinical trials." },
      ]
    : [
        { key: "prevention", title: "General Prevention", note: "" },
        { key: "diagnosis", title: "Diagnosis", note: "" },
        { key: "treatment", title: "Treatment", note: "" },
        { key: "additionalTherapy", title: "Additional Therapy", note: "" },
      ];

  const sectionHtml = sectionDefs
    .filter((s) => categorized[s.key].length > 0)
    .map((s) => {
      const { html: paragraphs, usedSources } = buildNarrativeParagraphs(categorized[s.key], 1500, simple);
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

  // Overview: pool first 2 sentences from each article
  const overviewSentences: TaggedSentence[] = [];
  withAbstract.forEach((a, i) => {
    const sentences = extractSentences(a.abstract);
    sentences.slice(0, 2).forEach((s) => overviewSentences.push({ text: s, sourceIdx: i }));
  });
  const { html: overviewParagraphs, usedSources: overviewUsed } = buildNarrativeParagraphs(overviewSentences, 1500, simple);
  overviewUsed.forEach((idx) => allUsedSources.add(idx));

  const overviewHtml = overviewParagraphs
    ? `
      <div class="section">
        <h2>${simple ? "What Is This Condition?" : "Summary"}</h2>
        ${simple ? '<p class="section-note">Here is a general overview of this condition based on what researchers have published. This will help you understand the basics before reading the more detailed sections below.</p>' : ""}
        ${overviewParagraphs}
      </div>`
    : "";

  // Only include referenced articles
  const refsHtml = withAbstract
    .map((a, i) => allUsedSources.has(i) ? buildReferenceEntry(a, i) : null)
    .filter(Boolean)
    .join("\n          ");

  const citedCount = allUsedSources.size;
  const title = simple
    ? "Understanding Your Condition — A Plain-Language Research Summary"
    : "PubMed Research Report";
  const introText = simple
    ? `This guide summarizes findings from <strong>${citedCount} published research studies</strong> about <strong>${cleanName}</strong>. Medical terms have been replaced with everyday language wherever possible. Each section is designed to answer a common question you might have. The small numbers <sup>[1]</sup> at the end of paragraphs show where the information came from.`
    : `This report synthesizes findings from <strong>${citedCount} published studies</strong> on PubMed related to <strong>${cleanName}</strong>. Citations reference the source studies listed in References.`;

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
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward &mdash; Based on ${citedCount} research studies</div>
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
    ? "This guide was created from published research studies to help you learn about your condition. It is not a substitute for talking to your doctor. Always discuss any questions or concerns with your healthcare provider before making decisions about your health."
    : "This report is a summary of published research articles from PubMed and is intended for informational purposes only. It does not replace professional medical advice. Always consult with your healthcare provider about any medical decisions."
  }</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResearchPapersButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);

  const [publicationDate, setPublicationDate] = useState("");
  const [textAvailability, setTextAvailability] = useState("");
  const [articleType, setArticleType] = useState("");

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
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationDate, textAvailability, articleType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
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
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        PubMed
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">PubMed Research Papers</h2>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Filters */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">Search PubMed using the case&apos;s primary diagnosis with additional filters:</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Publication Date</label>
                  <select value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {PUBLICATION_DATE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Text Availability</label>
                  <select value={textAvailability} onChange={(e) => setTextAvailability(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {TEXT_AVAILABILITY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Article Type</label>
                  <select value={articleType} onChange={(e) => setArticleType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {ARTICLE_TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button onClick={handleSearch} disabled={loading} className="btn btnPrimary flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Searching PubMed...
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
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
              )}
              {result && result.totalCount === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">No articles found. Try adjusting your search filters.</div>
              )}
              {result && result.totalCount > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">Found {result.totalCount.toLocaleString()} articles. Analyzed {result.articles.length} with abstracts, categorized by topic.</p>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-5">
                    <h3 className="text-base font-semibold text-sky-300">Disease: {result.sections.diseaseName}</h3>
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
