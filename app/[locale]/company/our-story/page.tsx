import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot, Icon } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("ourStory.kicker")}</div>
            <h1 className="h1 mt-2">{t("ourStory.title")}</h1>
            <p className="muted mt-3 text-base">{t("ourStory.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="compass" className="font-semibold">{t("ourStory.mission.title")}</CardHeading>
              <p className="muted mt-2 text-sm">
                {t("ourStory.mission.description")}
              </p>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm text-slate-200">
                <span className="mt-0.5 shrink-0 text-[#D96C5F]"><Icon name="heart" className="h-5 w-5" /></span>
                <span>
                  <span className="font-semibold text-white">{t("ourStory.mission.honorTitle")}</span>{" "}
                  {t("ourStory.mission.honorDescription")}
                </span>
              </div>
            </div>
            <div className="card">
              <CardHeading icon="shield" className="font-semibold">{t("ourStory.principles.title")}</CardHeading>
              <IconList
                items={[
                  t("ourStory.principles.safety"),
                  t("ourStory.principles.transparency"),
                  t("ourStory.principles.respect"),
                  t("ourStory.principles.collaboration"),
                ]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
