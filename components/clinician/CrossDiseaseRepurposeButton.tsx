"use client";

import { useState } from "react";

interface RepurposeSource {
  ref: number;
  kind: "trial" | "pubmed" | "book";
  origin: "A" | "B" | "cross";
  title: string;
  detail: string;
  url: string;
  pmid?: string;
  nctId?: string;
  pages?: number[];
}

interface RepurposeReport {
  diseaseA: string;
  diseaseB: string;
  conclusion: {
    verdict: string;
    confidence: string;
    key_points: string[];
    what_would_increase_confidence: string[];
  };
  reasoning: string[];
  medical: {
    disease_a_treatments: string;
    disease_b_landscape: string;
    repurposing_rationale: string;
    existing_evidence: string;
    recommendations_cautions: string;
  };
  plain: {
    overview: string;
    treatments_for_first: string;
    why_might_help_second: string;
    research_so_far: string;
    cautions: string;
  };
  candidates: { name: string; rationale: string; evidence: string }[];
  sources: RepurposeSource[];
}

const REPORT_STYLES = `
  @media print { @page { margin: 0.8in; } body { font-size: 12px; } }
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 820px; margin: 0 auto; padding: 40px 20px; line-height: 1.75; }
  h1 { font-size: 22px; border-bottom: 3px solid #0f766e; padding-bottom: 10px; margin-bottom: 4px; color: #115e59; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
  .pair-banner { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
  .pair-banner h3 { margin: 0; font-size: 15px; color: #115e59; }
  .pair-banner .arrow { color: #0d9488; font-weight: 700; }
  .intro { font-size: 13px; color: #475569; margin-bottom: 20px; line-height: 1.8; }
  .hyp-warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #92400e; line-height: 1.7; }
  .exec { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #0f766e; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; page-break-inside: avoid; }
  .exec h2 { margin: 0 0 8px 0; border: none; color: #115e59; font-size: 17px; }
  .exec .verdict { font-size: 13px; color: #1e293b; line-height: 1.8; margin: 0 0 12px 0; }
  .confidence { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 12px; }
  .confidence.low { background: #fee2e2; color: #991b1b; }
  .confidence.moderate { background: #fef3c7; color: #92400e; }
  .confidence.high { background: #d1fae5; color: #065f46; }
  .exec ul.keypoints { margin: 4px 0 0 0; padding-left: 18px; }
  .exec ul.keypoints li { font-size: 12px; color: #334155; margin-bottom: 5px; line-height: 1.6; }
  .exec .raisers { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
  .exec .raisers strong { font-size: 12px; color: #0f766e; }
  ol.reasoning { counter-reset: step; list-style: none; padding-left: 0; margin: 8px 0 0 0; }
  ol.reasoning li { position: relative; padding-left: 38px; margin-bottom: 12px; font-size: 13px; color: #334155; line-height: 1.7; min-height: 24px; }
  ol.reasoning li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: #0f766e; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  ol.reasoning li sup { color: #0f766e; }
  .half-banner { background: #ccfbf1; color: #115e59; padding: 10px 16px; border-radius: 6px; font-weight: 600; margin: 28px 0 12px 0; font-size: 14px; }
  .half-banner.plain { background: #ecfeff; color: #155e75; }
  h2 { font-size: 16px; color: #0f766e; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #ccfbf1; padding-bottom: 4px; }
  .plain h2 { color: #0e7490; border-bottom-color: #cffafe; }
  .section { margin-bottom: 22px; }
  .section p { font-size: 13px; color: #334155; margin: 0 0 12px 0; text-align: justify; line-height: 1.8; }
  sup { font-size: 9px; color: #0f766e; font-weight: 600; }
  .plain sup { color: #0e7490; }
  table.candidates { width: 100%; border-collapse: collapse; margin: 10px 0 4px 0; font-size: 12px; }
  table.candidates th { text-align: left; background: #f0fdfa; color: #115e59; padding: 8px 10px; border: 1px solid #ccfbf1; font-size: 11px; }
  table.candidates td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
  table.candidates .name { font-weight: 600; color: #115e59; white-space: nowrap; }
  .evidence-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; background: #f1f5f9; color: #475569; }
  .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #e2e8f0; page-break-inside: avoid; }
  .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
  .references h3 { font-size: 13px; color: #475569; margin-top: 14px; margin-bottom: 6px; }
  .references ol { padding-left: 0; list-style: none; margin: 0; }
  .references li { font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.5; }
  .references li strong { color: #0f766e; }
  .references .origin { color: #0d9488; font-style: italic; }
  .references a { color: #0f766e; text-decoration: none; }
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

/** Convert paragraph text into <p>…</p>, wrapping numeric citations [1] / [2, 3] as <sup>. */
function paragraphsToHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => {
      const escaped = escapeHtml(p);
      const withCitations = escaped.replace(/\[\d+(\s*,\s*\d+)*\]/g, (m) => `<sup>${m}</sup>`);
      return `<p>${withCitations}</p>`;
    })
    .join("\n");
}

function originText(origin: RepurposeSource["origin"], a: string, b: string): string {
  if (origin === "A") return `Disease A — ${a}`;
  if (origin === "B") return `Disease B — ${b}`;
  return "Cross-over (both diseases)";
}

function buildReferenceList(report: RepurposeReport): string {
  return report.sources
    .map((s) => {
      const kindLabel =
        s.kind === "trial" ? "Clinical Trial" : s.kind === "pubmed" ? "PubMed" : "Reference Text";
      const link = s.url
        ? ` <a href="${s.url}">${s.nctId || (s.pmid ? `PMID: ${s.pmid}` : "link")}</a>`
        : "";
      return `<li><strong>[${s.ref}]</strong> <span class="origin">${escapeHtml(
        originText(s.origin, report.diseaseA, report.diseaseB),
      )} · ${kindLabel}</span> — ${escapeHtml(s.title)}${
        s.detail ? `. ${escapeHtml(s.detail)}` : ""
      }.${link}</li>`;
    })
    .join("\n");
}

function buildCandidatesTable(report: RepurposeReport): string {
  if (!report.candidates || report.candidates.length === 0) {
    return `<p style="font-size:13px;color:#64748b;">No specific repurposing candidates were identified with sufficient mechanistic support from the available sources.</p>`;
  }
  const rows = report.candidates
    .map(
      (c) => `<tr>
        <td class="name">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.rationale)}</td>
        <td><span class="evidence-pill">${escapeHtml(c.evidence)}</span></td>
      </tr>`,
    )
    .join("\n");
  return `<table class="candidates">
    <thead><tr><th>Candidate</th><th>Mechanistic rationale</th><th>Evidence level</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildExecSummary(report: RepurposeReport): string {
  const conf = (report.conclusion.confidence || "Low").trim();
  const confClass = /high/i.test(conf) ? "high" : /mod/i.test(conf) ? "moderate" : "low";
  const keyPoints = (report.conclusion.key_points || [])
    .map((k) => `<li>${escapeHtml(k).replace(/\[\d+(\s*,\s*\d+)*\]/g, (m) => `<sup>${m}</sup>`)}</li>`)
    .join("\n");
  const verdict = report.conclusion.verdict
    ? paragraphsToHtml(report.conclusion.verdict).replace(/^<p>/, '<p class="verdict">')
    : '<p class="verdict">No conclusion was generated.</p>';
  const raisers = (report.conclusion.what_would_increase_confidence || [])
    .map((k) => `<li>${escapeHtml(k).replace(/\[\d+(\s*,\s*\d+)*\]/g, (m) => `<sup>${m}</sup>`)}</li>`)
    .join("\n");
  return `<div class="exec">
    <h2>Executive Summary &amp; Conclusion</h2>
    <span class="confidence ${confClass}">Confidence in hypothesis: ${escapeHtml(conf)}</span>
    ${verdict}
    ${keyPoints ? `<strong style="font-size:12px;color:#475569;">Key points</strong><ul class="keypoints">${keyPoints}</ul>` : ""}
    ${
      raisers
        ? `<div class="raisers"><strong>What would increase confidence</strong><ul class="keypoints">${raisers}</ul></div>`
        : ""
    }
  </div>`;
}

function buildReasoningChain(report: RepurposeReport): string {
  if (!report.reasoning || report.reasoning.length === 0) return "";
  const steps = report.reasoning
    .map((s) => `<li>${escapeHtml(s).replace(/\[\d+(\s*,\s*\d+)*\]/g, (m) => `<sup>${m}</sup>`)}</li>`)
    .join("\n");
  return `<div class="section">
    <h2>Chain of Reasoning</h2>
    <p style="font-size:12px;color:#64748b;margin:0 0 8px 0;">How this analysis moved from the treatments for ${escapeHtml(
      report.diseaseA,
    )} to its conclusion about ${escapeHtml(report.diseaseB)}:</p>
    <ol class="reasoning">${steps}</ol>
  </div>`;
}

function buildReportHtml(report: RepurposeReport): string {
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const counts = {
    trials: report.sources.filter((s) => s.kind === "trial").length,
    pubmed: report.sources.filter((s) => s.kind === "pubmed").length,
    book: report.sources.filter((s) => s.kind === "book").length,
  };
  const sourceCounts = [
    counts.trials ? `${counts.trials} trials` : null,
    counts.pubmed ? `${counts.pubmed} PubMed articles` : null,
    counts.book ? `${counts.book} reference-text excerpt${counts.book > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Treatment Repurposing — ${escapeHtml(report.diseaseA)} → ${escapeHtml(report.diseaseB)}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <h1>Treatment Repurposing Analysis</h1>
  <div class="subtitle">Generated on ${dateStr} via MaryForward &mdash; ${sourceCounts || "No sources"}</div>
  <div class="pair-banner"><h3>${escapeHtml(report.diseaseA)} <span class="arrow">&rarr;</span> ${escapeHtml(report.diseaseB)}</h3></div>
  <p class="intro">This report evaluates whether treatments used for <strong>${escapeHtml(report.diseaseA)}</strong> (the source) might plausibly benefit <strong>${escapeHtml(report.diseaseB)}</strong> (the target), based on clinical trials, peer-reviewed literature, a cross-over literature search, and reference-text guidance. Inline numbers such as <sup>[1]</sup> link to the numbered source list at the end.</p>
  <div class="hyp-warning"><strong>Hypothesis-generating only.</strong> This analysis is automated decision support, not a treatment recommendation. Any repurposing idea described here is theoretical unless explicitly supported by cited evidence, and must be validated through formal clinical evaluation before influencing patient care.</div>

  ${buildExecSummary(report)}

  <div class="half-banner">Part 1 &mdash; Clinical Analysis (for clinicians)</div>
  <div class="section"><h2>Treatments for ${escapeHtml(report.diseaseA)}</h2>${paragraphsToHtml(report.medical.disease_a_treatments)}</div>
  <div class="section"><h2>${escapeHtml(report.diseaseB)} — Disease Landscape</h2>${paragraphsToHtml(report.medical.disease_b_landscape)}</div>
  <div class="section"><h2>Repurposing Rationale</h2>${paragraphsToHtml(report.medical.repurposing_rationale)}</div>
  <div class="section"><h2>Existing Evidence</h2>${paragraphsToHtml(report.medical.existing_evidence)}</div>
  ${buildReasoningChain(report)}
  <div class="section">
    <h2>Candidate Treatments</h2>
    ${buildCandidatesTable(report)}
  </div>
  <div class="section"><h2>Recommendations &amp; Cautions</h2>${paragraphsToHtml(report.medical.recommendations_cautions)}</div>

  <div class="page-break"></div>

  <div class="plain">
    <div class="half-banner plain">Part 2 &mdash; Plain-Language Summary (for patients)</div>
    <div class="section"><h2>Overview</h2>${paragraphsToHtml(report.plain.overview)}</div>
    <div class="section"><h2>Treatments for ${escapeHtml(report.diseaseA)}</h2>${paragraphsToHtml(report.plain.treatments_for_first)}</div>
    <div class="section"><h2>Why They Might Help ${escapeHtml(report.diseaseB)}</h2>${paragraphsToHtml(report.plain.why_might_help_second)}</div>
    <div class="section"><h2>Research So Far</h2>${paragraphsToHtml(report.plain.research_so_far)}</div>
    <div class="section"><h2>Important Cautions</h2>${paragraphsToHtml(report.plain.cautions)}</div>
  </div>

  <div class="references">
    <h2>Sources</h2>
    <ol>${buildReferenceList(report)}</ol>
  </div>

  <p class="disclaimer">This report was generated using publicly available data from ClinicalTrials.gov and PubMed, plus a clinical reference text, then synthesized by an AI language model to explore a drug-repurposing hypothesis. It is intended as a research aid and is not a substitute for clinical judgment, a systematic review, or direct consultation with a specialist. Repurposing a therapy outside its approved indication carries risks; always verify cited sources and pursue formal evaluation before any clinical application.</p>
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

export function CrossDiseaseRepurposeButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<RepurposeReport | null>(null);

  const [diseaseA, setDiseaseA] = useState("");
  const [diseaseB, setDiseaseB] = useState("");
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
    if (!diseaseA.trim()) {
      setError("Enter Disease A — the disease whose treatments you want to evaluate.");
      return;
    }
    if (!includeTrials && !includePubMed && !includeBook) {
      setError("Select at least one source.");
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/research-repurpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diseaseA, diseaseB, includeTrials, includePubMed, includeBook }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setReport((await res.json()) as RepurposeReport);
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
      <button onClick={() => setIsOpen(true)} className="btn btnSecondary flex items-center gap-2">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
        Repurposing
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">Cross-Disease Treatment Repurposing</h2>
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
                Explores whether treatments used for one disease could plausibly benefit another. We research both diseases
                across ClinicalTrials.gov, PubMed, and the 5-Minute Clinical Consult — plus a cross-over literature search —
                then synthesize a repurposing analysis. This is hypothesis-generating decision support, not a recommendation.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Disease A <span className="text-teal-400">— treatments come from</span>
                  </label>
                  <input
                    type="text"
                    value={diseaseA}
                    onChange={(e) => setDiseaseA(e.target.value)}
                    placeholder="e.g. Multiple Sclerosis"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Disease B <span className="text-cyan-400">— evaluate benefit for</span>
                  </label>
                  <input
                    type="text"
                    value={diseaseB}
                    onChange={(e) => setDiseaseB(e.target.value)}
                    placeholder="Leave blank to use the case's primary diagnosis"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">Research Sources</label>
                <div className="space-y-2 rounded-lg border border-white/10 bg-slate-800 p-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTrials}
                      onChange={(e) => setIncludeTrials(e.target.checked)}
                      className="rounded border-white/20 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    Clinical Trials (ClinicalTrials.gov)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePubMed}
                      onChange={(e) => setIncludePubMed(e.target.checked)}
                      className="rounded border-white/20 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    PubMed Research Articles (incl. cross-over search)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBook}
                      onChange={(e) => setIncludeBook(e.target.checked)}
                      className="rounded border-white/20 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    5-Minute Clinical Consult (reference text)
                  </label>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button onClick={handleGenerate} disabled={loading} className="btn btnPrimary flex items-center gap-2">
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      Researching both diseases (may take 1-3 minutes)...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Analyze Repurposing
                    </>
                  )}
                </button>
                {loading && (
                  <p className="text-xs text-slate-500">Fetching trials, PubMed, cross-over literature, and book excerpts, then synthesizing.</p>
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
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
                    <h3 className="text-base font-semibold text-teal-300">
                      {report.diseaseA} &rarr; {report.diseaseB}
                    </h3>
                    <p className="mt-1 text-xs text-teal-200/70">
                      {report.sources.length} sources analyzed ·{" "}
                      {report.sources.filter((s) => s.kind === "trial").length} trials,{" "}
                      {report.sources.filter((s) => s.kind === "pubmed").length} PubMed,{" "}
                      {report.sources.filter((s) => s.kind === "book").length} book excerpt(s)
                    </p>
                  </div>

                  {/* Conclusion — the bottom line first */}
                  <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-200">Conclusion</h4>
                      {(() => {
                        const conf = (report.conclusion.confidence || "Low").trim();
                        const cls = /high/i.test(conf)
                          ? "bg-emerald-500/20 text-emerald-300"
                          : /mod/i.test(conf)
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300";
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
                            Confidence: {conf}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {report.conclusion.verdict || "No conclusion was generated."}
                    </p>
                    {report.conclusion.key_points.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {report.conclusion.key_points.map((k, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <span className="mt-0.5 text-teal-400">•</span>
                            <span>{k}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {report.conclusion.what_would_increase_confidence.length > 0 && (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-xs font-medium text-teal-300">What would increase confidence</p>
                        <ul className="mt-1.5 space-y-1.5">
                          {report.conclusion.what_would_increase_confidence.map((k, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                              <span className="mt-0.5 text-teal-400">↑</span>
                              <span>{k}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Chain of reasoning */}
                  {report.reasoning.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                      <h4 className="text-sm font-semibold text-slate-200 mb-3">Chain of Reasoning</h4>
                      <ol className="space-y-2">
                        {report.reasoning.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-[10px] font-bold text-teal-300">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {report.candidates.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                      <h4 className="text-sm font-semibold text-slate-200 mb-2">Candidate Treatments</h4>
                      <div className="space-y-2">
                        {report.candidates.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="rounded-full bg-teal-500/20 px-2 py-0.5 font-medium text-teal-300 whitespace-nowrap">
                              {c.evidence}
                            </span>
                            <span className="text-slate-300">
                              <span className="font-semibold text-slate-100">{c.name}</span> — {c.rationale}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 leading-relaxed">
                    Hypothesis-generating only — not a treatment recommendation. Open the full report for the complete
                    analysis, candidate evidence levels, cautions, and sources.
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
                    Open Full Report (PDF)
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
