import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("trials");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">MaryForward</div>
            <h1 className="h1 mt-2">{t("title")}</h1>
            <p className="muted mt-3 text-base">{t("subtitle")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="font-semibold">{t("eligibilityExtraction")}</h3>
              <p className="muted mt-2 text-sm">{t("eligibilityExtractionDesc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("geoFiltering")}</h3>
              <p className="muted mt-2 text-sm">{t("geoFilteringDesc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("conciergeTemplates")}</h3>
              <p className="muted mt-2 text-sm">{t("conciergeTemplatesDesc")}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("marketingPreview")}
          </div>
        </div>
      </section>
    </>
  );
}
