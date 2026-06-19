import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot, Icon } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("whatWeDo");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("patients.kicker")}</div>
            <h1 className="h1 mt-2">{t("patients.title")}</h1>
            <p className="muted mt-3 text-base">{t("patients.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="compass" className="font-semibold">{t("patients.journey.title")}</CardHeading>
              <IconList
                icon="arrow"
                items={[
                  t("patients.journey.step1"),
                  t("patients.journey.step2"),
                  t("patients.journey.step3"),
                  t("patients.journey.step4"),
                  t("patients.journey.step5"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="shield" className="font-semibold">{t("patients.whatWeDontDo.title")}</CardHeading>
              <IconList
                icon="info"
                items={[
                  t("patients.whatWeDontDo.item1"),
                  t("patients.whatWeDontDo.item2"),
                  t("patients.whatWeDontDo.item3"),
                ]}
              />
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0 text-[#D96C5F]"><Icon name="alert" className="h-5 w-5" /></span>
                <span>{t("patients.whatWeDontDo.urgentCareNote")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
