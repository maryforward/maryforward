import { getTranslations } from "next-intl/server";
import { CardHeading, IconList, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("compliance.kicker")}</div>
            <h1 className="h1 mt-2">{t("compliance.title")}</h1>
            <p className="muted mt-3 text-base">{t("compliance.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="shield" className="font-semibold">{t("compliance.clinicalSafety.title")}</CardHeading>
              <IconList
                items={[
                  t("compliance.clinicalSafety.redFlag"),
                  t("compliance.clinicalSafety.secondReview"),
                  t("compliance.clinicalSafety.monitoring"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="lock" className="font-semibold">{t("compliance.hipaa.title")}</CardHeading>
              <IconList
                items={[
                  t("compliance.hipaa.roleBasedAccess"),
                  t("compliance.hipaa.encryption"),
                  t("compliance.hipaa.auditLogging"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="scale" className="font-semibold">{t("compliance.commercial.title")}</CardHeading>
              <IconList
                items={[
                  t("compliance.commercial.noReferral"),
                  t("compliance.commercial.firewalls"),
                  t("compliance.commercial.disclosures"),
                ]}
              />
            </div>
            <div className="card">
              <CardHeading icon="info" className="font-semibold">{t("compliance.limitations.title")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("compliance.limitations.description")}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("compliance.disclaimer")}
          </div>
        </div>
      </section>
    </>
  );
}
