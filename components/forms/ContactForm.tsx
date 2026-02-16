"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/providers/ToastProvider";

export function ContactForm() {
  const { addToast } = useToast();
  const t = useTranslations("forms.contact");
  const tCommon = useTranslations("forms.common");

  const categories = [
    { value: "PATIENT", label: t("categoryPatient") },
    { value: "CLINICIAN", label: t("categoryClinician") },
    { value: "PARTNER", label: t("categoryPartner") },
    { value: "OTHER", label: t("categoryOther") },
  ];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    category: "OTHER",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      setIsSubmitted(true);
      addToast(t("successToast"), "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("submitError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          {t("successMessage")}
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              category: "OTHER",
              message: "",
            });
          }}
        >
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={tCommon("firstName")}
          name="firstName"
          placeholder={tCommon("firstNamePlaceholder")}
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <Input
          label={tCommon("lastName")}
          name="lastName"
          placeholder={tCommon("lastNamePlaceholder")}
          value={formData.lastName}
          onChange={handleChange}
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
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          {t("iAmA")}
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value} className="bg-slate-900">
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          {t("message")}
        </label>
        <textarea
          name="message"
          placeholder={t("messagePlaceholder")}
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        {t("sendMessage")}
      </Button>
    </form>
  );
}
