"use client";

import { useState } from "react";

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

const PREVENTION_KEYWORDS = /\bprevention\b|\bpreventive\b|\bprophyla\w+\b|\bvaccinat\w+\b|\bscreening\b|\brisk\s*reduc\w+\b/i;
const DIAGNOSIS_KEYWORDS = /\bdiagnos\w+\b|\bdetect\w+\b|\bbiomarker\b|\bimaging\b|\bpatholog\w+\b|\bbiopsy\b|\bstaging\b|\bprognos\w+\b/i;
const TREATMENT_KEYWORDS = /\btreat\w+\b|\btherap\w+\b|\bchemotherap\w+\b|\bsurger\w+\b|\bsurgical\b|\bradiat\w+\b|\bdrug\b|\bdosage\b|\bregimen\b|\bfirst.line\b|\bsecond.line\b/i;
const ADDITIONAL_THERAPY_KEYWORDS = /\balternativ\w+\b|\bcomplement\w+\b|\bsupport\w+\s*care\b|\bpalliativ\w+\b|\brehabilitat\w+\b|\bimmunotherap\w+\b|\btargeted\s*therap\w+\b|\bgene\s*therap\w+\b|\bclinical\s*trial\b|\bnovel\b|\bemerging\b/i;

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

function formatPdfItem(item: string): string {
  return item
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[PMID: (\d+)\]/g,
      '<a href="https://pubmed.ncbi.nlm.nih.gov/$1/">PMID: $1</a>'
    );
}

function generatePdfHtml(sections: ResearchSection): string {
  const sectionEntries: { title: string; items: string[] }[] = [
    { title: "Summary", items: sections.summary },
    { title: "General Prevention", items: sections.generalPrevention },
    { title: "Diagnosis", items: sections.diagnosis },
    { title: "Treatment", items: sections.treatment },
    { title: "Additional Therapy", items: sections.additionalTherapy },
  ];

  const sectionHtml = sectionEntries
    .filter((s) => s.items.length > 0)
    .map(
      (s) => `
      <div class="section">
        <h2>${s.title}</h2>
        <ul>
          ${s.items.map((item) => `<li>${formatPdfItem(item)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Research Report - ${stripHtml(sections.diseaseName)}</title>
  <style>
    @media print { @page { margin: 1in; } }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { font-size: 22px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
    h2 { font-size: 16px; color: #0369a1; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .section { margin-bottom: 20px; }
    ul { padding-left: 20px; }
    li { font-size: 13px; margin-bottom: 10px; }
    strong { color: #0f172a; }
    a { color: #0369a1; text-decoration: none; }
    .disease-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
    .disease-banner h3 { margin: 0; font-size: 15px; color: #0c4a6e; }
  </style>
</head>
<body>
  <h1>PubMed Research Report</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward</div>
  <div class="disease-banner"><h3>Disease: ${stripHtml(sections.diseaseName)}</h3></div>
  ${sectionHtml}
</body>
</html>`;
}

function categorizeArticlesForSimpleReport(articles: PubMedArticle[]) {
  const withAbstract = articles.filter((a) => a.abstract && a.abstract.trim() !== "");

  const prevention: PubMedArticle[] = [];
  const diagnosis: PubMedArticle[] = [];
  const treatment: PubMedArticle[] = [];
  const additionalTherapy: PubMedArticle[] = [];

  for (const article of withAbstract) {
    const text = `${article.title} ${article.abstract}`;
    let categorized = false;

    if (PREVENTION_KEYWORDS.test(text)) { prevention.push(article); categorized = true; }
    if (DIAGNOSIS_KEYWORDS.test(text)) { diagnosis.push(article); categorized = true; }
    if (TREATMENT_KEYWORDS.test(text)) { treatment.push(article); categorized = true; }
    if (ADDITIONAL_THERAPY_KEYWORDS.test(text)) { additionalTherapy.push(article); categorized = true; }
    if (!categorized) { treatment.push(article); }
  }

  return { all: withAbstract, prevention, diagnosis, treatment, additionalTherapy };
}

function renderSimpleArticleHtml(article: PubMedArticle): string {
  const author = article.authors ? article.authors.split(",")[0] + " et al." : "Unknown";
  const year = article.pubDate || "n.d.";

  const cleanAbstract = article.abstract
    .replace(/\b(BACKGROUND|OBJECTIVE|METHODS|RESULTS|CONCLUSIONS?|PURPOSE|AIMS?|INTRODUCTION|DESIGN|SETTING|PARTICIPANTS|MEASUREMENTS|MAIN OUTCOME MEASURES?|SIGNIFICANCE|CONTEXT|IMPORTANCE|OBSERVATIONS?)\s*:\s*/gi, "")
    .replace(/\n+/g, " ")
    .trim();

  return `
    <div class="article">
      <h3><a href="https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/">${stripHtml(article.title)}</a></h3>
      <p class="article-meta">${author} (${year}) &mdash; ${stripHtml(article.journal)}</p>
      <p class="article-abstract">${stripHtml(cleanAbstract)}</p>
    </div>`;
}

function generateSimpleReportHtml(articles: PubMedArticle[], diseaseName: string): string {
  const categorized = categorizeArticlesForSimpleReport(articles);

  const simpleSections: { title: string; description: string; articles: PubMedArticle[] }[] = [
    { title: "Overview of Research", description: "Below are all the research studies found about this condition. Each entry includes a summary of what the study looked at and what was found.", articles: categorized.all },
    { title: "Prevention — How to Reduce Risk", description: "These studies focus on ways to lower the chances of getting this condition or stop it from getting worse. This can include lifestyle changes, screening tests, or preventive treatments.", articles: categorized.prevention },
    { title: "Diagnosis — How Doctors Identify the Condition", description: "These studies focus on how doctors find and confirm this condition. This may include blood tests, imaging (like scans), biopsies, or other methods used to detect the condition early.", articles: categorized.diagnosis },
    { title: "Treatment — How It Can Be Treated", description: "These studies look at treatments that have been used or are being studied. Treatments can include medications, surgery, radiation, or other medical procedures.", articles: categorized.treatment },
    { title: "Additional Options — Other Therapies Being Explored", description: "These studies cover newer or additional approaches beyond standard treatment. This can include immune-based therapies, supportive care to manage symptoms, rehabilitation, or treatments currently being tested in clinical trials.", articles: categorized.additionalTherapy },
  ];

  const sectionHtml = simpleSections
    .filter((s) => s.articles.length > 0)
    .map(
      (s) => `
      <div class="section">
        <h2>${s.title}</h2>
        <p class="section-description">${s.description}</p>
        ${s.articles.map((a) => renderSimpleArticleHtml(a)).join("")}
      </div>`
    )
    .join("");

  const cleanDiseaseName = stripHtml(diseaseName);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Simple Research Report - ${cleanDiseaseName}</title>
  <style>
    @media print { @page { margin: 1in; } }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.7; }
    h1 { font-size: 24px; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 4px; color: #0c4a6e; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
    h2 { font-size: 17px; color: #0369a1; margin-top: 36px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section { margin-bottom: 28px; }
    .section-description { font-size: 14px; color: #475569; margin-top: 0; margin-bottom: 18px; background: #f8fafc; border-left: 3px solid #0ea5e9; padding: 10px 14px; border-radius: 0 6px 6px 0; }
    .article { margin-bottom: 20px; padding: 14px 16px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; }
    .article h3 { font-size: 14px; margin: 0 0 4px 0; color: #0f172a; }
    .article h3 a { color: #0369a1; text-decoration: none; }
    .article h3 a:hover { text-decoration: underline; }
    .article-meta { font-size: 12px; color: #64748b; margin: 0 0 8px 0; }
    .article-abstract { font-size: 13px; color: #334155; margin: 0; line-height: 1.65; }
    .disease-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .disease-banner h3 { margin: 0; font-size: 16px; color: #0c4a6e; }
    .intro { font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.7; }
    .disclaimer { font-size: 12px; color: #94a3b8; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>Research Report — Easy-to-Read Version</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward</div>
  <div class="disease-banner"><h3>Condition: ${cleanDiseaseName}</h3></div>
  <p class="intro">This report summarizes published research from PubMed about <strong>${cleanDiseaseName}</strong>. It is organized into sections to help you understand what scientists and doctors have studied about this condition — including prevention, diagnosis, treatment, and newer therapies. Each entry includes a summary so you can understand what was researched and what was found.</p>
  ${sectionHtml}
  <p class="disclaimer">This report is a simplified summary of published research articles from PubMed and is intended for informational purposes only. It does not replace professional medical advice. Always consult with your healthcare provider about any medical decisions.</p>
</body>
</html>`;
}

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
    openPrintWindow(generatePdfHtml(result.sections));
  };

  const handleSimpleReport = () => {
    if (!result) return;
    openPrintWindow(generateSimpleReportHtml(result.articles, result.sections.diseaseName));
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
              <h2 className="text-lg font-semibold text-slate-50">
                PubMed Research Papers
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

            {/* Search Filters */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">
                Search PubMed using the case&apos;s primary diagnosis with additional filters:
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Publication Date</label>
                  <select value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {PUBLICATION_DATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Text Availability</label>
                  <select value={textAvailability} onChange={(e) => setTextAvailability(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {TEXT_AVAILABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Article Type</label>
                  <select value={articleType} onChange={(e) => setArticleType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    {ARTICLE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                    ))}
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
                  <p className="text-sm text-slate-400">Found {result.totalCount.toLocaleString()} articles. Showing top {Math.min(20, result.totalCount)} results, categorized by topic.</p>
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
