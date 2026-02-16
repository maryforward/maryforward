import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <section className="py-14">
      <div className="containerX">
        <div className="mx-auto max-w-md">
          <div className="glass p-7">
            <Suspense fallback={<div>Loading...</div>}>
              <SignupPageContent searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

async function SignupPageContent({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const isPatient = role === "PATIENT";
  const isClinician = role === "CLINICIAN";
  const t = await getTranslations("pages.signup");
  const tSignup = await getTranslations("auth.signup");

  return (
    <>
      {(isPatient || isClinician) && (
        <div className="mb-4 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
          <p className="text-sm text-slate-400">
            {t("signingUpAs")}{" "}
            <span className="text-sky-400 font-medium">
              {isPatient ? tSignup("rolePatient") : tSignup("roleClinician")}
            </span>
          </p>
        </div>
      )}
      <div className="kicker">{t("kicker")}</div>
      <h1 className="h1 mt-2">{t("title")}</h1>
      <p className="muted mt-3 text-base">
        {isClinician ? t("clinicianDescription") : t("patientDescription")}
      </p>
      <div className="mt-6">
        <SignupForm initialRole={role as "PATIENT" | "CLINICIAN" | undefined} />
      </div>
    </>
  );
}
