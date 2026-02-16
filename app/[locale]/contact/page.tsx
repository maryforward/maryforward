import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/forms/ContactForm";

export default async function ContactPage() {
  const t = await getTranslations("pages.contact");

  return (
    <section className="py-14">
      <div className="containerX">
        <div className="glass p-7">
          <div className="kicker">{t("kicker")}</div>
          <h1 className="h1 mt-2">{t("title")}</h1>
          <p className="muted mt-3 text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-6 glass p-7">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
