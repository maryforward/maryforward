import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardStats } from "@/components/portal/DashboardStats";
import { CaseCard } from "@/components/portal/CaseCard";
import type { CaseStatus, CaseType } from "@/types";

async function getDashboardData(userId: string) {
  // Run all queries in parallel for better performance
  const [cases, savedTrialsCount, totalCases, activeCases, completedCases] = await Promise.all([
    prisma.case.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        caseNumber: true,
        title: true,
        caseType: true,
        status: true,
        primaryDiagnosis: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.savedTrial.count({ where: { userId } }),
    // Use count queries instead of fetching all records
    prisma.case.count({ where: { userId } }),
    prisma.case.count({
      where: {
        userId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] },
      },
    }),
    prisma.case.count({
      where: { userId, status: "COMPLETED" },
    }),
  ]);

  const stats = {
    totalCases,
    activeCases,
    completedCases,
    savedTrials: savedTrialsCount,
  };

  return { cases, stats };
}

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("portal.dashboard");

  if (!session?.user?.id) {
    return null;
  }

  const { cases, stats } = await getDashboardData(session.user.id);
  const firstName = session.user.name?.split(" ")[0] || "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("welcome", { name: firstName })}
        </p>
      </div>

      <DashboardStats stats={stats} />

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">{t("recentCases")}</h2>
          <Link
            href="/portal/cases"
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            {t("viewAll")}
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/20 p-8 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-200">{t("noCasesTitle")}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {t("noCasesDescription")}
            </p>
            <Link
              href="/portal/cases/new"
              className="btn btnPrimary mt-4 inline-flex"
            >
              {t("createFirstCase")}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((caseItem) => (
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
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-sky-500/10 to-violet-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">
              {t("readyToStart")}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {t("intakeDescription")}
            </p>
          </div>
          <Link
            href="/portal/cases/new"
            className="btn btnPrimary flex-shrink-0"
          >
            {t("startNewCase")}
          </Link>
        </div>
      </div>
    </div>
  );
}
