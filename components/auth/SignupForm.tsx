"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { signupSchema } from "@/lib/validations/auth";

interface SignupFormProps {
  initialRole?: "PATIENT" | "CLINICIAN";
}

export function SignupForm({ initialRole }: SignupFormProps) {
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const t = useTranslations("auth.signup");
  const tCommon = useTranslations("forms.common");
  const tValidation = useTranslations("validation");

  const roles = [
    {
      value: "PATIENT",
      label: t("rolePatient"),
      description: t("rolePatientDescription"),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      value: "CLINICIAN",
      label: t("roleClinician"),
      description: t("roleClinicianDescription"),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  // Skip role selection step if role is provided via props
  const [step, setStep] = useState(initialRole ? 2 : 1);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: (initialRole || "PATIENT") as "PATIENT" | "CLINICIAN",
    specialty: "",
    licenseNumber: "",
    institution: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRoleSelect = (role: "PATIENT" | "CLINICIAN") => {
    setFormData((prev) => ({ ...prev, role }));
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Verify CAPTCHA
    if (siteKey && !captchaToken) {
      setGeneralError(t("captchaRequired"));
      return;
    }

    setIsLoading(true);

    try {
      // Verify CAPTCHA on server if token exists
      if (captchaToken) {
        const captchaResponse = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: captchaToken }),
        });

        if (!captchaResponse.ok) {
          setGeneralError(t("captchaFailed"));
          recaptchaRef.current?.reset();
          setCaptchaToken(null);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Email already exists") {
          setErrors({ email: t("emailExists") });
        } else {
          setGeneralError(data.error || t("generalError"));
        }
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      // For clinicians, show pending approval message
      if (formData.role === "CLINICIAN") {
        setShowPendingMessage(true);
        return;
      }

      // Sign in after successful registration (patients only)
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setGeneralError(t("accountCreatedSignInFailed"));
      } else {
        router.push("/portal/onboarding");
        router.refresh();
      }
    } catch {
      setGeneralError(t("generalError"));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/portal/onboarding" });
  };

  // Show pending approval message for clinicians
  if (showPendingMessage) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="rounded-full bg-amber-500/20 p-4 w-16 h-16 mx-auto flex items-center justify-center">
          <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-50">{t("pendingApprovalTitle")}</h3>
        <p className="mt-2 text-slate-400">
          {t("pendingApprovalDescription")}
        </p>
        <Link href="/login" className="btn btnPrimary mt-6 inline-flex">
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  // Step 1: Role selection
  if (step === 1) {
    return (
      <div className="w-full max-w-md">
        <p className="text-slate-400 mb-4">{t("iAmA")}</p>
        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => handleRoleSelect(role.value as "PATIENT" | "CLINICIAN")}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-start transition-all hover:border-sky-400/50 hover:bg-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-sky-500/20 p-2 text-sky-400">
                  {role.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-50">{role.label}</p>
                  <p className="text-sm text-slate-400">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-sky-400 hover:text-sky-300">
            {t("signIn")}
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <div className="w-full max-w-md">
      {!initialRole && (
        <>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-4 text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("changeAccountType")}
          </button>

          <div className="mb-4 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-sm text-slate-400">
              {t("registeringAs")}{" "}
              <span className="text-sky-400 font-medium">
                {formData.role === "PATIENT" ? t("rolePatient") : t("roleClinician")}
              </span>
            </p>
          </div>
        </>
      )}

      {formData.role === "CLINICIAN" && (
        <Alert variant="info" className="mb-4">
          {t("clinicianApprovalNotice")}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && <Alert variant="error">{generalError}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={tCommon("firstName")}
            name="firstName"
            placeholder={tCommon("firstNamePlaceholder")}
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <Input
            label={tCommon("lastName")}
            name="lastName"
            placeholder={tCommon("lastNamePlaceholder")}
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          label={tCommon("email")}
          type="email"
          name="email"
          placeholder={tCommon("emailPlaceholder")}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
          autoComplete="email"
        />

        {formData.role === "CLINICIAN" && (
          <>
            <Input
              label={t("specialty")}
              name="specialty"
              placeholder={t("specialtyPlaceholder")}
              value={formData.specialty}
              onChange={handleChange}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("licenseNumber")}
                name="licenseNumber"
                placeholder={t("licenseNumberPlaceholder")}
                value={formData.licenseNumber}
                onChange={handleChange}
                required
              />
              <Input
                label={t("institution")}
                name="institution"
                placeholder={t("institutionPlaceholder")}
                value={formData.institution}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <Input
          label={tCommon("password")}
          type="password"
          name="password"
          placeholder={t("createPasswordPlaceholder")}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          required
          autoComplete="new-password"
        />

        <Input
          label={t("confirmPassword")}
          type="password"
          name="confirmPassword"
          placeholder={t("confirmPasswordPlaceholder")}
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
        />

        <p className="text-xs text-slate-400">
          {tValidation("passwordRequirements")}
        </p>

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            required
            className="mt-1 rounded border-white/20 bg-white/5"
          />
          <span>
            {t("agreeToTerms")}{" "}
            <Link href="/company/compliance" className="text-sky-400 hover:text-sky-300">
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/company/compliance" className="text-sky-400 hover:text-sky-300">
              {t("privacyPolicy")}
            </Link>
          </span>
        </label>

        {siteKey && (
          <div className="flex justify-center py-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={siteKey}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
              theme="dark"
            />
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {formData.role === "CLINICIAN" ? t("submitForApproval") : t("createAccount")}
        </Button>
      </form>

      {formData.role === "PATIENT" && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-2 text-slate-400">
                {t("orContinueWith")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={handleGoogleSignIn}
          >
            <svg className="me-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("continueWithGoogle")}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
