"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-2 py-1 text-sm rounded transition ${
            locale === loc
              ? "bg-sky-500/20 text-sky-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          aria-current={locale === loc ? "true" : undefined}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
