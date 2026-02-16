import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an admin
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can approve clinicians" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = approvalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const { action } = validated.data;

    // Find the clinician
    const clinician = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        isApproved: true,
        name: true,
        email: true,
      },
    });

    if (!clinician) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (clinician.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "User is not a clinician" },
        { status: 400 }
      );
    }

    if (clinician.isApproved) {
      return NextResponse.json(
        { error: "Clinician is already approved" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Approve the clinician
      await prisma.user.update({
        where: { id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedById: session.user.id,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CLINICIAN_APPROVED",
          resource: "User",
          resourceId: id,
          metadata: {
            clinicianName: clinician.name,
            clinicianEmail: clinician.email,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Clinician approved successfully",
      });
    } else {
      // Reject and delete the clinician account
      await prisma.user.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CLINICIAN_REJECTED",
          resource: "User",
          resourceId: id,
          metadata: {
            clinicianName: clinician.name,
            clinicianEmail: clinician.email,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Clinician rejected and account deleted",
      });
    }
  } catch (error) {
    console.error("Clinician approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
