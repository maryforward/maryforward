import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("ngs.title")}</h1>
            <p className="muted mt-3 text-base">{t("ngs.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("ngs.oncologyCgp.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("ngs.oncologyCgp.biomarkers")}</li>
                <li>{t("ngs.oncologyCgp.resistance")}</li>
                <li>{t("ngs.oncologyCgp.trialEligibility")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("ngs.idMngs.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("ngs.idMngs.organismInterpretation")}</li>
                <li>{t("ngs.idMngs.contaminationCautions")}</li>
                <li>{t("ngs.idMngs.followUpTesting")}</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <span className="font-semibold text-white">{t("ngs.important.label")}</span> {t("ngs.important.text")}
          </div>
        </div>
      </section>
    </>
  );
}
