import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendCaseSubmittedPatientNotification,
  sendCaseSubmittedTeamNotification,
} from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check case exists and belongs to user
    const existingCase = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Only allow submitting draft cases
    if (existingCase.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft cases can be submitted" },
        { status: 400 }
      );
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Log the submission for audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SUBMIT_CASE",
        resource: `case:${id}`,
        metadata: { caseNumber: updatedCase.caseNumber },
      },
    });

    // Send email notifications (don't await to avoid blocking response)
    if (existingCase.user.email) {
      // Send confirmation to patient
      sendCaseSubmittedPatientNotification({
        patientEmail: existingCase.user.email,
        patientName: existingCase.user.name,
        caseNumber: updatedCase.caseNumber,
        caseId: id,
        caseType: existingCase.caseType,
      }).catch((err) => console.error("Failed to send patient notification:", err));

      // Send notification to team
      sendCaseSubmittedTeamNotification({
        patientName: existingCase.user.name,
        patientEmail: existingCase.user.email,
        caseNumber: updatedCase.caseNumber,
        caseId: id,
        caseType: existingCase.caseType,
        primaryDiagnosis: existingCase.primaryDiagnosis,
      }).catch((err) => console.error("Failed to send team notification:", err));
    }

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error) {
    console.error("Submit case error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
