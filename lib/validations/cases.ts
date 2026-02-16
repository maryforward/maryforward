import { z } from "zod";

export const caseTypeSchema = z.enum(["ONCOLOGY", "INFECTIOUS_DISEASE", "OTHER"]);

export const createCaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  caseType: caseTypeSchema,
});

export const patientIntakeSchema = z.object({
  // Personal Information
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  phone: z.string().optional(),

  // Medical Information
  primaryDiagnosis: z.string().max(500).optional(),
  symptoms: z.string().max(2000).optional(),
  symptomDuration: z.string().max(200).optional(),
  symptomSeverity: z.enum(["mild", "moderate", "severe"]).optional(),

  // Medical History
  medicalHistory: z.string().max(3000).optional(),
  familyHistory: z.string().max(2000).optional(),
  previousTreatments: z.string().max(2000).optional(),

  // Current Treatment
  currentMedications: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
  currentProviders: z.string().max(1000).optional(),

  // Goals
  primaryGoals: z.string().max(2000).optional(),
  additionalNotes: z.string().max(3000).optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  caseType: caseTypeSchema.optional(),
  primaryDiagnosis: z.string().max(500).optional(),
  symptoms: z.string().max(2000).optional(),
  currentMedications: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
  medicalHistory: z.string().max(3000).optional(),
  intakeData: z.record(z.string(), z.unknown()).optional(),
});

export type CaseType = z.infer<typeof caseTypeSchema>;
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type PatientIntakeInput = z.infer<typeof patientIntakeSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
