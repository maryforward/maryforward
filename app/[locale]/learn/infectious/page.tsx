import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("infectious.title")}</h1>
            <p className="muted mt-3 text-base">{t("infectious.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="font-semibold">{t("infectious.diagnosticDifferentials.title")}</h3>
              <p className="muted mt-2 text-sm">{t("infectious.diagnosticDifferentials.description")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("infectious.carePathways.title")}</h3>
              <p className="muted mt-2 text-sm">{t("infectious.carePathways.description")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("infectious.safetySafeguards.title")}</h3>
              <p className="muted mt-2 text-sm">{t("infectious.safetySafeguards.description")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
