import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("whatWeDo");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("partners.kicker")}</div>
            <h1 className="h1 mt-2">{t("partners.title")}</h1>
            <p className="muted mt-3 text-base">{t("partners.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("partners.grants.title")}</h3>
              <p className="muted mt-2 text-sm">{t("partners.grants.description")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("partners.marketplace.title")}</h3>
              <p className="muted mt-2 text-sm">{t("partners.marketplace.description")}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("partners.disclaimer")}
          </div>
        </div>
      </section>
    </>
  );
}
