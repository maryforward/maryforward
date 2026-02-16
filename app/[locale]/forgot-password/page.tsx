"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("auth.forgotPassword");
  const tCommon = useTranslations("forms.common");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reset email");
      }

      setIsSubmitted(true);
    } catch {
      setError(t("sendError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-14">
      <div className="containerX">
        <div className="mx-auto max-w-md">
          <div className="glass p-7">
            <div className="kicker">{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("title")}</h1>
            <p className="muted mt-3 text-base">
              {t("description")}
            </p>

            <div className="mt-6">
              {isSubmitted ? (
                <div className="space-y-4">
                  <Alert variant="success">
                    {t("successMessage")}
                  </Alert>
                  <Link
                    href="/login"
                    className="btn btnPrimary inline-flex w-full justify-center"
                  >
                    {t("backToLogin")}
                  </Link>
                </div>
              ) : (
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

                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    {t("sendResetLink")}
                  </Button>

                  <p className="text-center text-sm text-slate-400">
                    {t("rememberPassword")}{" "}
                    <Link href="/login" className="text-sky-400 hover:text-sky-300">
                      {t("signIn")}
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
