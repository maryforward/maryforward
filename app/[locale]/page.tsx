import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon, KickerDot, type IconName } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("home");

  const pills: { icon: IconName; label: string }[] = [
    { icon: "quote", label: t("pillCitations") },
    { icon: "compass", label: t("pillGuideline") },
    { icon: "trials", label: t("pillTrials") },
    { icon: "dna", label: t("pillNGS") },
  ];

  const assurances: { icon: IconName; label: string }[] = [
    { icon: "shield", label: t("safetyWorkflows") },
    { icon: "alert", label: t("flagsUrgent") },
    { icon: "review", label: t("expertReview") },
    { icon: "share", label: t("shareableReport") },
  ];

  return (
    <>
      <section className="relative overflow-hidden py-20 md:py-28">
        {/* Soft circular gradients + an abstract pathway forward */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-28 -start-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(15,118,110,0.10),transparent_70%)] blur-2xl" />
          <div className="absolute top-12 end-0 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(217,108,95,0.10),transparent_70%)] blur-2xl" />
          <svg
            className="absolute inset-x-0 bottom-0 h-64 w-full text-teal-700/10"
            viewBox="0 0 1440 320"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-40 240C300 120 520 280 760 200S1180 60 1500 140"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="containerX">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] items-stretch">
            <div className="glass p-8 md:p-10">
              <div className="kicker">
                <KickerDot />
                {t("kicker")}
              </div>
              <h1 className="h1 mt-5">{t("headline")}</h1>
              <p className="muted mt-5 text-lg leading-relaxed">{t("subheadline")}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btnPrimary" href="/signup">{t("startCase")}</Link>
                <Link className="btn" href="/what-we-do/patients">{t("howItWorks")}</Link>
                <Link className="btn" href="/what-we-do/clinicians">{t("forClinicians")}</Link>
              </div>

              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {pills.map((p) => (
                  <span key={p.label} className="pill gap-2 px-3 py-2 text-xs">
                    <span className="text-[#0F766E]"><Icon name={p.icon} className="h-4 w-4" /></span>
                    {p.label}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm text-slate-200">
                <span className="mt-0.5 text-[#D96C5F]"><Icon name="heart" className="h-5 w-5" /></span>
                <p>
                  <span className="font-semibold text-white">{t("inHonorOfMary")}</span>{" "}
                  {t("maryDescription")}
                </p>
              </div>
            </div>

            <div className="glass p-8 md:p-10">
              <div className="space-y-3">
                {assurances.map((a) => (
                  <div
                    key={a.label}
                    className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
                  >
                    <span className="text-[#0F766E]"><Icon name={a.icon} className="h-4 w-4" /></span>
                    {a.label}
                  </div>
                ))}
              </div>

              <div className="my-8 h-px bg-white/10" />

              <h3 className="text-lg font-semibold">{t("whatYouGet")}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {[t("benefit1"), t("benefit2"), t("benefit3"), t("benefit4")].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#0F766E]"><Icon name="review" className="h-4 w-4" /></span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <span className="font-semibold text-white">{t("important")}</span> {t("disclaimer")}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forPatientsTitle")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("forPatientsDesc")}</p>
              <Link className="btn mt-5 inline-flex" href="/what-we-do/patients">{t("tellMeMore")}</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forCliniciansTitle")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("forCliniciansDesc")}</p>
              <Link className="btn mt-5 inline-flex" href="/what-we-do/clinicians">{t("learnMore")}</Link>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold">{t("forSponsorsTitle")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("forSponsorsDesc")}</p>
              <Link className="btn mt-5 inline-flex" href="/what-we-do/partners">{t("collaborate")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="containerX">
          <h2 className="h2">{t("howItWorksTitle")}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card">
              <h3 className="font-semibold">{t("step1Title")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("step1Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step2Title")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("step2Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step3Title")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("step3Desc")}</p>
            </div>
            <div className="card">
              <h3 className="font-semibold">{t("step4Title")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("step4Desc")}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card">
              <span className="text-[#0F766E]"><Icon name="dna" className="h-6 w-6" /></span>
              <h3 className="mt-3 font-semibold">{t("ngsTitle")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("ngsDesc")}</p>
              <Link className="btn mt-5 inline-flex" href="/learn/ngs">{t("exploreNGS")}</Link>
            </div>
            <div className="card">
              <span className="text-[#0F766E]"><Icon name="trials" className="h-6 w-6" /></span>
              <h3 className="mt-3 font-semibold">{t("trialsTitle")}</h3>
              <p className="muted mt-3 text-sm leading-relaxed">{t("trialsDesc")}</p>
              <Link className="btn mt-5 inline-flex" href="/trials">{t("findTrials")}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
