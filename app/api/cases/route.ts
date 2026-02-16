import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCaseSchema } from "@/lib/validations/cases";
import { generateCaseNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const cases = await prisma.case.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status: status as never }),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        caseType: true,
        status: true,
        primaryDiagnosis: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Get cases error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCaseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const caseData = await prisma.case.create({
      data: {
        userId: session.user.id,
        caseNumber: generateCaseNumber(),
        title: validated.data.title,
        caseType: validated.data.caseType,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ success: true, case: caseData }, { status: 201 });
  } catch (error) {
    console.error("Create case error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
