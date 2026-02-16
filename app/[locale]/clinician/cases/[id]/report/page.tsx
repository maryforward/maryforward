"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/providers/ToastProvider";

const reportTypes = [
  {
    value: "EXPERT_REVIEW",
    label: "Expert Review",
    description: "Comprehensive clinical review with treatment recommendations",
  },
  {
    value: "AI_SYNTHESIS",
    label: "AI Synthesis",
    description: "AI-generated summary of case information and research",
  },
  {
    value: "PATIENT_SUMMARY",
    label: "Patient Summary",
    description: "Simplified summary for the patient to understand",
  },
  {
    value: "FINAL_REPORT",
    label: "Final Report",
    description: "Complete final report with all findings and recommendations",
  },
];

interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  primaryDiagnosis: string;
  caseType: string;
  status: string;
  user: {
    name: string;
    email: string;
  };
}

export default function WriteReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [caseId, setCaseId] = useState<string>("");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [reportType, setReportType] = useState("EXPERT_REVIEW");
  const [summary, setSummary] = useState("");
  const [clinicalFindings, setClinicalFindings] = useState("");
  const [treatmentOptions, setTreatmentOptions] = useState("");
  const [clinicalTrials, setClinicalTrials] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [markAsCompleted, setMarkAsCompleted] = useState(false);

  useEffect(() => {
    async function loadCase() {
      const { id } = await params;
      setCaseId(id);

      try {
        const response = await fetch(`/api/cases/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCaseData(data.case);
        } else {
          setError("Failed to load case");
        }
      } catch {
        setError("Failed to load case");
      } finally {
        setIsLoading(false);
      }
    }
    loadCase();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!summary.trim()) {
      setError("Summary is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          content: {
            summary,
            clinicalFindings,
            treatmentOptions,
            clinicalTrials,
            recommendations,
            additionalNotes,
          },
          markAsCompleted,
        }),
      });

      if (response.ok) {
        addToast("Report created successfully!", "success");
        router.push(`/clinician/cases/${caseId}`);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create report");
      }
    } catch {
      setError("Failed to create report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Case not found or access denied.</p>
        <Link href="/clinician/cases" className="text-sky-400 hover:text-sky-300 mt-4 inline-block">
          Back to cases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href={`/clinician/cases/${caseId}`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          &larr; Back to case
        </Link>
        <h1 className="h1 mt-2">Write Report</h1>
        <p className="muted mt-2">
          Create a report for case {caseData.caseNumber}
        </p>
      </div>

      {/* Case Summary */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50 mb-4">Case Summary</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Patient</dt>
            <dd className="text-slate-200">{caseData.user.name || caseData.user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Case Type</dt>
            <dd className="text-slate-200">{caseData.caseType.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Title</dt>
            <dd className="text-slate-200">{caseData.title || "Untitled"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Primary Diagnosis</dt>
            <dd className="text-slate-200">{caseData.primaryDiagnosis || "Not specified"}</dd>
          </div>
        </dl>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Type Selection */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Report Type</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setReportType(type.value)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  reportType === type.value
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="font-medium text-slate-50">{type.label}</p>
                <p className="mt-1 text-sm text-slate-400">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="glass p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-50">Report Content</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Executive Summary <span className="text-red-400">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide a concise summary of the case and your key findings..."
              rows={4}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Clinical Findings
            </label>
            <textarea
              value={clinicalFindings}
              onChange={(e) => setClinicalFindings(e.target.value)}
              placeholder="Describe the relevant clinical findings from the case review..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Treatment Options
            </label>
            <textarea
              value={treatmentOptions}
              onChange={(e) => setTreatmentOptions(e.target.value)}
              placeholder="List and describe potential treatment options with pros/cons..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Relevant Clinical Trials
            </label>
            <textarea
              value={clinicalTrials}
              onChange={(e) => setClinicalTrials(e.target.value)}
              placeholder="List any relevant clinical trials the patient may be eligible for..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Recommendations
            </label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Provide your clinical recommendations and next steps..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">
              Additional Notes
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional information or notes for the patient..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
            />
          </div>
        </div>

        {/* Case Completion */}
        <div className="glass p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={markAsCompleted}
              onChange={(e) => setMarkAsCompleted(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
            />
            <div>
              <span className="font-medium text-slate-200">Mark case as completed</span>
              <p className="text-sm text-slate-400 mt-1">
                Check this box if this is the final report and the case review is complete.
                The patient will be notified that their report is ready.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-1"
          >
            Submit Report
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/clinician/cases/${caseId}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
