"use client";

import { useState } from "react";
import { simplifyMedicalText, SIMPLE_REPORT_STYLES } from "@/lib/medical-simplify";

interface ClinicalTrial {
  nctId: string;
  title: string;
  officialTitle: string;
  status: string;
  phase: string;
  studyType: string;
  briefSummary: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  startDate: string;
  completionDate: string;
  enrollment: number;
  locations: string[];
  eligibility: {
    criteria: string;
    sex: string;
    minAge: string;
    maxAge: string;
  };
  url: string;
}

interface TrialSearchResult {
  totalCount: number;
  trials: ClinicalTrial[];
}

// ---------------------------------------------------------------------------
// Filter option definitions — mirrors ClinicalTrials.gov search page
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "RECRUITING", label: "Recruiting" },
  { value: "NOT_YET_RECRUITING", label: "Not yet recruiting" },
  { value: "ENROLLING_BY_INVITATION", label: "Enrolling by invitation" },
  { value: "ACTIVE_NOT_RECRUITING", label: "Active, not recruiting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "AVAILABLE", label: "Available" },
  { value: "NO_LONGER_AVAILABLE", label: "No longer available" },
  { value: "TEMPORARILY_NOT_AVAILABLE", label: "Temporarily not available" },
  { value: "APPROVED_FOR_MARKETING", label: "Approved for marketing" },
  { value: "WITHHELD", label: "Withheld" },
  { value: "UNKNOWN", label: "Unknown" },
];

const PHASE_OPTIONS = [
  { value: "EARLY_PHASE1", label: "Early Phase 1" },
  { value: "PHASE1", label: "Phase 1" },
  { value: "PHASE2", label: "Phase 2" },
  { value: "PHASE3", label: "Phase 3" },
  { value: "PHASE4", label: "Phase 4" },
  { value: "NA", label: "Not Applicable" },
];

const STUDY_TYPE_OPTIONS = [
  { value: "", label: "All Studies" },
  { value: "INTERVENTIONAL", label: "Interventional (Clinical Trial)" },
  { value: "OBSERVATIONAL", label: "Observational" },
  { value: "EXPANDED_ACCESS", label: "Expanded Access" },
];

const SEX_OPTIONS = [
  { value: "", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const AGE_GROUP_OPTIONS = [
  { value: "child", label: "Child (birth-17)" },
  { value: "adult", label: "Adult (18-64)" },
  { value: "older_adult", label: "Older Adult (65+)" },
];

const FUNDER_TYPE_OPTIONS = [
  { value: "nih", label: "NIH" },
  { value: "other_gov", label: "Other U.S. Federal Agency" },
  { value: "industry", label: "Industry" },
  { value: "other", label: "All Others" },
];

const STUDY_RESULTS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "with", label: "With Results" },
  { value: "without", label: "Without Results" },
];

// ---------------------------------------------------------------------------
// Status badge color helper
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  switch (status) {
    case "RECRUITING":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "NOT_YET_RECRUITING":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ACTIVE_NOT_RECRUITING":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "COMPLETED":
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    case "SUSPENDED":
    case "TERMINATED":
    case "WITHDRAWN":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Checkbox group helper
// ---------------------------------------------------------------------------

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-slate-800 p-2 space-y-1">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-slate-100 py-0.5">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="rounded border-white/20 bg-slate-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report HTML generation
// ---------------------------------------------------------------------------

const REPORT_STYLES = `
    @media print { @page { margin: 0.8in; } body { font-size: 12px; } }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1a1a1a; max-width: 850px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; }
    h1 { font-size: 22px; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; margin-bottom: 4px; color: #4c1d95; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
    h2 { font-size: 16px; color: #6d28d9; margin-top: 32px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    h3 { font-size: 14px; color: #4c1d95; margin-top: 18px; margin-bottom: 8px; }
    .section { margin-bottom: 28px; }
    .section p { font-size: 13px; color: #334155; margin: 0 0 12px 0; line-height: 1.8; }
    .trial-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .trial-card h3 { margin-top: 0; font-size: 14px; color: #4c1d95; }
    .trial-meta { font-size: 11px; color: #64748b; margin-bottom: 8px; }
    .trial-meta span { margin-right: 16px; }
    .trial-meta .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; }
    .status-recruiting { background: #d1fae5; color: #065f46; }
    .status-completed { background: #e2e8f0; color: #475569; }
    .status-active { background: #fef3c7; color: #92400e; }
    .status-other { background: #f1f5f9; color: #64748b; }
    .trial-summary { font-size: 12px; color: #475569; line-height: 1.7; margin-bottom: 10px; }
    .trial-details { font-size: 11px; color: #64748b; }
    .trial-details dt { font-weight: 600; color: #334155; display: inline; }
    .trial-details dd { display: inline; margin-left: 4px; margin-right: 16px; }
    .trial-link { color: #6d28d9; text-decoration: none; font-size: 11px; }
    .trial-link:hover { text-decoration: underline; }
    .disease-banner { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
    .disease-banner h3 { margin: 0; font-size: 15px; color: #4c1d95; }
    .intro { font-size: 13px; color: #475569; margin-bottom: 24px; line-height: 1.8; }
    .references { margin-top: 36px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .references h2 { font-size: 15px; color: #334155; border-bottom: none; margin-bottom: 12px; }
    .references ol { padding-left: 0; list-style: none; }
    .references li { font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.6; padding-bottom: 6px; border-bottom: 1px solid #f8fafc; }
    .references li:last-child { border-bottom: none; }
    .references li strong { color: #6d28d9; }
    .references a { color: #6d28d9; text-decoration: none; }
    .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
`;

function getStatusClass(status: string): string {
  if (status === "RECRUITING") return "status-recruiting";
  if (status === "COMPLETED") return "status-completed";
  if (status.includes("ACTIVE")) return "status-active";
  return "status-other";
}

function buildReferenceEntry(trial: ClinicalTrial, idx: number): string {
  const sponsor = trial.sponsor || "Unknown sponsor";
  const title = trial.title;
  const phase = trial.phase !== "N/A" ? ` ${trial.phase}.` : "";
  const status = formatStatus(trial.status);
  const nctLink = trial.nctId
    ? ` <a href="${trial.url}">${trial.nctId}</a>`
    : "";
  return `<li><strong>[${idx + 1}]</strong> ${sponsor}.${phase} ${title}. Status: ${status}.${nctLink}</li>`;
}

function generateTrialReportHtml(trials: ClinicalTrial[], condition: string, simple: boolean): string {
  const cleanCondition = condition || "Clinical Trials";

  const trialCards = trials.map((trial, idx) => {
    const refNum = idx + 1;
    const summary = simple
      ? simplifyMedicalText(trial.briefSummary)
      : trial.briefSummary;

    const interventionsList = trial.interventions.length > 0
      ? trial.interventions.map(i => simple ? simplifyMedicalText(i) : i).join("; ")
      : "Not specified";

    const locationsList = trial.locations.length > 0
      ? trial.locations.join("; ")
      : "Not specified";

    const eligibilityHtml = simple
      ? `<dl class="trial-details">
          ${trial.eligibility.sex ? `<dt>Sex:</dt><dd>${trial.eligibility.sex}</dd>` : ""}
          ${trial.eligibility.minAge ? `<dt>Minimum Age:</dt><dd>${trial.eligibility.minAge}</dd>` : ""}
          ${trial.eligibility.maxAge ? `<dt>Maximum Age:</dt><dd>${trial.eligibility.maxAge}</dd>` : ""}
        </dl>`
      : `<dl class="trial-details">
          ${trial.eligibility.sex ? `<dt>Sex:</dt><dd>${trial.eligibility.sex}</dd>` : ""}
          ${trial.eligibility.minAge ? `<dt>Min Age:</dt><dd>${trial.eligibility.minAge}</dd>` : ""}
          ${trial.eligibility.maxAge ? `<dt>Max Age:</dt><dd>${trial.eligibility.maxAge}</dd>` : ""}
          ${trial.enrollment ? `<dt>Enrollment:</dt><dd>${trial.enrollment.toLocaleString()} participants</dd>` : ""}
        </dl>
        ${trial.eligibility.criteria ? `<details style="margin-top:8px;font-size:11px;color:#64748b;"><summary style="cursor:pointer;font-weight:600;color:#334155;">Full Eligibility Criteria</summary><pre style="white-space:pre-wrap;margin-top:6px;font-size:11px;line-height:1.6;">${trial.eligibility.criteria.substring(0, 2000)}${trial.eligibility.criteria.length > 2000 ? "..." : ""}</pre></details>` : ""}`;

    return `
      <div class="trial-card" id="trial-${refNum}">
        <h3>${simple ? simplifyMedicalText(trial.title) : trial.title}<sup>[${refNum}]</sup></h3>
        <div class="trial-meta">
          <span class="status ${getStatusClass(trial.status)}">${formatStatus(trial.status)}</span>
          <span><strong>Phase:</strong> ${trial.phase}</span>
          <span><strong>Type:</strong> ${trial.studyType || "N/A"}</span>
        </div>
        <p class="trial-summary">${summary}<sup>[${refNum}]</sup></p>
        <dl class="trial-details">
          <dt>Conditions:</dt><dd>${trial.conditions.join(", ") || "N/A"}</dd>
        </dl>
        <dl class="trial-details">
          <dt>Interventions:</dt><dd>${interventionsList}</dd>
        </dl>
        <dl class="trial-details">
          <dt>Sponsor:</dt><dd>${trial.sponsor || "N/A"}</dd>
          ${trial.startDate ? `<dt>Start:</dt><dd>${trial.startDate}</dd>` : ""}
          ${trial.completionDate ? `<dt>Est. Completion:</dt><dd>${trial.completionDate}</dd>` : ""}
        </dl>
        <dl class="trial-details">
          <dt>Locations:</dt><dd>${locationsList}</dd>
        </dl>
        ${eligibilityHtml}
      </div>`;
  }).join("\n");

  // References section
  const refsHtml = trials
    .map((trial, idx) => buildReferenceEntry(trial, idx))
    .join("\n          ");

  const title = simple
    ? "Clinical Trials — A Plain-Language Summary"
    : "Clinical Trials Research Report";

  const introText = simple
    ? `This guide summarizes <strong>${trials.length} clinical trials</strong> related to <strong>${cleanCondition}</strong> found on ClinicalTrials.gov. Medical terms have been replaced with everyday language wherever possible. Clinical trials are research studies that test how well new medical approaches work in people. The small numbers <sup>[1]</sup> at the end of paragraphs show where the information came from — see the References section at the end.`
    : `This report compiles <strong>${trials.length} clinical trials</strong> from ClinicalTrials.gov related to <strong>${cleanCondition}</strong>. Each trial entry includes its status, phase, eligibility criteria, and key details. Citations reference the source trials listed in References.`;

  const keyTermsHtml = simple
    ? `<div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px 0;font-size:15px;color:#713f12;">Understanding Clinical Trial Terms</h3>
        <p style="font-size:13px;color:#78716c;margin:0;line-height:1.8;">
          <strong>Phase 1:</strong> First tests in a small group to check safety.<br>
          <strong>Phase 2:</strong> Tests in a larger group to see if it works and check side effects.<br>
          <strong>Phase 3:</strong> Large-scale tests comparing to standard treatment.<br>
          <strong>Phase 4:</strong> Studies done after approval to gather more information.<br>
          <strong>Recruiting:</strong> The trial is currently looking for participants.<br>
          <strong>Interventional:</strong> Participants receive a specific treatment being studied.<br>
          <strong>Observational:</strong> Researchers observe participants without giving a specific treatment.
        </p>
      </div>`
    : "";

  const styles = simple ? SIMPLE_REPORT_STYLES + `
    .trial-card { border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin-bottom: 18px; background: #f0fdf4; page-break-inside: avoid; }
    .trial-card h3 { margin-top: 0; font-size: 16px; color: #14532d; }
    .trial-meta { font-size: 12px; color: #64748b; margin-bottom: 10px; }
    .trial-meta span { margin-right: 16px; }
    .trial-meta .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; }
    .status-recruiting { background: #d1fae5; color: #065f46; }
    .status-completed { background: #e2e8f0; color: #475569; }
    .status-active { background: #fef3c7; color: #92400e; }
    .status-other { background: #f1f5f9; color: #64748b; }
    .trial-summary { font-size: 14px; color: #475569; line-height: 1.9; margin-bottom: 12px; }
    .trial-details { font-size: 12px; color: #64748b; margin: 4px 0; }
    .trial-details dt { font-weight: 600; color: #334155; display: inline; }
    .trial-details dd { display: inline; margin-left: 4px; margin-right: 16px; }
    .toc { margin-bottom: 24px; }
    .toc h2 { font-size: 16px; margin-bottom: 10px; }
    .toc ol { padding-left: 20px; }
    .toc li { font-size: 13px; color: #15803d; margin-bottom: 6px; }
    .toc a { color: #15803d; text-decoration: none; }
  ` : REPORT_STYLES;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${cleanCondition}</title>
  <style>${styles}</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} via MaryForward &mdash; ${trials.length} trials from ClinicalTrials.gov</div>
  <div class="disease-banner"><h3>Condition: ${cleanCondition}</h3></div>
  <p class="intro">${introText}</p>
  ${keyTermsHtml}
  <div class="section">
    <h2>Clinical Trials</h2>
    ${trialCards}
  </div>
  <div class="references">
    <h2>References</h2>
    <ol>
      ${refsHtml}
    </ol>
  </div>
  <p class="disclaimer">${simple
    ? "This guide was created from publicly available clinical trial data on ClinicalTrials.gov to help you understand ongoing research related to your condition. It is not a substitute for talking to your doctor. Always discuss any interest in clinical trials with your healthcare provider, who can help determine if a trial is right for you."
    : "This report is compiled from publicly available data on ClinicalTrials.gov and is intended for informational purposes only. It does not constitute medical advice. Clinical trial eligibility and availability should be verified directly with the trial sponsor or on ClinicalTrials.gov. Always consult with your healthcare provider before considering participation in a clinical trial."
  }</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClinicalTrialsButton({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrialSearchResult | null>(null);

  // Search fields
  const [condition, setCondition] = useState("");
  const [intervention, setIntervention] = useState("");
  const [location, setLocation] = useState("");
  const [otherTerms, setOtherTerms] = useState("");

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string[]>([]);
  const [studyType, setStudyType] = useState("");
  const [sex, setSex] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string[]>([]);
  const [selectedFunderType, setSelectedFunderType] = useState<string[]>([]);
  const [studyResults, setStudyResults] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Expanded trial details
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);

  const openPrintWindow = (html: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleExportPdf = () => {
    if (!result) return;
    openPrintWindow(generateTrialReportHtml(result.trials, condition || "Search Results", false));
  };

  const handleSimpleReport = () => {
    if (!result) return;
    openPrintWindow(generateTrialReportHtml(result.trials, condition || "Search Results", true));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/research-trials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition,
          intervention,
          location,
          otherTerms,
          status: selectedStatus,
          phase: selectedPhase,
          studyType,
          sex,
          ageGroup: selectedAgeGroup,
          funderType: selectedFunderType,
          studyResults,
        }),
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
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
        Clinical Trials
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-50">Clinical Trials Search</h2>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Fields */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="mb-3 text-sm text-slate-400">
                Search ClinicalTrials.gov. Leave &quot;Condition or Disease&quot; blank to use the case&apos;s primary diagnosis.
              </p>

              {/* Main search fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Condition or Disease</label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Breast Cancer"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Intervention / Treatment</label>
                  <input
                    type="text"
                    value={intervention}
                    onChange={(e) => setIntervention(e.target.value)}
                    placeholder="e.g. Pembrolizumab"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. United States, New York"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Other Terms</label>
                  <input
                    type="text"
                    value={otherTerms}
                    onChange={(e) => setOtherTerms(e.target.value)}
                    placeholder="e.g. NCT number, drug name, investigator"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Toggle advanced filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="mt-3 flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300"
              >
                <svg className={`h-4 w-4 transform transition-transform ${showFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showFilters ? "Hide Filters" : "Show Advanced Filters"}
              </button>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <CheckboxGroup
                    label="Recruitment Status"
                    options={STATUS_OPTIONS}
                    selected={selectedStatus}
                    onChange={setSelectedStatus}
                  />
                  <CheckboxGroup
                    label="Phase"
                    options={PHASE_OPTIONS}
                    selected={selectedPhase}
                    onChange={setSelectedPhase}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Study Type</label>
                    <select
                      value={studyType}
                      onChange={(e) => setStudyType(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {STUDY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Sex</label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {SEX_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <CheckboxGroup
                    label="Age Group"
                    options={AGE_GROUP_OPTIONS}
                    selected={selectedAgeGroup}
                    onChange={setSelectedAgeGroup}
                  />
                  <CheckboxGroup
                    label="Funder Type"
                    options={FUNDER_TYPE_OPTIONS}
                    selected={selectedFunderType}
                    onChange={setSelectedFunderType}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Study Results</label>
                    <select
                      value={studyResults}
                      onChange={(e) => setStudyResults(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {STUDY_RESULTS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <button onClick={handleSearch} disabled={loading} className="btn btnPrimary flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Searching ClinicalTrials.gov...
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
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                  No clinical trials found. Try adjusting your search terms or filters.
                </div>
              )}
              {result && result.totalCount > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Found {result.totalCount.toLocaleString()} clinical trials. Loaded {result.trials.length} results.
                  </p>

                  {result.trials.map((trial) => (
                    <div key={trial.nctId} className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(trial.status)}`}>
                              {formatStatus(trial.status)}
                            </span>
                            <span className="text-xs text-slate-500">{trial.nctId}</span>
                            <span className="text-xs text-slate-500">Phase: {trial.phase}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-100">{trial.title}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {trial.sponsor} {trial.startDate && `| Started: ${trial.startDate}`} {trial.enrollment > 0 && `| Enrollment: ${trial.enrollment.toLocaleString()}`}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedTrial(expandedTrial === trial.nctId ? null : trial.nctId)}
                          className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                        >
                          <svg className={`h-5 w-5 transform transition-transform ${expandedTrial === trial.nctId ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {expandedTrial === trial.nctId && (
                        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                          {trial.briefSummary && (
                            <div>
                              <p className="text-xs font-medium text-slate-300">Summary</p>
                              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{trial.briefSummary}</p>
                            </div>
                          )}
                          {trial.conditions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-300">Conditions</p>
                              <p className="mt-1 text-xs text-slate-400">{trial.conditions.join(", ")}</p>
                            </div>
                          )}
                          {trial.interventions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-300">Interventions</p>
                              <p className="mt-1 text-xs text-slate-400">{trial.interventions.join("; ")}</p>
                            </div>
                          )}
                          {trial.locations.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-300">Locations</p>
                              <p className="mt-1 text-xs text-slate-400">{trial.locations.join("; ")}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-slate-300">Eligibility</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {trial.eligibility.sex && `Sex: ${trial.eligibility.sex}`}
                              {trial.eligibility.minAge && ` | Min Age: ${trial.eligibility.minAge}`}
                              {trial.eligibility.maxAge && ` | Max Age: ${trial.eligibility.maxAge}`}
                            </p>
                          </div>
                          <a
                            href={trial.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs text-sky-400 hover:text-sky-300 underline"
                          >
                            View on ClinicalTrials.gov
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
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
