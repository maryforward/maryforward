import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendReportReadyNotification,
  sendCaseCompletedNotification,
} from "@/lib/email";

// GET - List all reports for a case
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRole = session.user.role;

    // Verify access to the case
    let caseData;
    if (userRole === "CLINICIAN" || userRole === "ADMIN") {
      caseData = await prisma.case.findUnique({
        where: { id },
        include: {
          reports: {
            orderBy: { createdAt: "desc" },
            include: { author: { select: { name: true, email: true } } },
          },
        },
      });
    } else {
      // Patients can only see their own cases
      caseData = await prisma.case.findFirst({
        where: { id, userId: session.user.id },
        include: {
          reports: {
            orderBy: { createdAt: "desc" },
            include: { author: { select: { name: true, email: true } } },
          },
        },
      });
    }

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ reports: caseData.reports });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { error: "Failed to get reports" },
      { status: 500 }
    );
  }
}

// POST - Create a new report for a case (clinicians only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only clinicians and admins can create reports
    if (session.user.role !== "CLINICIAN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reportType, content, reviewerNotes, markAsCompleted } = body;

    // Validate report type
    const validTypes = ["AI_SYNTHESIS", "EXPERT_REVIEW", "FINAL_REPORT", "PATIENT_SUMMARY"];
    if (!reportType || !validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    // Get the case and verify it's assigned to this clinician (or user is admin)
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check if clinician is assigned to this case (admins can write reports for any case)
    if (
      session.user.role === "CLINICIAN" &&
      caseData.assignedClinicianId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this case" },
        { status: 403 }
      );
    }

    // Case must be in reviewable status
    const reviewableStatuses = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"];
    if (!reviewableStatuses.includes(caseData.status)) {
      return NextResponse.json(
        { error: "Case is not in a reviewable status" },
        { status: 400 }
      );
    }

    // Create the report
    const report = await prisma.caseReport.create({
      data: {
        caseId: id,
        reportType,
        content: content || {},
        reviewerNotes,
        authorId: session.user.id,
      },
      include: {
        author: { select: { name: true, email: true } },
      },
    });

    // Update case status if marking as completed
    if (markAsCompleted) {
      await prisma.case.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VIEW_REPORT", // Using existing action type
        resource: "case_report",
        resourceId: report.id,
        metadata: {
          type: "report_created",
          caseId: id,
          reportType,
          markedAsCompleted: markAsCompleted,
        },
      },
    });

    // Send email notifications (don't await to avoid blocking response)
    if (caseData.user.email) {
      // Send report ready notification
      sendReportReadyNotification({
        patientEmail: caseData.user.email,
        patientName: caseData.user.name,
        caseNumber: caseData.caseNumber,
        caseId: id,
        reportType,
      }).catch((err) => console.error("Failed to send report notification:", err));

      // Send case completed notification if applicable
      if (markAsCompleted) {
        sendCaseCompletedNotification({
          patientEmail: caseData.user.email,
          patientName: caseData.user.name,
          caseNumber: caseData.caseNumber,
          caseId: id,
        }).catch((err) => console.error("Failed to send completion notification:", err));
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
