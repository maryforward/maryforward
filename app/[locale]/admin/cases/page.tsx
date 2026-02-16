import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseStatusBadge } from "@/components/portal/CaseStatusBadge";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import type { CaseStatus } from "@/types";

async function getAllCases() {
  // Limit to 100 most recent cases for performance
  return prisma.case.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      caseNumber: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: { name: true, email: true },
      },
      assignedClinician: {
        select: { name: true },
      },
    },
  });
}

export default async function AdminCasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const t = await getTranslations("admin.cases");
  const cases = await getAllCases();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">{t("empty.title")}</h3>
          <p className="mt-2 text-sm text-slate-400">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.caseNumber")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.title")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.patient")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.status")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.assignedTo")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">{t("table.updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clinician/cases/${caseItem.id}`}
                      className="text-sm text-sky-400 hover:text-sky-300"
                    >
                      {caseItem.caseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    {caseItem.title || t("untitled")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {caseItem.user?.name || caseItem.user?.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <CaseStatusBadge status={caseItem.status as CaseStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {caseItem.assignedClinician?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDateTime(caseItem.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
