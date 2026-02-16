import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("company");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker">{t("compliance.kicker")}</div>
            <h1 className="h1 mt-2">{t("compliance.title")}</h1>
            <p className="muted mt-3 text-base">{t("compliance.description")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("compliance.clinicalSafety.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("compliance.clinicalSafety.redFlag")}</li>
                <li>{t("compliance.clinicalSafety.secondReview")}</li>
                <li>{t("compliance.clinicalSafety.monitoring")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("compliance.hipaa.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("compliance.hipaa.roleBasedAccess")}</li>
                <li>{t("compliance.hipaa.encryption")}</li>
                <li>{t("compliance.hipaa.auditLogging")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("compliance.commercial.title")}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-300 space-y-2">
                <li>{t("compliance.commercial.noReferral")}</li>
                <li>{t("compliance.commercial.firewalls")}</li>
                <li>{t("compliance.commercial.disclosures")}</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("compliance.limitations.title")}</h3>
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
