import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

async function getClinicianReports(clinicianId: string) {
  return prisma.caseReport.findMany({
    where: { authorId: clinicianId },
    orderBy: { createdAt: "desc" },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          status: true,
          user: {
            select: { name: true },
          },
        },
      },
    },
  });
}

export default async function ClinicianReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("clinician.reports");
  const reports = await getClinicianReports(session.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      {reports.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">{t("empty.title")}</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            {t("empty.description")}
          </p>
          <Link
            href="/clinician/cases"
            className="btn btnPrimary mt-6 inline-flex"
          >
            {t("empty.viewAssignedCases")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/clinician/cases/${report.case.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {report.case.caseNumber}
                    </span>
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
                      {report.reportType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-lg font-medium text-slate-50">
                    {report.case.title || t("untitledCase")}
                  </h3>
                  {report.case.user?.name && (
                    <p className="mt-1 text-sm text-slate-500">
                      {t("patient")}: {report.case.user.name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    {formatDate(report.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
