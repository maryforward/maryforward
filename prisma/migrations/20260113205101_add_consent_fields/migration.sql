-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "hasAcceptedConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasAcceptedTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
