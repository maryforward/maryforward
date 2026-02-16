import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trialId } = await params;

    const savedTrial = await prisma.savedTrial.findUnique({
      where: {
        userId_trialId: {
          userId: session.user.id,
          trialId,
        },
      },
    });

    if (!savedTrial) {
      return NextResponse.json({ error: "Saved trial not found" }, { status: 404 });
    }

    await prisma.savedTrial.delete({
      where: {
        userId_trialId: {
          userId: session.user.id,
          trialId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved trial error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
