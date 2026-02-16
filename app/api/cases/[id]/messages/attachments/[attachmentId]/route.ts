import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

// GET - Download a message attachment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId, attachmentId } = await params;

    // Get the case and verify access
    const caseData = await prisma.case.findFirst({
      where: { id: caseId },
      select: {
        id: true,
        userId: true,
        assignedClinicianId: true,
        caseNumber: true,
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

    // Get the attachment
    const attachment = await prisma.messageAttachment.findFirst({
      where: {
        id: attachmentId,
        message: {
          caseId: caseId,
        },
      },
      include: {
        message: {
          select: { id: true, caseId: true },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Read the file from disk
    const filePath = join(process.cwd(), "uploads", attachment.storageKey);

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    // Log the download for HIPAA compliance (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DOWNLOAD_MESSAGE_ATTACHMENT",
        resource: "messageAttachment",
        resourceId: attachmentId,
        metadata: {
          caseId,
          caseNumber: caseData.caseNumber,
          fileName: attachment.fileName,
        },
      },
    }).catch(() => {}); // Fire and forget

    // Return the file with appropriate headers
    const response = new NextResponse(new Uint8Array(fileBuffer));
    response.headers.set("Content-Type", attachment.fileType);
    response.headers.set(
      "Content-Disposition",
      `inline; filename="${attachment.fileName}"`
    );
    response.headers.set("Content-Length", String(attachment.fileSize));

    return response;
  } catch (error) {
    console.error("Download attachment error:", error);
    return NextResponse.json(
      { error: "Failed to download attachment" },
      { status: 500 }
    );
  }
}
