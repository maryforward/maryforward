import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("webinars.title")}</h1>
            <p className="muted mt-3 text-base">{t("webinars.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="calendar" className="font-semibold">{t("webinars.upcoming.title")}</CardHeading>
              <IconList
                icon="arrow"
                items={[
                  t("webinars.upcoming.item1"),
                  t("webinars.upcoming.item2"),
                  t("webinars.upcoming.item3"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="video" className="font-semibold">{t("webinars.past.title")}</CardHeading>
              <IconList
                items={[
                  t("webinars.past.item1"),
                  t("webinars.past.item2"),
                  t("webinars.past.item3"),
                ]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
