import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/portal/onboarding",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isApproved: user.isApproved,
          hasAcceptedTerms: user.hasAcceptedTerms,
          hasAcceptedConsent: user.hasAcceptedConsent,
        };
      },
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
      // Handle session updates
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
});
