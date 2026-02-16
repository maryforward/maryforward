import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Lightweight auth config for Edge middleware (no Prisma/bcrypt)
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    newUser: "/portal/onboarding",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.isApproved = (user as { isApproved?: boolean }).isApproved;
        token.hasAcceptedTerms = (user as { hasAcceptedTerms?: boolean }).hasAcceptedTerms;
        token.hasAcceptedConsent = (user as { hasAcceptedConsent?: boolean }).hasAcceptedConsent;
      }
      if (trigger === "update" && session) {
        token.name = session.name;
        if (session.hasAcceptedTerms !== undefined) {
          token.hasAcceptedTerms = session.hasAcceptedTerms;
        }
        if (session.hasAcceptedConsent !== undefined) {
          token.hasAcceptedConsent = session.hasAcceptedConsent;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isApproved = token.isApproved as boolean;
        session.user.hasAcceptedTerms = token.hasAcceptedTerms as boolean;
        session.user.hasAcceptedConsent = token.hasAcceptedConsent as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
