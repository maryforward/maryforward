import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("resources");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">MaryForward</div>
            <h1 className="h1 mt-2">{t("title")}</h1>
            <p className="muted mt-3 text-base">{t("description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("primarySourcesTitle")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("source1")}</li>
                <li>{t("source2")}</li>
                <li>{t("source3")}</li>
                <li>{t("source4")}</li>
                <li>{t("source5")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("howWeCiteTitle")}</h3>
              <p className="muted mt-2 text-sm">
                {t("howWeCiteDescription")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
