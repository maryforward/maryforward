"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

export default function Footer() {
  const year = new Date().getFullYear();
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-white/10 bg-slate-950/60">
      <div className="containerX py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="font-semibold text-lg">MaryForward</div>
            <p className="muted mt-2 text-sm">
              {t("tagline")}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <span className="font-semibold text-white">{t("inHonorOfMary")}</span>{" "}
              {t("honourDescription")}
            </div>
            <p className="muted mt-4 text-xs">©{year} MaryForward. {t("allRightsReserved")}</p>
          </div>

          <div>
            <div className="font-semibold mb-2">{t("product")}</div>
            <div className="text-sm text-slate-300 space-y-1">
              <div><Link href="/what-we-do/patients">{t("forPatients")}</Link></div>
              <div><Link href="/what-we-do/clinicians">{t("forClinicians")}</Link></div>
              <div><Link href="/trials">{t("trialsNavigator")}</Link></div>
              <div><Link href="/learn/ngs">{t("ngsIntegration")}</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">{t("company")}</div>
            <div className="text-sm text-slate-300 space-y-1">
              <div><Link href="/company/our-story">{t("ourStory")}</Link></div>
              <div><Link href="/company/compliance">{t("privacyCompliance")}</Link></div>
              <div><Link href="/company/pricing">{t("pricing")}</Link></div>
              <div><Link href="/contact">{t("contact")}</Link></div>
            </div>

            <div className="mt-5 glass p-4">
              <div className="font-semibold">{t("subscribe")}</div>
              <p className="muted text-sm mt-1">{t("subscribeDescription")}</p>
              <div className="mt-3">
                <NewsletterForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
