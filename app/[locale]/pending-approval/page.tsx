"use client";

import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export default function PendingApprovalPage() {
  const { data: session } = useSession();
  const t = useTranslations("auth.pendingApproval");

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-full bg-amber-500/20 p-6 w-24 h-24 mx-auto flex items-center justify-center">
          <svg
            className="h-12 w-12 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-50">
          {t("title")}
        </h1>

        <p className="mt-4 text-slate-400">
          {t("greeting", { name: session?.user?.name || t("defaultName") })}
        </p>

        <p className="mt-2 text-slate-400">
          {t("description")}
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-3">
            {t("whatHappensNext")}
          </h2>
          <ul className="text-left text-sm text-slate-400 space-y-2">
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{t("step1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{t("step2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{t("step3")}</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/" className="text-sky-400 hover:text-sky-300 text-sm">
            {t("returnToHomepage")}
          </Link>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mx-auto"
          >
            {t("signOut")}
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          {t("questions")}{" "}
          <a
            href="mailto:support@maryforward.com"
            className="text-sky-400 hover:text-sky-300"
          >
            support@maryforward.com
          </a>
        </p>
      </div>
    </div>
  );
}
