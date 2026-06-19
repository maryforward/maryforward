"use client";

import { useState } from "react";

interface SummaryReport {
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

const REPORT_STYLES = `
  @media print { @page { margin: 0.8in; } body { font-size: 12px; } }
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.75; }
  h1 { font-size: 22px; border-bottom: 3px solid #db2777; padding-bottom: 10px; margin-bottom: 4px; color: #831843; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
  .condition-banner { background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
  .condition-banner h3 { margin: 0; font-size: 15px; color: #831843; }
  .intro { font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.8; }
  .half-banner { background: #fce7f3; color: #831843; padding: 10px 16px; border-radius: 6px; font-weight: 600; margin: 28px 0 12px 0; font-size: 14px; }
  .half-banner.plain { background: #ecfeff; color: #155e75; }
  h2 { font-size: 16px; color: #be185d; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #f5d0e7; padding-bottom: 4px; }
  .plain h2 { color: #0e7490; border-bottom-color: #cffafe; }
  .section { margin-bottom: 22px; }
  .section p { font-size: 13px; color: #334155; margin: 0 0 12px 0; text-align: justify; line-height: 1.8; }
  sup { font-size: 9px; color: #be185d; font-weight: 600; }
  .plain sup { color: #0e7490; }
  .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #e2e8f0; page-break-inside: avoid; }
  .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
  .references h3 { font-size: 13px; color: #475569; margin-top: 14px; margin-bottom: 6px; }
  .references ol { padding-left: 0; list-style: none; margin: 0; }
  .references li { font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.5; }
  .references li strong { color: #be185d; }
  .references a { color: #be185d; text-decoration: none; }
  .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
  .page-break { page-break-after: always; }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Convert paragraph text from OpenAI (may contain double newlines) into <p>...</p>
 *  Also wrap [T1], [P3], [B] etc. as <sup>. */
function paragraphsToHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  return paragraphs
    .map((p) => {
      const escaped = escapeHtml(p);
      const withCitations = escaped.replace(/\[(T\d+|P\d+|B)(,\s*(T\d+|P\d+|B))*\]/g, (m) => `<sup>${m}</sup>`);
      return `<p>${withCitations}</p>`;
    })
    .join("\n");
}

function buildReportHtml(report: SummaryReport): string {
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sourceCounts = [
    report.sources.trials.length > 0 ? `${report.sources.trials.length} trials` : null,
    report.sources.pubmed.length > 0 ? `${report.sources.pubmed.length} PubMed articles` : null,
    report.sources.book ? "5-Minute Clinical Consult" : null,
  ].filter(Boolean).join(", ");

  const trialRefs = report.sources.trials.map((t, i) => {
    const link = t.url ? ` <a href="${t.url}">${t.nctId}</a>` : "";
    return `<li><strong>[T${i + 1}]</strong> ${escapeHtml(t.title)} — ${escapeHtml(t.status)}, ${escapeHtml(t.phase)}.${link}</li>`;
  }).join("\n");

  const pubmedRefs = report.sources.pubmed.map((p, i) => {
    const link = p.pmid ? ` <a href="https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/">PMID: ${p.pmid}</a>` : "";
    const author = p.authors ? p.authors.split(",")[0] + " et al." : "Unknown";
    return `<li><strong>[P${i + 1}]</strong> ${escapeHtml(author)} (${escapeHtml(p.year || "n.d.")}). ${escapeHtml(p.title)}. <em>${escapeHtml(p.journal)}</em>.${link}</li>`;
  }).join("\n");

  const bookRef = report.sources.book
    ? `<li><strong>[B]</strong> ${escapeHtml(report.sources.book.title)} — pages ${report.sources.book.pages.join(", ")}</li>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Combined Summary — ${escapeHtml(report.condition)}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <h1>Combined Research Summary</h1>
  <div class="subtitle">Generated on ${dateStr} via MaryForward &mdash; ${sourceCounts || "No sources"}</div>
  <div class="condition-banner"><h3>Condition: ${escapeHtml(report.condition)}</h3></div>
  <p class="intro">This is a combined synthesis of clinical trials, peer-reviewed literature, and reference-text guidance for <strong>${escapeHtml(report.condition)}</strong>. The first half is written for clinicians using standard medical terminology; the second half is the same content rewritten in plain language for patients. Inline tags such as <sup>[T1]</sup>, <sup>[P3]</sup>, and <sup>[B]</sup> link to the source list at the end.</p>

  <div class="half-banner">Part 1 &mdash; Medical Summary (for clinicians)</div>

  <div class="section">
    <h2>Background</h2>
    ${paragraphsToHtml(report.medical.background)}
  </div>
  <div class="section">
    <h2>Diagnostic Workup</h2>
    ${paragraphsToHtml(report.medical.diagnosis_workup)}
  </div>
  <div class="section">
    <h2>Treatment Approach</h2>
    ${paragraphsToHtml(report.medical.treatment_approach)}
  </div>
  <div class="section">
    <h2>Ongoing Research</h2>
    ${paragraphsToHtml(report.medical.ongoing_research)}
  </div>

  <div class="page-break"></div>

  <div class="plain">
    <div class="half-banner plain">Part 2 &mdash; Plain-Language Summary (for patients)</div>

    <div class="section">
      <h2>What This Condition Is</h2>
      ${paragraphsToHtml(report.plain.what_this_is)}
    </div>
    <div class="section">
      <h2>How Doctors Find It</h2>
      ${paragraphsToHtml(report.plain.how_doctors_find_it)}
    </div>
    <div class="section">
      <h2>Treatment Options</h2>
      ${paragraphsToHtml(report.plain.treatment_options)}
    </div>
    <div class="section">
      <h2>Studies Underway</h2>
      ${paragraphsToHtml(report.plain.studies_underway)}
    </div>
  </div>

  <div class="references">
    <h2>References</h2>
    ${trialRefs ? `<h3>Clinical Trials</h3><ol>${trialRefs}</ol>` : ""}
    ${pubmedRefs ? `<h3>PubMed Articles</h3><ol>${pubmedRefs}</ol>` : ""}
    ${bookRef ? `<h3>Reference Text</h3><ol>${bookRef}</ol>` : ""}
  </div>

  <p class="disclaimer">This report was generated using publicly available data from ClinicalTrials.gov and PubMed, plus a clinical reference text, then synthesized by an AI language model. It is intended as a research aid and is not a substitute for clinical judgment or direct consultation with a healthcare provider. Always verify specific facts in the cited sources before making clinical decisions.</p>
</body>
</html>`;
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function CombinedSummaryButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SummaryReport | null>(null);

  const [condition, setCondition] = useState("");
  const [includeTrials, setIncludeTrials] = useState(true);
  const [includePubMed, setIncludePubMed] = useState(true);
  const [includeBook, setIncludeBook] = useState(true);

  const openPrintWindow = (html: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const handleGenerate = async () => {
    if (!includeTrials && !includePubMed && !includeBook) {
      setError("Select at least one source.");
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/research-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition,
          includeTrials,
          includePubMed,
          includeBook,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as SummaryReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdf = () => {
    if (report) openPrintWindow(buildReportHtml(report));
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        Combined Summary
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">Combined Summary &mdash; Medical + Plain Language</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">
                Generates a ~5-page report. The first half is in medical terminology for clinicians; the second half is rewritten in plain language for patients.
                Source material is gathered from up to three places, then synthesized by an AI model.
              </p>

              <div className="grid gap-4 sm:grid-cols-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Condition or Disease</label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Leave blank to use the case's primary diagnosis"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Include Sources</label>
                  <div className="space-y-2 rounded-lg border border-white/10 bg-slate-800 p-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTrials}
                        onChange={(e) => setIncludeTrials(e.target.checked)}
                        className="rounded border-white/20 bg-slate-700 text-pink-500 focus:ring-pink-500"
                      />
                      Clinical Trials (ClinicalTrials.gov)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePubMed}
                        onChange={(e) => setIncludePubMed(e.target.checked)}
                        className="rounded border-white/20 bg-slate-700 text-pink-500 focus:ring-pink-500"
                      />
                      PubMed Research Articles
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBook}
                        onChange={(e) => setIncludeBook(e.target.checked)}
                        className="rounded border-white/20 bg-slate-700 text-pink-500 focus:ring-pink-500"
                      />
                      5-Minute Clinical Consult (reference text)
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="btn btnPrimary flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      Generating summary (may take 30-90s)...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Summary
                    </>
                  )}
                </button>
                {loading && (
                  <p className="text-xs text-slate-500">
                    Fetching trials + PubMed + book excerpt, then synthesizing.
                  </p>
                )}
              </div>
            </div>

            {/* Result */}
            <div className="max-h-[55vh] overflow-y-auto px-6 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
              )}
              {report && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-4">
                    <h3 className="text-base font-semibold text-pink-300">
                      Summary ready for: {report.condition}
                    </h3>
                    <p className="mt-1 text-xs text-pink-200/70">
                      Sources used:{" "}
                      {[
                        report.sources.trials.length > 0 ? `${report.sources.trials.length} trials` : null,
                        report.sources.pubmed.length > 0 ? `${report.sources.pubmed.length} PubMed articles` : null,
                        report.sources.book ? "5-Minute Clinical Consult" : null,
                      ].filter(Boolean).join(", ") || "none"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Medical &mdash; Preview</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {report.medical.background.substring(0, 300)}
                      {report.medical.background.length > 300 ? "..." : ""}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Plain Language &mdash; Preview</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {report.plain.what_this_is.substring(0, 300)}
                      {report.plain.what_this_is.length > 300 ? "..." : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between border-t border-white/10 px-6 py-3">
              <div>
                {report && (
                  <button onClick={handleOpenPdf} className="btn btnSecondary flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Open as PDF
                  </button>
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
