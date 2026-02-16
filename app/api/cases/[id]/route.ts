import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCaseSchema } from "@/lib/validations/cases";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const caseData = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        reports: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: caseData });
  } catch (error) {
    console.error("Get case error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Only allow editing draft cases
    if (existingCase.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft cases can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = updateCaseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { intakeData, ...rest } = validated.data;
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        ...rest,
        ...(intakeData !== undefined && { intakeData: intakeData as object }),
      },
    });

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error) {
    console.error("Update case error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Only allow deleting draft cases
    if (existingCase.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft cases can be deleted" },
        { status: 400 }
      );
    }

    await prisma.case.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete case error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
