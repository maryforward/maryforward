import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get unread message count for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    let unreadCount = 0;
    let caseUnreadCounts: { caseId: string; count: number }[] = [];

    if (userRole === "PATIENT") {
      // For patients: count unread messages in their own cases
      // (messages not sent by them)
      const cases = await prisma.case.findMany({
        where: { userId },
        select: { id: true },
      });

      const caseIds = cases.map((c) => c.id);

      if (caseIds.length > 0) {
        // Get total unread count
        unreadCount = await prisma.message.count({
          where: {
            caseId: { in: caseIds },
            senderId: { not: userId },
            isRead: false,
          },
        });

        // Get per-case unread counts
        const counts = await prisma.message.groupBy({
          by: ["caseId"],
          where: {
            caseId: { in: caseIds },
            senderId: { not: userId },
            isRead: false,
          },
          _count: { id: true },
        });

        caseUnreadCounts = counts.map((c) => ({
          caseId: c.caseId,
          count: c._count.id,
        }));
      }
    } else if (userRole === "CLINICIAN") {
      // For clinicians: count unread messages in cases assigned to them
      // (messages not sent by them)
      const cases = await prisma.case.findMany({
        where: { assignedClinicianId: userId },
        select: { id: true },
      });

      const caseIds = cases.map((c) => c.id);

      if (caseIds.length > 0) {
        // Get total unread count
        unreadCount = await prisma.message.count({
          where: {
            caseId: { in: caseIds },
            senderId: { not: userId },
            isRead: false,
          },
        });

        // Get per-case unread counts
        const counts = await prisma.message.groupBy({
          by: ["caseId"],
          where: {
            caseId: { in: caseIds },
            senderId: { not: userId },
            isRead: false,
          },
          _count: { id: true },
        });

        caseUnreadCounts = counts.map((c) => ({
          caseId: c.caseId,
          count: c._count.id,
        }));
      }
    } else if (userRole === "ADMIN") {
      // For admins: count all unread messages (not sent by them)
      unreadCount = await prisma.message.count({
        where: {
          senderId: { not: userId },
          isRead: false,
        },
      });
    }

    return NextResponse.json({
      unreadCount,
      caseUnreadCounts,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
