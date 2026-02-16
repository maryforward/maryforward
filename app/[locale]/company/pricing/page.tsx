import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("pricing.kicker")}</div>
            <h1 className="h1 mt-2">{t("pricing.title")}</h1>
            <p className="muted mt-3 text-base">{t("pricing.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="font-semibold">{t("pricing.comprehensive.title")}</h3>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.comprehensive.price")}</span> {t("pricing.comprehensive.perCase")}
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("pricing.comprehensive.intake")}</li>
                <li>{t("pricing.comprehensive.synthesis")}</li>
                <li>{t("pricing.comprehensive.expertReview")}</li>
                <li>{t("pricing.comprehensive.report")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("pricing.longitudinal.title")}</h3>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.longitudinal.price")}</span>{t("pricing.longitudinal.perMonth")}
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("pricing.longitudinal.outcomeTracking")}</li>
                <li>{t("pricing.longitudinal.sideEffects")}</li>
                <li>{t("pricing.longitudinal.trialReminders")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("pricing.expedite.title")}</h3>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.expedite.expeditePrice")}</span> {t("pricing.expedite.expediteLabel")} • <span className="text-white font-semibold">{t("pricing.expedite.conciergePrice")}</span> {t("pricing.expedite.conciergeLabel")}
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("pricing.expedite.fasterTurnaround")}</li>
                <li>{t("pricing.expedite.careCoordination")}</li>
                <li>{t("pricing.expedite.trialOutreach")}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("pricing.disclaimer")}
          </div>
        </div>
      </section>
    </>
  );
}
