import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PrintReportButton } from "@/components/portal/PrintReportButton";

interface ReportContent {
  summary?: string;
  clinicalFindings?: string;
  treatmentOptions?: string;
  clinicalTrials?: string;
  recommendations?: string;
  additionalNotes?: string;
}

const reportTypeLabels: Record<string, string> = {
  EXPERT_REVIEW: "Expert Review",
  AI_SYNTHESIS: "AI Synthesis",
  PATIENT_SUMMARY: "Patient Summary",
  FINAL_REPORT: "Final Report",
};

async function getReport(reportId: string, caseId: string, userId: string) {
  // First verify the case belongs to the user
  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId },
  });

  if (!caseData) {
    return null;
  }

  // Then get the report
  return prisma.caseReport.findFirst({
    where: { id: reportId, caseId },
    include: {
      author: { select: { name: true, email: true } },
      case: { select: { caseNumber: true, title: true } },
    },
  });
}

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { id: caseId, reportId } = await params;
  const report = await getReport(reportId, caseId, session.user.id);

  if (!report) {
    notFound();
  }

  const content = report.content as ReportContent;

  // Log the report view for audit
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VIEW_REPORT",
      resource: "case_report",
      resourceId: report.id,
      metadata: {
        caseId,
        reportType: report.reportType,
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/portal/cases" className="text-slate-400 hover:text-slate-200">
          Cases
        </Link>
        <span className="text-slate-600">/</span>
        <Link
          href={`/portal/cases/${caseId}`}
          className="text-slate-400 hover:text-slate-200"
        >
          {report.case.caseNumber}
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">Report</span>
      </div>

      {/* Header */}
      <div className="glass p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400 mb-3">
              {reportTypeLabels[report.reportType] || report.reportType}
            </div>
            <h1 className="h1">Medical Report</h1>
            <p className="muted mt-2">
              For case: {report.case.title || report.case.caseNumber}
            </p>
          </div>
          <Link
            href={`/portal/cases/${caseId}`}
            className="btn-secondary text-sm"
          >
            &larr; Back to Case
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Prepared By</dt>
            <dd className="mt-1 text-slate-200">
              {report.author?.name || report.author?.email || "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Date</dt>
            <dd className="mt-1 text-slate-200">
              {formatDateTime(report.createdAt)}
            </dd>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {content.summary && (
          <div className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-sky-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Executive Summary</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.summary}
            </p>
          </div>
        )}

        {content.clinicalFindings && (
          <div className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Clinical Findings</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.clinicalFindings}
            </p>
          </div>
        )}

        {content.treatmentOptions && (
          <div className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Treatment Options</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.treatmentOptions}
            </p>
          </div>
        )}

        {content.clinicalTrials && (
          <div className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-teal-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Relevant Clinical Trials</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.clinicalTrials}
            </p>
          </div>
        )}

        {content.recommendations && (
          <div className="glass p-6 border-2 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Recommendations</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.recommendations}
            </p>
          </div>
        )}

        {content.additionalNotes && (
          <div className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Additional Notes</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content.additionalNotes}
            </p>
          </div>
        )}

        {report.reviewerNotes && (
          <div className="glass p-6 border border-sky-500/30 bg-sky-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-sky-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Reviewer Notes</h2>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {report.reviewerNotes}
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="glass p-4 border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-sm text-amber-200/90">
            <p className="font-medium">Important Disclaimer</p>
            <p className="mt-1 text-amber-200/70">
              This report is provided for informational purposes only and should not replace
              consultation with your primary healthcare provider. Please discuss all findings
              and recommendations with your doctor before making any changes to your treatment plan.
            </p>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="flex justify-center">
        <PrintReportButton />
      </div>
    </div>
  );
}
