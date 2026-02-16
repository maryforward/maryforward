import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PatientIntakeForm } from "@/components/forms/PatientIntakeForm";

export default async function NewCasePage() {
  const t = await getTranslations("portal.intake");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/portal/cases"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          {t("backToCases")}
        </Link>
        <h1 className="h1 mt-2">{t("title")}</h1>
        <p className="muted mt-2">
          {t("description")}
        </p>
      </div>

      <PatientIntakeForm />
    </div>
  );
}
