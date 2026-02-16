import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("whatWeDo");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("clinicians.kicker")}</div>
            <h1 className="h1 mt-2">{t("clinicians.title")}</h1>
            <p className="muted mt-3 text-base">{t("clinicians.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("clinicians.receive.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("clinicians.receive.item1")}</li>
                <li>{t("clinicians.receive.item2")}</li>
                <li>{t("clinicians.receive.item3")}</li>
                <li>{t("clinicians.receive.item4")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("clinicians.deployment.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("clinicians.deployment.item1")}</li>
                <li>{t("clinicians.deployment.item2")}</li>
                <li>{t("clinicians.deployment.item3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
