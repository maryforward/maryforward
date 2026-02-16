import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseCard } from "@/components/portal/CaseCard";
import type { CaseStatus, CaseType } from "@/types";
import { getTranslations } from "next-intl/server";

async function getAssignedCases(clinicianId: string) {
  return prisma.case.findMany({
    where: { assignedClinicianId: clinicianId },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      caseType: true,
      status: true,
      primaryDiagnosis: true,
      createdAt: true,
      updatedAt: true,
      assignedAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });
}

export default async function ClinicianCasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("clinician.cases");
  const cases = await getAssignedCases(session.user.id);

  // Group cases by status
  const activeCases = cases.filter((c) =>
    ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"].includes(c.status)
  );
  const completedCases = cases.filter((c) => c.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">{t("title")}</h1>
          <p className="muted mt-2">
            {t("description")}
          </p>
        </div>
        <Link
          href="/clinician/cases/all"
          className="btn btnSecondary"
        >
          {t("browseAll")}
        </Link>
      </div>

      {cases.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">{t("empty.title")}</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            {t("empty.description")}
          </p>
          <Link
            href="/clinician/cases/all"
            className="btn btnPrimary mt-6 inline-flex"
          >
            {t("browseAll")}
          </Link>
        </div>
      ) : (
        <>
          {activeCases.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                {t("activeCases", { count: activeCases.length })}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeCases.map((caseItem) => (
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

          {completedCases.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-50 mb-4">
                {t("completedCases", { count: completedCases.length })}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedCases.map((caseItem) => (
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
        </>
      )}
    </div>
  );
}
