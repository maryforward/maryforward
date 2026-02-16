import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isApproved: boolean;
      hasAcceptedTerms: boolean;
      hasAcceptedConsent: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    isApproved?: boolean;
    hasAcceptedTerms?: boolean;
    hasAcceptedConsent?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    isApproved?: boolean;
    hasAcceptedTerms?: boolean;
    hasAcceptedConsent?: boolean;
  }
}
