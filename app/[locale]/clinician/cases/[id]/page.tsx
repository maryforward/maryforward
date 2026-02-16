import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseStatusBadge } from "@/components/portal/CaseStatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AssignCaseButton } from "@/components/clinician/AssignCaseButton";
import type { CaseStatus, CaseType } from "@/types";

const caseTypeLabels: Record<CaseType, string> = {
  ONCOLOGY: "Oncology",
  INFECTIOUS_DISEASE: "Infectious Disease",
  OTHER: "Other",
};

async function getCase(id: string) {
  return prisma.case.findFirst({
    where: {
      id,
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW", "COMPLETED"] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
      reports: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { name: true },
          },
        },
      },
      assignedClinician: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export default async function ClinicianCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { id } = await params;
  const caseData = await getCase(id);

  if (!caseData) {
    notFound();
  }

  const isAssignedToMe = caseData.assignedClinicianId === session.user.id;
  const canWriteReport = isAssignedToMe && caseData.status !== "COMPLETED";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/clinician/cases"
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
          {!isAssignedToMe && !caseData.assignedClinicianId && (
            <AssignCaseButton caseId={id} />
          )}
          {isAssignedToMe && (
            <Link
              href={`/clinician/cases/${id}/messages`}
              className="btn btnSecondary flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </Link>
          )}
          {canWriteReport && (
            <Link
              href={`/clinician/cases/${id}/report/new`}
              className="btn btnPrimary"
            >
              Write Report
            </Link>
          )}
        </div>
      </div>

      {/* Assignment Status */}
      <div className={`rounded-xl border p-4 ${
        isAssignedToMe
          ? "border-emerald-500/30 bg-emerald-500/10"
          : caseData.assignedClinician
          ? "border-slate-500/30 bg-slate-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}>
        <div className="flex items-center gap-3">
          <svg
            className={`h-5 w-5 ${
              isAssignedToMe
                ? "text-emerald-400"
                : caseData.assignedClinician
                ? "text-slate-400"
                : "text-amber-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <div>
            <p className={`text-sm font-medium ${
              isAssignedToMe
                ? "text-emerald-200"
                : caseData.assignedClinician
                ? "text-slate-200"
                : "text-amber-200"
            }`}>
              {isAssignedToMe
                ? "Assigned to you"
                : caseData.assignedClinician
                ? `Assigned to ${caseData.assignedClinician.name}`
                : "Unassigned"}
            </p>
            {caseData.assignedAt && (
              <p className="text-xs text-slate-400">
                Since {formatDateTime(caseData.assignedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-slate-50">Patient Information</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">Patient Name</dt>
                <dd className="mt-1 text-slate-200">
                  {caseData.user?.name || "Anonymous"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Contact Email</dt>
                <dd className="mt-1 text-slate-200">
                  {caseData.user?.email || "Not provided"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Case Details */}
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

          {caseData.reports.length > 0 && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-slate-50">Reports</h2>
              <div className="mt-4 space-y-3">
                {caseData.reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">
                        {report.reportType.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-slate-400">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    {report.author && (
                      <p className="mt-1 text-xs text-slate-500">
                        By {report.author.name}
                      </p>
                    )}
                  </div>
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
              {caseData.assignedAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-teal-400" />
                  <div>
                    <p className="text-sm text-slate-200">Assigned</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(caseData.assignedAt)}
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
