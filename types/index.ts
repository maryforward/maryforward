export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "EXPERT_REVIEW"
  | "COMPLETED"
  | "ARCHIVED";

export type CaseType = "ONCOLOGY" | "INFECTIOUS_DISEASE" | "OTHER";

export type UserRole = "PATIENT" | "CLINICIAN" | "ADMIN";

export interface CaseWithRelations {
  id: string;
  caseNumber: string;
  title: string | null;
  caseType: CaseType;
  status: CaseStatus;
  primaryDiagnosis: string | null;
  symptoms: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  documents: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedAt: Date;
  }[];
  reports: {
    id: string;
    reportType: string;
    createdAt: Date;
  }[];
}

export interface SavedTrialWithData {
  id: string;
  trialId: string;
  trialTitle: string;
  trialData: Record<string, unknown> | null;
  notes: string | null;
  savedAt: Date;
}

export interface DashboardStats {
  totalCases: number;
  draftCases: number;
  activeCases: number;
  completedCases: number;
  savedTrials: number;
}
