import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("webinars.title")}</h1>
            <p className="muted mt-3 text-base">{t("webinars.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("webinars.upcoming.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("webinars.upcoming.item1")}</li>
                <li>{t("webinars.upcoming.item2")}</li>
                <li>{t("webinars.upcoming.item3")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("webinars.past.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("webinars.past.item1")}</li>
                <li>{t("webinars.past.item2")}</li>
                <li>{t("webinars.past.item3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
