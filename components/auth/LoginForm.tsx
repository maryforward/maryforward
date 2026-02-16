"use client";

import { useState, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface LoginFormProps {
  role?: string;
}

export function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("forms.common");

  // Get callback URL from search params (used if explicitly provided)
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Verify CAPTCHA
    if (siteKey && !captchaToken) {
      setError(t("captchaRequired"));
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
          setError(t("captchaFailed"));
          recaptchaRef.current?.reset();
          setCaptchaToken(null);
          setIsLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      } else {
        // Get the session to determine user role for redirect
        const session = await getSession();
        const userRole = session?.user?.role;

        // Determine redirect URL based on role
        let redirectUrl = callbackUrl;
        if (!redirectUrl) {
          if (userRole === "ADMIN") {
            redirectUrl = "/admin/dashboard";
          } else if (userRole === "CLINICIAN") {
            redirectUrl = "/clinician/dashboard";
          } else {
            redirectUrl = "/portal/dashboard";
          }
        }

        router.push(redirectUrl);
        router.refresh();
      }
    } catch {
      setError(t("generalError"));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label={tCommon("email")}
          type="email"
          placeholder={tCommon("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label={tCommon("password")}
          type="password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-white/5"
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="text-sky-400 hover:text-sky-300"
          >
            {t("forgotPassword")}
          </Link>
        </div>

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
          {t("signIn")}
        </Button>
      </form>

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

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-sky-400 hover:text-sky-300">
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
