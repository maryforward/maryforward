import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseCard } from "@/components/portal/CaseCard";
import type { CaseStatus, CaseType } from "@/types";
import { getTranslations } from "next-intl/server";

const caseSelect = {
  id: true,
  caseNumber: true,
  title: true,
  caseType: true,
  status: true,
  primaryDiagnosis: true,
  createdAt: true,
  updatedAt: true,
  assignedClinicianId: true,
  user: {
    select: {
      name: true,
    },
  },
  assignedClinician: {
    select: {
      name: true,
    },
  },
} as const;

async function getCasesByCategory(clinicianId: string) {
  // Run queries in parallel, filtering at database level with limits
  const [unassignedCases, myAssignedCases, otherAssignedCases] = await Promise.all([
    // Unassigned cases (limit 50)
    prisma.case.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] },
        assignedClinicianId: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: caseSelect,
    }),
    // Cases assigned to me (limit 50)
    prisma.case.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW", "COMPLETED"] },
        assignedClinicianId: clinicianId,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: caseSelect,
    }),
    // Cases assigned to others (limit 30)
    prisma.case.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW", "COMPLETED"] },
        assignedClinicianId: { not: null, notIn: [clinicianId] },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: caseSelect,
    }),
  ]);

  return { unassignedCases, myAssignedCases, otherAssignedCases };
}

export default async function AllCasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("clinician.allCases");
  const { unassignedCases, myAssignedCases, otherAssignedCases } = await getCasesByCategory(session.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      {unassignedCases.length === 0 && myAssignedCases.length === 0 && otherAssignedCases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">{t("empty.title")}</h3>
          <p className="mt-2 text-sm text-slate-400">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <>
          {unassignedCases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-50">
                  {t("awaitingAssignment")}
                </h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  {unassignedCases.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unassignedCases.map((caseItem) => (
                  <CaseCard
                    key={caseItem.id}
                    id={caseItem.id}
                    caseNumber={caseItem.caseNumber}
                    title={caseItem.title}
                    caseType={caseItem.caseType as CaseType}
                    status={caseItem.status as CaseStatus}
                    primaryDiagnosis={caseItem.primaryDiagnosis}
                    createdAt={caseItem.createdAt}
                    updatedAt={caseItem.updatedAt}
                    patientName={caseItem.user?.name || undefined}
                    linkPrefix="/clinician/cases"
                  />
                ))}
              </div>
            </div>
          )}

          {myAssignedCases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-50">
                  {t("assignedToYou")}
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {myAssignedCases.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myAssignedCases.map((caseItem) => (
                  <CaseCard
                    key={caseItem.id}
                    id={caseItem.id}
                    caseNumber={caseItem.caseNumber}
                    title={caseItem.title}
                    caseType={caseItem.caseType as CaseType}
                    status={caseItem.status as CaseStatus}
                    primaryDiagnosis={caseItem.primaryDiagnosis}
                    createdAt={caseItem.createdAt}
                    updatedAt={caseItem.updatedAt}
                    patientName={caseItem.user?.name || undefined}
                    linkPrefix="/clinician/cases"
                  />
                ))}
              </div>
            </div>
          )}

          {otherAssignedCases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-50">
                  {t("assignedToOthers")}
                </h2>
                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-400">
                  {otherAssignedCases.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherAssignedCases.map((caseItem) => (
                  <div key={caseItem.id} className="relative">
                    <CaseCard
                      id={caseItem.id}
                      caseNumber={caseItem.caseNumber}
                      title={caseItem.title}
                      caseType={caseItem.caseType as CaseType}
                      status={caseItem.status as CaseStatus}
                      primaryDiagnosis={caseItem.primaryDiagnosis}
                      createdAt={caseItem.createdAt}
                      updatedAt={caseItem.updatedAt}
                      patientName={caseItem.user?.name || undefined}
                      linkPrefix="/clinician/cases"
                    />
                    <div className="absolute top-3 right-3 rounded bg-slate-700/80 px-2 py-0.5 text-xs text-slate-300">
                      {caseItem.assignedClinician?.name || t("anotherClinician")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
