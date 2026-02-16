"use client";

import { useTranslations } from "next-intl";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "sky" | "violet" | "emerald" | "amber";
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colors = {
    sky: "from-sky-500/20 to-sky-500/5 text-sky-400",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400",
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-50">{value}</p>
        </div>
        <div className="rounded-lg bg-white/10 p-3">{icon}</div>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  stats: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    savedTrials: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const t = useTranslations("portal.dashboard");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t("totalCases")}
        value={stats.totalCases}
        color="sky"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <StatCard
        label={t("activeCases")}
        value={stats.activeCases}
        color="violet"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        label={t("completedCases")}
        value={stats.completedCases}
        color="emerald"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        label={t("savedTrials")}
        value={stats.savedTrials}
        color="amber"
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        }
      />
    </div>
  );
}
