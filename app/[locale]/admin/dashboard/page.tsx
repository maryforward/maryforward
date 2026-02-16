import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

async function getAdminStats() {
  const [
    totalUsers,
    pendingApprovals,
    totalCases,
    activeCases,
    totalClinicians,
    totalPatients,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { role: "CLINICIAN", isApproved: false },
    }),
    prisma.case.count(),
    prisma.case.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] } },
    }),
    prisma.user.count({ where: { role: "CLINICIAN", isApproved: true } }),
    prisma.user.count({ where: { role: "PATIENT" } }),
  ]);

  return {
    totalUsers,
    pendingApprovals,
    totalCases,
    activeCases,
    totalClinicians,
    totalPatients,
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("admin.dashboard");
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {t("pendingAlert.count", { count: stats.pendingApprovals })}
              </p>
              <p className="text-xs text-amber-300/70">
                {t("pendingAlert.message")}
              </p>
            </div>
            <Link
              href="/admin/approvals"
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/30 transition-colors"
            >
              {t("pendingAlert.reviewNow")}
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-500/20 p-2">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.totalUsers}</p>
              <p className="text-sm text-slate-400">{t("stats.totalUsers")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/20 p-2">
              <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.totalPatients}</p>
              <p className="text-sm text-slate-400">{t("stats.patients")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.totalClinicians}</p>
              <p className="text-sm text-slate-400">{t("stats.verifiedClinicians")}</p>
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
              <p className="text-2xl font-semibold text-slate-50">{stats.pendingApprovals}</p>
              <p className="text-sm text-slate-400">{t("stats.pendingApprovals")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/20 p-2">
              <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.totalCases}</p>
              <p className="text-sm text-slate-400">{t("stats.totalCases")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/20 p-2">
              <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">{stats.activeCases}</p>
              <p className="text-sm text-slate-400">{t("stats.activeCases")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/approvals"
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
        >
          <h3 className="font-semibold text-slate-50">{t("quickActions.reviewApprovals.title")}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {t("quickActions.reviewApprovals.description")}
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
        >
          <h3 className="font-semibold text-slate-50">{t("quickActions.manageUsers.title")}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {t("quickActions.manageUsers.description")}
          </p>
        </Link>

        <Link
          href="/admin/cases"
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
        >
          <h3 className="font-semibold text-slate-50">{t("quickActions.viewCases.title")}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {t("quickActions.viewCases.description")}
          </p>
        </Link>
      </div>
    </div>
  );
}
