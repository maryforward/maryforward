"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function ConsentPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useTranslations("portal.consent");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!termsAccepted || !consentAccepted) {
      setError(t("mustAcceptBoth"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasAcceptedTerms: true,
          hasAcceptedConsent: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("saveError"));
      }

      // Update the session with new consent values
      await update({
        hasAcceptedTerms: true,
        hasAcceptedConsent: true,
      });

      // Redirect to onboarding or dashboard
      router.push("/portal/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("generalError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="containerX">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="h1">{t("welcomeTitle")}</h1>
            <p className="muted mt-3 text-lg">
              {t("welcomeSubtitle")}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Terms of Service / Disclaimer */}
            <div className="glass p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-50 uppercase tracking-wide">
                    {t("termsTitle")}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{t("termsSubtitle")}</p>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto bg-slate-950/50 rounded-lg p-6 mb-6 border border-white/5">
                <h3 className="text-base font-bold text-sky-400 uppercase tracking-wide mb-4 pb-2 border-b border-sky-400/30">
                  {t("importantInfo")}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {t("termsIntro")}
                </p>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">1</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("natureOfServiceTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("natureOfServiceText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">2</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("reviewProcessTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("reviewProcessText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">3</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("infoAccuracyTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("infoAccuracyText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">4</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("clinicalTrialsInfoTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("clinicalTrialsInfoText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">5</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("noPatientRelationshipTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("noPatientRelationshipText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">6</span>
                      <span className="underline underline-offset-4 decoration-amber-400/50 text-amber-200">{t("emergencyTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("emergencyText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">7</span>
                      <span className="underline underline-offset-4 decoration-sky-400/50">{t("liabilityTitle")}</span>
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed pl-8">
                      {t("liabilityText")}
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-white/10 hover:border-sky-400/30 hover:bg-white/5 transition-all">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  {t("termsCheckbox")}
                </span>
              </label>
            </div>

            {/* Patient Consent Form */}
            <div className="glass p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-50 uppercase tracking-wide">
                    {t("patientConsentTitle")}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{t("patientConsentSubtitle")}</p>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto bg-slate-950/50 rounded-lg p-6 mb-6 border border-white/5">
                <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wide mb-4 pb-2 border-b border-emerald-400/30">
                  {t("consentHeader")}
                </h3>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("purposeTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t("purposeText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("consentToShareTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {t("consentToShareIntro")}
                    </p>
                    <ul className="text-slate-400 text-sm space-y-1.5 pl-4">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        {t("shareItem1")}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        {t("shareItem2")}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        {t("shareItem3")}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        {t("shareItem4")}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        {t("shareItem5")}
                      </li>
                    </ul>
                    <p className="text-slate-400 text-sm leading-relaxed mt-3">
                      {t("consentToShareOutro")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("privacyTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t("privacyText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("deidentifiedDataTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {t("deidentifiedDataIntro")}
                    </p>
                    <ul className="text-slate-400 text-sm space-y-2 pl-4">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("deidentifiedItem1")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("deidentifiedItem2")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("deidentifiedItem3")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("deidentifiedItem4")}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("limitationsTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {t("limitationsIntro")}
                    </p>
                    <ul className="text-slate-400 text-sm space-y-2 pl-4">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("limitationItem1")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("limitationItem2")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("limitationItem3")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">&#8226;</span>
                        <span>{t("limitationItem4")}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("communicationTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t("communicationText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("voluntaryTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t("voluntaryText")}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 mb-2 underline underline-offset-4 decoration-emerald-400/50">
                      {t("questionsTitle")}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t("questionsText")}
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-white/10 hover:border-emerald-400/30 hover:bg-white/5 transition-all">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  {t("consentCheckbox")}
                </span>
              </label>
            </div>

            {/* Signature Section */}
            <div className="glass p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-50 uppercase tracking-wide">
                    {t("signatureTitle")}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{t("signatureSubtitle")}</p>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-lg p-5 mb-6 border border-white/5">
                <div className="flex items-start gap-3 text-slate-300 text-sm">
                  <svg className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="leading-relaxed">
                    {t("signatureNotice")}
                  </span>
                </div>
              </div>

              {session?.user && (
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("signingAs")}</p>
                    <p className="text-sm text-slate-200 font-medium">{session.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("date")}</p>
                    <p className="text-sm text-slate-200 font-medium">
                      {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-base py-3"
                isLoading={isSubmitting}
                disabled={!termsAccepted || !consentAccepted}
              >
                {t("agreeAndContinue")}
              </Button>

              {(!termsAccepted || !consentAccepted) && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  {t("pleaseAcceptBoth")}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
