import "../globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { locales, localeDirection, type Locale } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "MaryForward",
  description:
    "Guidance forward for complex medical decisions — expert-reviewed decision support for oncology and infectious disease.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  const direction = localeDirection[locale as Locale];
  const isRTL = direction === "rtl";

  return (
    <html lang={locale} dir={direction}>
      <body
        className={`min-h-screen bg-[radial-gradient(900px_600px_at_15%_10%,rgba(167,139,250,.18),transparent_60%),radial-gradient(800px_600px_at_85%_20%,rgba(125,211,252,.16),transparent_55%),radial-gradient(900px_700px_at_50%_90%,rgba(52,211,153,.10),transparent_55%)] ${
          isRTL ? "font-persian" : ""
        }`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <Nav />
              <main>{children}</main>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
