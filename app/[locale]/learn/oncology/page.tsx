import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("oncology.title")}</h1>
            <p className="muted mt-3 text-base">{t("oncology.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="font-semibold">{t("oncology.commonPathways.title")}</h3>
              <p className="muted mt-2 text-sm">{t("oncology.commonPathways.description")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("oncology.genomicsBiomarkers.title")}</h3>
              <p className="muted mt-2 text-sm">{t("oncology.genomicsBiomarkers.description")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("oncology.questionsForVisit.title")}</h3>
              <p className="muted mt-2 text-sm">{t("oncology.questionsForVisit.description")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
