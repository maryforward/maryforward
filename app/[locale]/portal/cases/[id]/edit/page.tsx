import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatientIntakeForm } from "@/components/forms/PatientIntakeForm";

async function getCase(id: string, userId: string) {
  return prisma.case.findFirst({
    where: { id, userId },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { id } = await params;
  const caseData = await getCase(id, session.user.id);

  if (!caseData) {
    notFound();
  }

  // Only allow editing draft cases
  if (caseData.status !== "DRAFT") {
    redirect(`/portal/cases/${id}`);
  }

  // Parse intakeData if it exists
  const intakeData = caseData.intakeData as Record<string, string> | null;

  const initialData = {
    id: caseData.id,
    title: caseData.title || "",
    caseType: caseData.caseType as "ONCOLOGY" | "INFECTIOUS_DISEASE" | "OTHER",
    primaryDiagnosis: caseData.primaryDiagnosis || "",
    symptoms: caseData.symptoms || "",
    symptomDuration: intakeData?.symptomDuration || "",
    medicalHistory: caseData.medicalHistory || "",
    familyHistory: intakeData?.familyHistory || "",
    previousTreatments: intakeData?.previousTreatments || "",
    currentMedications: caseData.currentMedications || "",
    allergies: caseData.allergies || "",
    currentProviders: intakeData?.currentProviders || "",
    primaryGoals: intakeData?.primaryGoals || "",
    additionalNotes: intakeData?.additionalNotes || "",
  };

  const existingDocuments = caseData.documents.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/portal/cases/${id}`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          &larr; Back to case
        </Link>
        <h1 className="h1 mt-2">Edit Case</h1>
        <p className="muted mt-2">
          Update your case information. Changes are saved when you submit.
        </p>
      </div>

      <PatientIntakeForm
        mode="edit"
        initialData={initialData}
        existingDocuments={existingDocuments}
      />
    </div>
  );
}
