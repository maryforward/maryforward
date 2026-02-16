import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseCard } from "@/components/portal/CaseCard";
import type { CaseStatus, CaseType } from "@/types";

async function getCases(userId: string) {
  return prisma.case.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
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
  });
}

export default async function CasesPage() {
  const session = await auth();
  const t = await getTranslations("portal.cases");

  if (!session?.user?.id) {
    return null;
  }

  const cases = await getCases(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">{t("title")}</h1>
          <p className="muted mt-2">
            {t("description")}
          </p>
        </div>
        <Link href="/portal/cases/new" className="btn btnPrimary">
          {t("newCase")}
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-slate-500"
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
          <h3 className="mt-4 text-xl font-medium text-slate-200">{t("noCasesTitle")}</h3>
          <p className="mt-2 text-slate-400">
            {t("noCasesDescription")}
          </p>
          <Link href="/portal/cases/new" className="btn btnPrimary mt-6 inline-flex">
            {t("createFirstCase")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
