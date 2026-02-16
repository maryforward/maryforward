import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hasAcceptedTerms, hasAcceptedConsent } = body;

    if (!hasAcceptedTerms || !hasAcceptedConsent) {
      return NextResponse.json(
        { error: "Both terms and consent must be accepted" },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        hasAcceptedTerms: true,
        termsAcceptedAt: now,
        hasAcceptedConsent: true,
        consentAcceptedAt: now,
      },
    });

    // Log the consent acceptance for HIPAA compliance
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_CASE", // Using existing action type for consent
        resource: "consent",
        resourceId: session.user.id,
        metadata: {
          type: "consent_accepted",
          termsAcceptedAt: now.toISOString(),
          consentAcceptedAt: now.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Consent accepted successfully",
    });
  } catch (error) {
    console.error("Consent error:", error);
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 }
    );
  }
}
