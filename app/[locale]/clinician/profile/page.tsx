"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/providers/ToastProvider";

interface ClinicianProfile {
  name: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  institution: string;
}

export default function ClinicianProfilePage() {
  const { data: session, update } = useSession();
  const { addToast } = useToast();
  const t = useTranslations("clinician.profile");

  const [formData, setFormData] = useState<ClinicianProfile>({
    name: "",
    email: "",
    specialty: "",
    licenseNumber: "",
    institution: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.user.name || "",
            email: data.user.email || "",
            specialty: data.user.specialty || "",
            licenseNumber: data.user.licenseNumber || "",
            institution: data.user.institution || "",
          });
        }
      } catch {
        console.error("Failed to fetch profile");
      } finally {
        setIsFetching(false);
      }
    }
    fetchProfile();
  }, [session?.user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          specialty: formData.specialty,
          institution: formData.institution,
        }),
      });

      if (!response.ok) {
        throw new Error(t("errors.updateFailed"));
      }

      await update({ name: formData.name });
      addToast(t("successMessage"), "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">{t("description")}</p>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50">{t("personalInfo.title")}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Input
            label={t("personalInfo.fullName")}
            name="name"
            value={formData.name}
            onChange={handleChange}
          />

          <Input
            label={t("personalInfo.email")}
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="opacity-50"
          />
          <p className="text-xs text-slate-400">
            {t("personalInfo.emailNote")}
          </p>

          <Button type="submit" isLoading={isLoading}>
            {t("saveChanges")}
          </Button>
        </form>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50">{t("professionalInfo.title")}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label={t("professionalInfo.specialty")}
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            placeholder={t("professionalInfo.specialtyPlaceholder")}
          />

          <Input
            label={t("professionalInfo.licenseNumber")}
            name="licenseNumber"
            value={formData.licenseNumber}
            disabled
            className="opacity-50"
          />
          <p className="text-xs text-slate-400">
            {t("professionalInfo.licenseNote")}
          </p>

          <Input
            label={t("professionalInfo.institution")}
            name="institution"
            value={formData.institution}
            onChange={handleChange}
            placeholder={t("professionalInfo.institutionPlaceholder")}
          />

          <Button type="submit" isLoading={isLoading}>
            {t("saveChanges")}
          </Button>
        </form>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50">{t("accountStatus.title")}</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{t("accountStatus.accountType")}</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {t("accountStatus.healthcareProvider")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{t("accountStatus.verificationStatus")}</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {t("accountStatus.verified")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
