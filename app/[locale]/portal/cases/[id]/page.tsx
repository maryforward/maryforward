import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseStatusBadge } from "@/components/portal/CaseStatusBadge";
import { SubmitCaseButton } from "@/components/portal/SubmitCaseButton";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { CaseStatus, CaseType } from "@/types";

const caseTypeLabels: Record<CaseType, string> = {
  ONCOLOGY: "Oncology",
  INFECTIOUS_DISEASE: "Infectious Disease",
  OTHER: "Other",
};

async function getCase(id: string, userId: string) {
  return prisma.case.findFirst({
    where: { id, userId },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } },
    },
  });
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { id } = await params;
  const caseData = await getCase(id, session.user.id);

  if (!caseData) {
    notFound();
  }

  const isDraft = caseData.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/portal/cases"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Cases
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-400">{caseData.caseNumber}</span>
          </div>
          <h1 className="h1 mt-2">{caseData.title || "Untitled Case"}</h1>
          <div className="mt-2 flex items-center gap-3">
            <CaseStatusBadge status={caseData.status as CaseStatus} />
            <span className="text-sm text-slate-400">
              {caseTypeLabels[caseData.caseType as CaseType]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Link
              href={`/portal/cases/${id}/edit`}
              className="btn"
            >
              Edit
            </Link>
          )}
          {!isDraft && (
            <Link
              href={`/portal/cases/${id}/messages`}
              className="btn btnSecondary flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-slate-50">Case Details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">Primary Diagnosis</dt>
                <dd className="mt-1 text-slate-200">
                  {caseData.primaryDiagnosis || "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Case Type</dt>
                <dd className="mt-1 text-slate-200">
                  {caseTypeLabels[caseData.caseType as CaseType]}
                </dd>
              </div>
            </dl>
          </div>

          {caseData.symptoms && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Symptoms</h2>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap">
                {caseData.symptoms}
              </p>
            </div>
          )}

          {caseData.medicalHistory && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Medical History</h2>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap">
                {caseData.medicalHistory}
              </p>
            </div>
          )}

          {caseData.currentMedications && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Current Medications</h2>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap">
                {caseData.currentMedications}
              </p>
            </div>
          )}

          {caseData.allergies && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Allergies</h2>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap">
                {caseData.allergies}
              </p>
            </div>
          )}

          {/* Submit for Review Button - only show for draft cases */}
          {isDraft && <SubmitCaseButton caseId={id} />}

          {caseData.reports.length > 0 && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Reports</h2>
              <p className="text-sm text-slate-400 mt-1">
                Click on a report to view the full details.
              </p>
              <div className="mt-4 space-y-3">
                {caseData.reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/portal/cases/${id}/reports/${report.id}`}
                    className="block rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-200">
                          {report.reportType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-slate-50">Timeline</h2>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-sky-400" />
                <div>
                  <p className="text-sm text-slate-200">Created</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(caseData.createdAt)}
                  </p>
                </div>
              </div>
              {caseData.submittedAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-violet-400" />
                  <div>
                    <p className="text-sm text-slate-200">Submitted</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(caseData.submittedAt)}
                    </p>
                  </div>
                </div>
              )}
              {caseData.completedAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-sm text-slate-200">Completed</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(caseData.completedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-slate-50">Documents</h2>
            {caseData.documents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No documents uploaded</p>
            ) : (
              <div className="mt-4 space-y-2">
                {caseData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 p-3"
                  >
                    <span className="text-sm text-slate-200 truncate">
                      {doc.fileName}
                    </span>
                    <span className="text-xs text-slate-400">{doc.fileType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
