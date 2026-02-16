"use client";

import { useTranslations } from "next-intl";
import type { CaseStatus } from "@/types";

interface CaseStatusBadgeProps {
  status: CaseStatus;
}

const statusStyles: Record<CaseStatus, string> = {
  DRAFT: "bg-slate-500/20 text-slate-300",
  SUBMITTED: "bg-sky-500/20 text-sky-300",
  UNDER_REVIEW: "bg-violet-500/20 text-violet-300",
  EXPERT_REVIEW: "bg-amber-500/20 text-amber-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  ARCHIVED: "bg-slate-600/20 text-slate-400",
};

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const t = useTranslations("portal.caseStatus");

  const statusLabels: Record<CaseStatus, string> = {
    DRAFT: t("draft"),
    SUBMITTED: t("submitted"),
    UNDER_REVIEW: t("underReview"),
    EXPERT_REVIEW: t("expertReview"),
    COMPLETED: t("completed"),
    ARCHIVED: t("archived"),
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
