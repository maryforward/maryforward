import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { createMessageSchema } from "@/lib/validations/messages";

// Allowed file types for attachments
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/dicom",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// GET - List all messages for a case
export async function GET(
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
        caseNumber: true,
        title: true,
        user: { select: { id: true, name: true } },
        assignedClinician: { select: { id: true, name: true } },
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

    // Fetch messages with sender info and attachments
    const messages = await prisma.message.findMany({
      where: { caseId },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Log the access for HIPAA compliance (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VIEW_MESSAGES",
        resource: "message",
        resourceId: caseId,
        metadata: {
          caseNumber: caseData.caseNumber,
          messageCount: messages.length,
        },
      },
    }).catch(() => {}); // Fire and forget

    return NextResponse.json({
      messages,
      case: {
        id: caseData.id,
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        patient: caseData.user,
        clinician: caseData.assignedClinician,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}

// POST - Send a new message
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
        caseNumber: true,
        status: true,
        user: { select: { id: true, name: true, email: true } },
        assignedClinician: { select: { id: true, name: true, email: true } },
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

    // For patients, only allow messaging if case has an assigned clinician
    if (isPatient && !caseData.assignedClinicianId) {
      return NextResponse.json(
        { error: "Cannot send messages until a clinician is assigned to your case" },
        { status: 400 }
      );
    }

    // Parse form data (supports both JSON and multipart/form-data)
    const contentType = request.headers.get("content-type") || "";
    let content: string;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      content = formData.get("content") as string;
      files = formData.getAll("files") as File[];
    } else {
      const body = await request.json();
      content = body.content;
    }

    // Validate message content
    const validated = createMessageSchema.safeParse({ content });
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Ensure at least content or files are provided
    const hasContent = validated.data.content && validated.data.content.trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasContent && !hasFiles) {
      return NextResponse.json(
        { error: "Message must have content or attachments" },
        { status: 400 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        caseId,
        senderId: session.user.id,
        content: validated.data.content,
      },
    });

    // Handle file attachments if any
    const uploadedAttachments = [];
    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        continue;
      }

      // Generate unique filename
      const ext = file.name.split(".").pop();
      const uniqueFileName = `${randomUUID()}.${ext}`;

      // Create uploads directory
      const uploadsDir = join(
        process.cwd(),
        "uploads",
        "messages",
        caseId,
        message.id
      );
      await mkdir(uploadsDir, { recursive: true });

      // Save file to disk
      const filePath = join(uploadsDir, uniqueFileName);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create attachment record
      const attachment = await prisma.messageAttachment.create({
        data: {
          messageId: message.id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storageKey: `messages/${caseId}/${message.id}/${uniqueFileName}`,
        },
      });

      uploadedAttachments.push(attachment);
    }

    // Fetch the complete message with sender and attachments
    const completeMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
        attachments: true,
      },
    });

    // Log the message send for HIPAA compliance (non-blocking)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SEND_MESSAGE",
        resource: "message",
        resourceId: message.id,
        metadata: {
          caseId,
          caseNumber: caseData.caseNumber,
          attachmentCount: uploadedAttachments.length,
        },
      },
    }).catch(() => {}); // Fire and forget

    // TODO: Send email notification to recipient
    // This can be done async to not block the response

    return NextResponse.json({ message: completeMessage }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
