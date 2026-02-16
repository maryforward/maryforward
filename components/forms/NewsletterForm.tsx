"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "exists">("idle");
  const t = useTranslations("forms.newsletter");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 409) {
        setStatus("exists");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          placeholder={t("placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10"
        />
        <Button type="submit" size="md" isLoading={isLoading}>
          {t("subscribe")}
        </Button>
      </form>
      {status === "success" && (
        <p className="mt-2 text-sm text-emerald-400">
          {t("successMessage")}
        </p>
      )}
      {status === "exists" && (
        <p className="mt-2 text-sm text-amber-400">
          {t("alreadySubscribed")}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-red-400">
          {t("errorMessage")}
        </p>
      )}
    </div>
  );
}
