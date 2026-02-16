import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseCard } from "@/components/portal/CaseCard";
import type { CaseStatus, CaseType } from "@/types";
import { getTranslations } from "next-intl/server";

async function getClinicianDashboardData(clinicianId: string) {
  // Run ALL queries in parallel for better performance
  const [
    assignedCases,
    recentReports,
    allCasesForReview,
    totalAssigned,
    activeReviews,
    completedReviews,
  ] = await Promise.all([
    // Cases assigned to this clinician (limit 5 for display)
    prisma.case.findMany({
      where: { assignedClinicianId: clinicianId },
      orderBy: { assignedAt: "desc" },
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
        assignedAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    // Reports authored by this clinician
    prisma.caseReport.count({ where: { authorId: clinicianId } }),
    // Cases awaiting review (submitted but not yet assigned)
    prisma.case.count({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        assignedClinicianId: null,
      },
    }),
    // Use count queries instead of fetching all records
    prisma.case.count({ where: { assignedClinicianId: clinicianId } }),
    prisma.case.count({
      where: {
        assignedClinicianId: clinicianId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] },
      },
    }),
    prisma.case.count({
      where: { assignedClinicianId: clinicianId, status: "COMPLETED" },
    }),
  ]);

  const stats = {
    totalAssigned,
    activeReviews,
    completedReviews,
    reportsWritten: recentReports,
    pendingCases: allCasesForReview,
  };

  return { assignedCases, stats };
}

export default async function ClinicianDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("clinician.dashboard");
  const { assignedCases, stats } = await getClinicianDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("welcome", { name: session.user.name?.split(" ").slice(-1)[0] || t("defaultName") })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.totalAssigned}</p>
              <p className="text-sm text-slate-400">{t("stats.assignedCases")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.activeReviews}</p>
              <p className="text-sm text-slate-400">{t("stats.activeReviews")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-500/20 p-2">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.completedReviews}</p>
              <p className="text-sm text-slate-400">{t("stats.completed")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/20 p-2">
              <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.reportsWritten}</p>
              <p className="text-sm text-slate-400">{t("stats.reportsWritten")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Cases Alert */}
      {stats.pendingCases > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {t("pendingAlert.title", { count: stats.pendingCases })}
              </p>
              <p className="text-xs text-amber-300/70">
                {t("pendingAlert.description")}
              </p>
            </div>
            <Link
              href="/clinician/cases/all"
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/30 transition-colors"
            >
              {t("pendingAlert.viewCases")}
            </Link>
          </div>
        </div>
      )}

      {/* Assigned Cases */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">{t("assignedCases.title")}</h2>
          <Link
            href="/clinician/cases"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            {t("assignedCases.viewAll")}
          </Link>
        </div>

        {assignedCases.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-200">{t("assignedCases.empty.title")}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {t("assignedCases.empty.description")}
            </p>
            <Link
              href="/clinician/cases/all"
              className="btn btnPrimary mt-4 inline-flex"
            >
              {t("assignedCases.empty.browseAll")}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignedCases.map((caseItem) => (
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
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">
              {t("quickActions.title")}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {t("quickActions.description")}
            </p>
          </div>
          <Link
            href="/clinician/cases/all"
            className="btn bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 flex-shrink-0"
          >
            {t("quickActions.browseAll")}
          </Link>
        </div>
      </div>
    </div>
  );
}
