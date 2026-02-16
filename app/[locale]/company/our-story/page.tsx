import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("ourStory.kicker")}</div>
            <h1 className="h1 mt-2">{t("ourStory.title")}</h1>
            <p className="muted mt-3 text-base">{t("ourStory.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("ourStory.mission.title")}</h3>
              <p className="muted mt-2 text-sm">
                {t("ourStory.mission.description")}
              </p>
              <div className="mt-4 rounded-2xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm text-slate-200">
                <span className="font-semibold text-white">{t("ourStory.mission.honorTitle")}</span>{" "}
                {t("ourStory.mission.honorDescription")}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("ourStory.principles.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("ourStory.principles.safety")}</li>
                <li>{t("ourStory.principles.transparency")}</li>
                <li>{t("ourStory.principles.respect")}</li>
                <li>{t("ourStory.principles.collaboration")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
