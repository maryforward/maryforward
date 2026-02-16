import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const saveTrialSchema = z.object({
  trialId: z.string().min(1),
  trialTitle: z.string().min(1),
  trialData: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedTrials = await prisma.savedTrial.findMany({
      where: { userId: session.user.id },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({ trials: savedTrials });
  } catch (error) {
    console.error("Get saved trials error:", error);
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
    const validated = saveTrialSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Check if already saved
    const existing = await prisma.savedTrial.findUnique({
      where: {
        userId_trialId: {
          userId: session.user.id,
          trialId: validated.data.trialId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Trial already saved" },
        { status: 409 }
      );
    }

    const savedTrial = await prisma.savedTrial.create({
      data: {
        userId: session.user.id,
        trialId: validated.data.trialId,
        trialTitle: validated.data.trialTitle,
        trialData: (validated.data.trialData || {}) as object,
        notes: validated.data.notes,
      },
    });

    return NextResponse.json({ success: true, trial: savedTrial }, { status: 201 });
  } catch (error) {
    console.error("Save trial error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
