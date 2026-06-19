import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("resources");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />MaryForward</div>
            <h1 className="h1 mt-2">{t("title")}</h1>
            <p className="muted mt-3 text-base">{t("description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="book" className="font-semibold">{t("primarySourcesTitle")}</CardHeading>
              <IconList
                items={[
                  t("source1"),
                  t("source2"),
                  t("source3"),
                  t("source4"),
                  t("source5"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="quote" className="font-semibold">{t("howWeCiteTitle")}</CardHeading>
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
