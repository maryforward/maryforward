"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CaseStatusBadge } from "./CaseStatusBadge";
import type { CaseStatus, CaseType } from "@/types";
import { formatDate } from "@/lib/utils";

interface CaseCardProps {
  id: string;
  caseNumber: string;
  title: string | null;
  caseType: CaseType;
  status: CaseStatus;
  primaryDiagnosis: string | null;
  createdAt: Date;
  updatedAt: Date;
  patientName?: string;
  linkPrefix?: string;
}

export function CaseCard({
  id,
  caseNumber,
  title,
  caseType,
  status,
  primaryDiagnosis,
  createdAt,
  updatedAt,
  patientName,
  linkPrefix = "/portal/cases",
}: CaseCardProps) {
  const t = useTranslations("portal.caseCard");

  const caseTypeLabels: Record<CaseType, string> = {
    ONCOLOGY: t("oncology"),
    INFECTIOUS_DISEASE: t("infectiousDisease"),
    OTHER: t("other"),
  };

  return (
    <Link
      href={`${linkPrefix}/${id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{caseNumber}</span>
            <CaseStatusBadge status={status} />
          </div>
          <h3 className="mt-2 truncate text-lg font-medium text-slate-50">
            {title || t("untitledCase")}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {caseTypeLabels[caseType]}
            {primaryDiagnosis && ` - ${primaryDiagnosis}`}
          </p>
          {patientName && (
            <p className="mt-1 text-sm text-slate-500">
              {t("patient")}: {patientName}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span>{t("created")} {formatDate(createdAt)}</span>
        <span>{t("updated")} {formatDate(updatedAt)}</span>
      </div>
    </Link>
  );
}
