import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const { auth } = NextAuth(authConfig);

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Helper to get pathname without locale prefix
function getPathnameWithoutLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.replace(`/${locale}`, "") || "/";
    }
  }
  return pathname;
}

// Helper to check if pathname has a locale prefix
function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

// Auth middleware wrapper
const authMiddleware = auth((req) => {
  const pathname = getPathnameWithoutLocale(req.nextUrl.pathname);
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  // Get locale from URL for redirects
  const localeMatch = req.nextUrl.pathname.match(/^\/(en|fa)/);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;

  const isPortalRoute = pathname.startsWith("/portal");
  const isConsentRoute = pathname === "/portal/consent";
  const isClinicianRoute = pathname.startsWith("/clinician");
  const isAdminRoute = pathname.startsWith("/admin");
  const isPendingApprovalRoute = pathname === "/pending-approval";
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].some(
    (route) => pathname.startsWith(route)
  );

  // Redirect authenticated users away from auth pages to their appropriate portal
  if (isLoggedIn && isAuthRoute) {
    const role = user?.role;
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, req.url));
    } else if (role === "CLINICIAN") {
      if (!user?.isApproved) {
        return NextResponse.redirect(new URL(`/${locale}/pending-approval`, req.url));
      }
      return NextResponse.redirect(new URL(`/${locale}/clinician/dashboard`, req.url));
    }
    if (role === "PATIENT" && (!user?.hasAcceptedTerms || !user?.hasAcceptedConsent)) {
      return NextResponse.redirect(new URL(`/${locale}/portal/consent`, req.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/portal/dashboard`, req.url));
  }

  // Protect portal routes (patients only)
  if (isPortalRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname);
      return NextResponse.redirect(new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, req.url));
    }
    if (user?.role === "CLINICIAN") {
      return NextResponse.redirect(new URL(`/${locale}/clinician/dashboard`, req.url));
    }
    if (user?.role === "PATIENT" && !isConsentRoute) {
      if (!user?.hasAcceptedTerms || !user?.hasAcceptedConsent) {
        return NextResponse.redirect(new URL(`/${locale}/portal/consent`, req.url));
      }
    }
  }

  // Protect clinician routes
  if (isClinicianRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname);
      return NextResponse.redirect(new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, req.url));
    }
    if (user?.role === "PATIENT") {
      return NextResponse.redirect(new URL(`/${locale}/portal/dashboard`, req.url));
    }
    if (user?.role === "CLINICIAN" && !user?.isApproved) {
      return NextResponse.redirect(new URL(`/${locale}/pending-approval`, req.url));
    }
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname);
      return NextResponse.redirect(new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, req.url));
    }
    if (user?.role !== "ADMIN") {
      if (user?.role === "CLINICIAN" && user?.isApproved) {
        return NextResponse.redirect(new URL(`/${locale}/clinician/dashboard`, req.url));
      }
      return NextResponse.redirect(new URL(`/${locale}/portal/dashboard`, req.url));
    }
  }

  // Handle pending approval page
  if (isPendingApprovalRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
    if (user?.isApproved || user?.role === "PATIENT") {
      if (user?.role === "CLINICIAN") {
        return NextResponse.redirect(new URL(`/${locale}/clinician/dashboard`, req.url));
      }
      return NextResponse.redirect(new URL(`/${locale}/portal/dashboard`, req.url));
    }
  }

  return NextResponse.next();
});

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If URL doesn't have locale prefix, let intl middleware add it first
  if (!hasLocalePrefix(pathname)) {
    return intlMiddleware(req);
  }

  // Get the pathname without locale for checking protected routes
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  // Check if this is a protected route that needs auth
  const protectedPaths = [
    "/portal",
    "/clinician",
    "/admin",
    "/pending-approval",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];

  const needsAuth = protectedPaths.some(
    (path) => pathnameWithoutLocale.startsWith(path) || pathnameWithoutLocale === path
  );

  // If it's a protected route, run auth middleware
  if (needsAuth) {
    // @ts-expect-error - auth middleware type mismatch with NextRequest
    return authMiddleware(req, {});
  }

  // For non-protected routes with locale, just continue
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
