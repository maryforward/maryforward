export const locales = ['en', 'fa', 'es', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fa: 'فارسی',
  es: 'Español',
  ar: 'العربية',
};

export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  fa: 'rtl',
  es: 'ltr',
  ar: 'rtl',
};
