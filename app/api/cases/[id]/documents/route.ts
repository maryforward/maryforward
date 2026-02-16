import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Allowed file types
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

    // Verify case belongs to user
    const caseData = await prisma.case.findFirst({
      where: { id, userId: session.user.id },
      include: { documents: { orderBy: { uploadedAt: "desc" } } },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ documents: caseData.documents });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { error: "Failed to get documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify case belongs to user and is in draft status
    const caseData = await prisma.case.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseData.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot add documents to submitted cases" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        continue; // Skip invalid file types
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        continue; // Skip files that are too large
      }

      // Generate unique filename
      const ext = file.name.split(".").pop();
      const uniqueFileName = `${randomUUID()}.${ext}`;

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "uploads", "cases", id);
      await mkdir(uploadsDir, { recursive: true });

      // Save file to disk
      const filePath = join(uploadsDir, uniqueFileName);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create document record
      const document = await prisma.caseDocument.create({
        data: {
          caseId: id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storageKey: `cases/${id}/${uniqueFileName}`,
        },
      });

      uploadedDocuments.push(document);
    }

    // Log the upload for HIPAA compliance
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_CASE",
        resource: "case_document",
        resourceId: id,
        metadata: {
          type: "documents_uploaded",
          count: uploadedDocuments.length,
          fileNames: uploadedDocuments.map((d) => d.fileName),
        },
      },
    });

    return NextResponse.json({ documents: uploadedDocuments });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Verify case belongs to user
    const caseData = await prisma.case.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseData.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot delete documents from submitted cases" },
        { status: 400 }
      );
    }

    // Delete the document record
    await prisma.caseDocument.delete({
      where: { id: documentId, caseId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
