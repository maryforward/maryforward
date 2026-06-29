"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    setOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-2xl px-2 py-1 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Select language"
      >
        {localeNames[locale]} <span className="opacity-60 rotate-arrow">▾</span>
      </button>
      {open ? (
        <div className="absolute end-0 top-10 z-50 w-40 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-2">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`block w-full text-start rounded-xl px-3 py-2 text-sm transition ${
                locale === loc
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-current={locale === loc ? "true" : undefined}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
