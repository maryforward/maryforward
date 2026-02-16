import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("whatWeDo");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("patients.kicker")}</div>
            <h1 className="h1 mt-2">{t("patients.title")}</h1>
            <p className="muted mt-3 text-base">{t("patients.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("patients.journey.title")}</h3>
              <ol className="mt-3 list-decimal pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("patients.journey.step1")}</li>
                <li>{t("patients.journey.step2")}</li>
                <li>{t("patients.journey.step3")}</li>
                <li>{t("patients.journey.step4")}</li>
                <li>{t("patients.journey.step5")}</li>
              </ol>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("patients.whatWeDontDo.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("patients.whatWeDontDo.item1")}</li>
                <li>{t("patients.whatWeDontDo.item2")}</li>
                <li>{t("patients.whatWeDontDo.item3")}</li>
              </ul>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {t("patients.whatWeDontDo.urgentCareNote")}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
