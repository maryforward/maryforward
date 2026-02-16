import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactFormSchema } from "@/lib/validations/forms";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = contactFormSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const session = await auth();

    const submission = await prisma.contactSubmission.create({
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        email: validated.data.email,
        category: validated.data.category,
        message: validated.data.message,
        userId: session?.user?.id ?? null,
      },
    });

    // TODO: Send notification email using Resend when configured
    // Example:
    // await resend.emails.send({
    //   from: 'MaryForward <noreply@maryforward.com>',
    //   to: process.env.NOTIFICATION_EMAIL,
    //   subject: `New Contact Form: ${validated.data.firstName} ${validated.data.lastName}`,
    //   text: `...`,
    // });

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
