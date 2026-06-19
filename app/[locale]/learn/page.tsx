import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CardHeading, KickerDot } from "@/components/ui/Icon";

export default async function Page() {
  const t = await getTranslations("learn");

  return (
    <>
      <section className="py-14">
        <div className="containerX">
          <div className="glass p-7">
            <div className="kicker"><KickerDot />{t("kicker")}</div>
            <h1 className="h1 mt-2">{t("title")}</h1>
            <p className="muted mt-3 text-base">{t("subtitle")}</p>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="containerX">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <CardHeading icon="pulse">{t("oncology.cardTitle")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("oncology.cardDescription")}</p>
              <Link className="btn mt-4 inline-flex" href="/learn/oncology">{t("browse")}</Link>
            </div>
            <div className="card">
              <CardHeading icon="shield">{t("infectious.cardTitle")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("infectious.cardDescription")}</p>
              <Link className="btn mt-4 inline-flex" href="/learn/infectious">{t("browse")}</Link>
            </div>
            <div className="card">
              <CardHeading icon="video">{t("webinars.cardTitle")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("webinars.cardDescription")}</p>
              <Link className="btn mt-4 inline-flex" href="/learn/webinars">{t("seeSchedule")}</Link>
            </div>
          </div>

          <h2 className="h2 mt-10">{t("contentPromise.title")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card">
              <CardHeading icon="book" className="font-semibold">{t("contentPromise.vettedSources.title")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("contentPromise.vettedSources.description")}</p>
            </div>
            <div className="card">
              <CardHeading icon="quote" className="font-semibold">{t("contentPromise.transparentCitations.title")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("contentPromise.transparentCitations.description")}</p>
            </div>
            <div className="card">
              <CardHeading icon="info" className="font-semibold">{t("contentPromise.clearLimitations.title")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("contentPromise.clearLimitations.description")}</p>
            </div>
            <div className="card">
              <CardHeading icon="review" className="font-semibold">{t("contentPromise.humanReview.title")}</CardHeading>
              <p className="muted mt-2 text-sm">{t("contentPromise.humanReview.description")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
