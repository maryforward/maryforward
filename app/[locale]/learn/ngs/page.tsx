import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot, Icon } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("ngs.title")}</h1>
            <p className="muted mt-3 text-base">{t("ngs.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="dna" className="font-semibold">{t("ngs.oncologyCgp.title")}</CardHeading>
              <IconList
                items={[
                  t("ngs.oncologyCgp.biomarkers"),
                  t("ngs.oncologyCgp.resistance"),
                  t("ngs.oncologyCgp.trialEligibility"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="microscope" className="font-semibold">{t("ngs.idMngs.title")}</CardHeading>
              <IconList
                items={[
                  t("ngs.idMngs.organismInterpretation"),
                  t("ngs.idMngs.contaminationCautions"),
                  t("ngs.idMngs.followUpTesting"),
                ]}
              />
            </div>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <span className="mt-0.5 shrink-0 text-[#D96C5F]"><Icon name="info" className="h-5 w-5" /></span>
            <span>
              <span className="font-semibold text-white">{t("ngs.important.label")}</span> {t("ngs.important.text")}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
