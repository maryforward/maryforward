"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/providers/ToastProvider";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { addToast } = useToast();
  const t = useTranslations("portal.profile");

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
  const [error, setError] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUserData() {
      if (!session?.user?.id) return;

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
          if (data.user.createdAt) {
            setCreatedAt(new Date(data.user.createdAt).toLocaleDateString());
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setIsFetching(false);
      }
    }

    fetchUserData();
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
      addToast(t("savedSuccess"), "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="mx-auto max-w-2xl flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="h1">{t("title")}</h1>
        <p className="muted mt-2">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-slate-50">{t("personalInfo")}</h2>

          <div className="mt-4 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("firstName")}
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder={t("firstNamePlaceholder")}
              />
              <Input
                label={t("lastName")}
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder={t("lastNamePlaceholder")}
              />
            </div>

            <Input
              label={t("email")}
              type="email"
              name="email"
              value={formData.email}
              disabled
              className="opacity-50"
            />
            <p className="text-xs text-slate-400 -mt-2">
              {t("emailCannotChange")}
            </p>

            <Input
              label={t("phone")}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t("phonePlaceholder")}
            />
          </div>
        </div>

        <div className="glass p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-50">{t("address")}</h2>

          <div className="mt-4 space-y-4">
            <Input
              label={t("streetAddress")}
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder={t("streetAddressPlaceholder")}
            />

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <Input
                  label={t("city")}
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder={t("cityPlaceholder")}
                />
              </div>
              <div className="col-span-1">
                <Input
                  label={t("state")}
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder={t("statePlaceholder")}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={t("zipCode")}
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder={t("zipCodePlaceholder")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button type="submit" isLoading={isLoading}>
            {t("saveChanges")}
          </Button>
        </div>
      </form>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-slate-50">{t("account")}</h2>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{t("accountType")}</span>
            <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-medium text-sky-400">
              {session?.user?.role === "PATIENT" ? t("rolePatient") : session?.user?.role || t("rolePatient")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{t("memberSince")}</span>
            <span className="text-sm text-slate-200">{createdAt || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
