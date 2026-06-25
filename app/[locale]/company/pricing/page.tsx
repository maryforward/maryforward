import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("pricing.kicker")}</div>
            <h1 className="h1 mt-2">{t("pricing.title")}</h1>
            <p className="muted mt-3 text-base">{t("pricing.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <CardHeading icon="report" className="font-semibold">{t("pricing.comprehensive.title")}</CardHeading>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.comprehensive.price")}</span> {t("pricing.comprehensive.perCase")}
              </p>
              <IconList
                items={[
                  t("pricing.comprehensive.intake"),
                  t("pricing.comprehensive.synthesis"),
                  t("pricing.comprehensive.expertReview"),
                  t("pricing.comprehensive.report"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="calendar" className="font-semibold">{t("pricing.longitudinal.title")}</CardHeading>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.longitudinal.price")}</span> {t("pricing.longitudinal.perMonth")}
              </p>
              <IconList
                items={[
                  t("pricing.longitudinal.outcomeTracking"),
                  t("pricing.longitudinal.sideEffects"),
                  t("pricing.longitudinal.trialReminders"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="bolt" className="font-semibold">{t("pricing.expedite.title")}</CardHeading>
              <p className="muted mt-2 text-sm">
                <span className="text-white font-semibold">{t("pricing.expedite.expeditePrice")}</span> {t("pricing.expedite.expediteLabel")} • <span className="text-white font-semibold">{t("pricing.expedite.conciergePrice")}</span> {t("pricing.expedite.conciergeLabel")}
              </p>
              <IconList
                items={[
                  t("pricing.expedite.fasterTurnaround"),
                  t("pricing.expedite.careCoordination"),
                  t("pricing.expedite.trialOutreach"),
                ]}
              />
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
