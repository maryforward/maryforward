import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Page() {
  const t = await getTranslations("home");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr] items-stretch">
            <div className="glass p-7">
              <div className="kicker">{t("kicker")}</div>
              <h1 className="h1 mt-2">{t("headline")}</h1>
              <p className="muted mt-3 text-base">
                {t("subheadline")}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link className="btn btnPrimary" href="/signup">{t("startCase")}</Link>
                <Link className="btn" href="/what-we-do/patients">{t("howItWorks")}</Link>
                <Link className="btn" href="/what-we-do/clinicians">{t("forClinicians")}</Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="pill">{t("pillCitations")}</span>
                <span className="pill">{t("pillGuideline")}</span>
                <span className="pill">{t("pillTrials")}</span>
                <span className="pill">{t("pillNGS")}</span>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm text-slate-200">
                <span className="font-semibold text-white">{t("inHonorOfMary")}</span>{" "}
                {t("maryDescription")}
              </div>
            </div>

            <div className="glass p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("safetyWorkflows")}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                {t("flagsUrgent")}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("expertReview")}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("shareableReport")}
              </div>

              <div className="my-6 h-px bg-white/10" />

              <h3 className="text-lg font-semibold">{t("whatYouGet")}</h3>
              <ul className="mt-3 list-disc ps-5 text-sm text-slate-300 space-y-2">
                <li>{t("benefit1")}</li>
                <li>{t("benefit2")}</li>
                <li>{t("benefit3")}</li>
                <li>{t("benefit4")}</li>
              </ul>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span className="font-semibold text-white">{t("important")}</span> {t("disclaimer")}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forPatientsTitle")}</h3>
              <p className="muted mt-2 text-sm">{t("forPatientsDesc")}</p>
              <Link className="btn mt-4 inline-flex" href="/what-we-do/patients">{t("tellMeMore")}</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forCliniciansTitle")}</h3>
              <p className="muted mt-2 text-sm">{t("forCliniciansDesc")}</p>
              <Link className="btn mt-4 inline-flex" href="/what-we-do/clinicians">{t("learnMore")}</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forSponsorsTitle")}</h3>
              <p className="muted mt-2 text-sm">{t("forSponsorsDesc")}</p>
              <Link className="btn mt-4 inline-flex" href="/what-we-do/partners">{t("collaborate")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="containerX">
          <h2 className="h2">{t("howItWorksTitle")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("step1Title")}</h3>
              <p className="muted mt-2 text-sm">{t("step1Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step2Title")}</h3>
              <p className="muted mt-2 text-sm">{t("step2Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step3Title")}</h3>
              <p className="muted mt-2 text-sm">{t("step3Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step4Title")}</h3>
              <p className="muted mt-2 text-sm">{t("step4Desc")}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("ngsTitle")}</h3>
              <p className="muted mt-2 text-sm">{t("ngsDesc")}</p>
              <Link className="btn mt-4 inline-flex" href="/learn/ngs">{t("exploreNGS")}</Link>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("trialsTitle")}</h3>
              <p className="muted mt-2 text-sm">{t("trialsDesc")}</p>
              <Link className="btn mt-4 inline-flex" href="/trials">{t("findTrials")}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
