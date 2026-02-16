import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a clinician
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.isApproved) {
      return NextResponse.json(
        { error: "Only approved clinicians can assign cases" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Find the case
    const existingCase = await prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedClinicianId: true,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check if case is assignable
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(existingCase.status)) {
      return NextResponse.json(
        { error: "Case cannot be assigned in its current status" },
        { status: 400 }
      );
    }

    // Check if case is already assigned
    if (existingCase.assignedClinicianId) {
      return NextResponse.json(
        { error: "Case is already assigned to a clinician" },
        { status: 400 }
      );
    }

    // Assign the case
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        assignedClinicianId: session.user.id,
        assignedAt: new Date(),
        status: "UNDER_REVIEW",
      },
      select: {
        id: true,
        caseNumber: true,
        assignedClinicianId: true,
        assignedAt: true,
        status: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CASE_ASSIGNED",
        resource: "Case",
        resourceId: id,
        metadata: {
          caseNumber: updatedCase.caseNumber,
          clinicianId: session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error) {
    console.error("Case assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
