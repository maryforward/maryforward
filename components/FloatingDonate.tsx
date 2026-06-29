"use client";

import { useTranslations } from "next-intl";
import { DONATE_URL } from "@/components/Nav";

// Always-visible donation ribbon pinned to the right edge of the viewport,
// rendered once in the root layout so it appears on every page.
export function FloatingDonate() {
  const t = useTranslations();

  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("nav.donate")}
      className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-2xl bg-gradient-to-b from-sky-500 to-violet-500 px-2 py-4 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/20 transition hover:brightness-110 [writing-mode:vertical-rl] rotate-180"
    >
      {t("nav.donate")}
    </a>
  );
}
