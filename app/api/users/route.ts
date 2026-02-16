import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";
import { z } from "zod";

// Extended schema for registration with role
const registerSchema = signupSchema.extend({
  role: z.enum(["PATIENT", "CLINICIAN"]).default("PATIENT"),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  institution: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password, role, specialty, licenseNumber, institution } =
      validated.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Patients are auto-approved, clinicians need admin approval
    const isApproved = role === "PATIENT";

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        passwordHash,
        role,
        isApproved,
        // Clinician-specific fields
        ...(role === "CLINICIAN" && {
          specialty,
          licenseNumber,
          institution,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
