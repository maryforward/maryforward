import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Mark all messages in a case as read for the current user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;

    // Get the case and verify access
    const caseData = await prisma.case.findFirst({
      where: { id: caseId },
      select: {
        id: true,
        userId: true,
        assignedClinicianId: true,
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check authorization: patient, assigned clinician, or admin
    const isPatient = caseData.userId === session.user.id;
    const isAssignedClinician = caseData.assignedClinicianId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isPatient && !isAssignedClinician && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Mark all messages NOT sent by the current user as read
    // (users don't need to mark their own messages as read)
    const result = await prisma.message.updateMany({
      where: {
        caseId,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      markedAsRead: result.count,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
