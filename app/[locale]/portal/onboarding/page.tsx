"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { addToast } = useToast();
  const t = useTranslations("portal.onboarding");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch existing user data when session is ready
  useEffect(() => {
    async function fetchUserData() {
      if (status === "loading") return;

      if (!session?.user?.id) {
        setIsFetching(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            address: data.user.address || "",
            city: data.user.city || "",
            state: data.user.state || "",
            zipCode: data.user.zipCode || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsFetching(false);
      }
    }

    fetchUserData();
  }, [session?.user?.id, status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        }),
      });

      if (!response.ok) {
        throw new Error(t("updateError"));
      }

      await update({ name: `${formData.firstName} ${formData.lastName}` });
      addToast(t("welcomeToast"), "success");
      router.push("/portal/dashboard");
    } catch {
      addToast(t("setupError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/portal/dashboard");
  };

  if (isFetching) {
    return (
      <div className="mx-auto max-w-lg flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">
          {t("subtitle")}
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50 mb-4">{t("personalInfo")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("firstName")}
              name="firstName"
              placeholder={t("firstNamePlaceholder")}
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input
              label={t("lastName")}
              name="lastName"
              placeholder={t("lastNamePlaceholder")}
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label={t("email")}
            name="email"
            type="email"
            value={formData.email}
            disabled
            className="opacity-50"
          />
          <p className="text-xs text-slate-400 -mt-2">
            {t("emailCannotChange")}
          </p>

          <Input
            label={t("phoneOptional")}
            name="phone"
            type="tel"
            placeholder={t("phonePlaceholder")}
            value={formData.phone}
            onChange={handleChange}
          />

          <div className="border-t border-white/10 pt-4 mt-4">
            <h3 className="text-sm font-medium text-slate-200 mb-3">{t("addressOptional")}</h3>

            <Input
              label={t("streetAddress")}
              name="address"
              placeholder={t("streetAddressPlaceholder")}
              value={formData.address}
              onChange={handleChange}
            />

            <div className="grid grid-cols-6 gap-4 mt-4">
              <div className="col-span-3">
                <Input
                  label={t("city")}
                  name="city"
                  placeholder={t("cityPlaceholder")}
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-1">
                <Input
                  label={t("state")}
                  name="state"
                  placeholder={t("statePlaceholder")}
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={t("zipCode")}
                  name="zipCode"
                  placeholder={t("zipCodePlaceholder")}
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              className="flex-1"
            >
              {t("skipForNow")}
            </Button>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              {t("completeSetup")}
            </Button>
          </div>
        </form>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50">{t("whatHappensNext")}</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-sky-500/20 p-1">
              <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {t("nextStep1")}
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-sky-500/20 p-1">
              <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {t("nextStep2")}
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-sky-500/20 p-1">
              <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {t("nextStep3")}
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-sky-500/20 p-1">
              <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {t("nextStep4")}
          </li>
        </ul>
      </div>
    </div>
  );
}
