import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("whatWeDo");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("clinicians.kicker")}</div>
            <h1 className="h1 mt-2">{t("clinicians.title")}</h1>
            <p className="muted mt-3 text-base">{t("clinicians.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="report" className="font-semibold">{t("clinicians.receive.title")}</CardHeading>
              <IconList
                items={[
                  t("clinicians.receive.item1"),
                  t("clinicians.receive.item2"),
                  t("clinicians.receive.item3"),
                  t("clinicians.receive.item4"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="gear" className="font-semibold">{t("clinicians.deployment.title")}</CardHeading>
              <IconList
                items={[
                  t("clinicians.deployment.item1"),
                  t("clinicians.deployment.item2"),
                  t("clinicians.deployment.item3"),
                ]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
