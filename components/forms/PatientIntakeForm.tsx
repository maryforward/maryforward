"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/providers/ToastProvider";

const steps = [
  { id: 1, title: "Case Type", description: "Select the type of case" },
  { id: 2, title: "Diagnosis", description: "Current diagnosis and symptoms" },
  { id: 3, title: "History", description: "Medical history and treatments" },
  { id: 4, title: "Medications", description: "Current medications and allergies" },
  { id: 5, title: "Documents", description: "Upload medical records and test results" },
  { id: 6, title: "Goals", description: "Your questions and goals" },
  { id: 7, title: "Review", description: "Review and submit" },
];

const caseTypes = [
  {
    value: "ONCOLOGY",
    label: "Oncology",
    description: "Cancer diagnosis, treatment options, clinical trials",
  },
  {
    value: "INFECTIOUS_DISEASE",
    label: "Infectious Disease",
    description: "Complex infections, resistant organisms, treatment decisions",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Other complex medical decisions",
  },
];

interface FormData {
  id?: string;
  title: string;
  caseType: "ONCOLOGY" | "INFECTIOUS_DISEASE" | "OTHER";
  primaryDiagnosis: string;
  symptoms: string;
  symptomDuration: string;
  medicalHistory: string;
  familyHistory: string;
  previousTreatments: string;
  currentMedications: string;
  allergies: string;
  currentProviders: string;
  primaryGoals: string;
  additionalNotes: string;
}

interface ExistingDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface PatientIntakeFormProps {
  mode?: "create" | "edit";
  initialData?: FormData;
  existingDocuments?: ExistingDocument[];
}

const documentCategories = [
  { label: "Lab Results", icon: "🔬", accept: ".pdf,.jpg,.jpeg,.png" },
  { label: "Imaging/Scans", icon: "📷", accept: ".pdf,.jpg,.jpeg,.png,.dcm" },
  { label: "Pathology Reports", icon: "🔎", accept: ".pdf,.doc,.docx" },
  { label: "Genetic Test Results", icon: "🧬", accept: ".pdf,.doc,.docx,.txt" },
  { label: "Physician Notes", icon: "📋", accept: ".pdf,.doc,.docx" },
  { label: "Other Documents", icon: "📄", accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" },
];

export function PatientIntakeForm({
  mode = "create",
  initialData,
  existingDocuments = [],
}: PatientIntakeFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>(
    initialData || {
      title: "",
      caseType: "ONCOLOGY",
      primaryDiagnosis: "",
      symptoms: "",
      symptomDuration: "",
      medicalHistory: "",
      familyHistory: "",
      previousTreatments: "",
      currentMedications: "",
      allergies: "",
      currentProviders: "",
      primaryGoals: "",
      additionalNotes: "",
    }
  );

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<ExistingDocument[]>(existingDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCaseTypeSelect = (type: "ONCOLOGY" | "INFECTIOUS_DISEASE" | "OTHER") => {
    setFormData((prev) => ({ ...prev, caseType: type }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // File handling functions
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedDoc = async (docId: string, caseId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/documents?documentId=${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
        addToast("Document removed", "success");
      }
    } catch {
      addToast("Failed to remove document", "error");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.includes("word")) return "📝";
    return "📎";
  };

  const uploadFiles = async (caseId: string) => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const formDataObj = new FormData();
    pendingFiles.forEach((file) => {
      formDataObj.append("files", file);
    });

    try {
      const response = await fetch(`/api/cases/${caseId}/documents`, {
        method: "POST",
        body: formDataObj,
      });

      if (response.ok) {
        const { documents } = await response.json();
        setUploadedDocs((prev) => [...prev, ...documents]);
        setPendingFiles([]);
        addToast(`${documents.length} file(s) uploaded`, "success");
      }
    } catch {
      addToast("Failed to upload files", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      let caseId = formData.id;

      if (mode === "create") {
        // Create the case
        const createResponse = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title || `${formData.caseType} Case`,
            caseType: formData.caseType,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create case");
        }

        const { case: newCase } = await createResponse.json();
        caseId = newCase.id;
      }

      // Update with intake data
      const updateResponse = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title || `${formData.caseType} Case`,
          primaryDiagnosis: formData.primaryDiagnosis,
          symptoms: formData.symptoms,
          medicalHistory: formData.medicalHistory,
          currentMedications: formData.currentMedications,
          allergies: formData.allergies,
          intakeData: {
            symptomDuration: formData.symptomDuration,
            familyHistory: formData.familyHistory,
            previousTreatments: formData.previousTreatments,
            currentProviders: formData.currentProviders,
            primaryGoals: formData.primaryGoals,
            additionalNotes: formData.additionalNotes,
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to save case details");
      }

      // Upload any pending files
      if (pendingFiles.length > 0 && caseId) {
        await uploadFiles(caseId);
      }

      addToast(mode === "create" ? "Case created successfully!" : "Case updated successfully!", "success");
      router.push(`/portal/cases/${caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save case");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              label="Case Title (optional)"
              name="title"
              placeholder="e.g., Second opinion for lung cancer treatment"
              value={formData.title}
              onChange={handleChange}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                What type of case is this?
              </label>
              <div className="grid gap-3">
                {caseTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleCaseTypeSelect(type.value as FormData["caseType"])}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      formData.caseType === type.value
                        ? "border-sky-400 bg-sky-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <p className="font-medium text-slate-50">{type.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Input
              label="Primary Diagnosis"
              name="primaryDiagnosis"
              placeholder="e.g., Stage IIIA non-small cell lung cancer"
              value={formData.primaryDiagnosis}
              onChange={handleChange}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Current Symptoms
              </label>
              <textarea
                name="symptoms"
                placeholder="Describe your current symptoms..."
                value={formData.symptoms}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <Input
              label="How long have you had these symptoms?"
              name="symptomDuration"
              placeholder="e.g., 3 months"
              value={formData.symptomDuration}
              onChange={handleChange}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Medical History
              </label>
              <textarea
                name="medicalHistory"
                placeholder="Include previous diagnoses, surgeries, hospitalizations..."
                value={formData.medicalHistory}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Family History
              </label>
              <textarea
                name="familyHistory"
                placeholder="Relevant family medical history..."
                value={formData.familyHistory}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Previous Treatments
              </label>
              <textarea
                name="previousTreatments"
                placeholder="Treatments you've already tried for this condition..."
                value={formData.previousTreatments}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Current Medications
              </label>
              <textarea
                name="currentMedications"
                placeholder="List all current medications with dosages..."
                value={formData.currentMedications}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Allergies
              </label>
              <textarea
                name="allergies"
                placeholder="Drug allergies, food allergies, other allergies..."
                value={formData.allergies}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <Input
              label="Current Healthcare Providers"
              name="currentProviders"
              placeholder="e.g., Dr. Smith (oncologist), Dr. Jones (primary care)"
              value={formData.currentProviders}
              onChange={handleChange}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Alert variant="info">
              Upload any medical documents that may help our team provide better decision support.
              Accepted formats: PDF, images (JPG, PNG), Word documents.
            </Alert>

            {/* Document categories */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {documentCategories.map((cat) => (
                <div
                  key={cat.label}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-center"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="mt-1 text-xs text-slate-400">{cat.label}</p>
                </div>
              ))}
            </div>

            {/* Drag and drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? "border-sky-400 bg-sky-500/10"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-white/10 p-4">
                  <svg
                    className="h-8 w-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-200">
                    Drag and drop files here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Max file size: 25MB per file
                  </p>
                </div>
              </div>
            </div>

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-3">
                  Files to upload ({pendingFiles.length})
                </h4>
                <div className="space-y-2">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getFileIcon(file.type)}</span>
                        <div>
                          <p className="text-sm text-slate-200 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingFile(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already uploaded documents */}
            {uploadedDocs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-3">
                  Uploaded documents ({uploadedDocs.length})
                </h4>
                <div className="space-y-2">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getFileIcon(doc.fileType)}</span>
                        <div>
                          <p className="text-sm text-slate-200 truncate max-w-xs">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(doc.fileSize)} - Uploaded
                          </p>
                        </div>
                      </div>
                      {formData.id && (
                        <button
                          type="button"
                          onClick={() => removeUploadedDoc(doc.id, formData.id!)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload now button for edit mode */}
            {mode === "edit" && pendingFiles.length > 0 && formData.id && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => uploadFiles(formData.id!)}
                isLoading={isUploading}
                className="w-full"
              >
                Upload {pendingFiles.length} file(s) now
              </Button>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                What are your primary goals or questions?
              </label>
              <textarea
                name="primaryGoals"
                placeholder="What decisions do you need help with? What questions do you have?"
                value={formData.primaryGoals}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Additional Notes
              </label>
              <textarea
                name="additionalNotes"
                placeholder="Anything else we should know..."
                value={formData.additionalNotes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 resize-none"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <Alert variant="info">
              Review your information below. You can go back to edit any section.
            </Alert>

            <div className="space-y-4">
              <ReviewSection title="Case Type" value={formData.caseType.replace(/_/g, " ")} />
              <ReviewSection title="Title" value={formData.title || "Not specified"} />
              <ReviewSection title="Primary Diagnosis" value={formData.primaryDiagnosis || "Not specified"} />
              <ReviewSection title="Symptoms" value={formData.symptoms || "Not specified"} />
              <ReviewSection title="Medical History" value={formData.medicalHistory || "Not specified"} />
              <ReviewSection title="Current Medications" value={formData.currentMedications || "Not specified"} />
              <ReviewSection title="Allergies" value={formData.allergies || "Not specified"} />
              <ReviewSection title="Goals" value={formData.primaryGoals || "Not specified"} />

              {/* Documents summary */}
              <div className="rounded-lg border border-white/10 p-4">
                <dt className="text-sm font-medium text-slate-400">Documents</dt>
                <dd className="mt-1 text-slate-200">
                  {uploadedDocs.length + pendingFiles.length > 0 ? (
                    <span>
                      {uploadedDocs.length} uploaded, {pendingFiles.length} pending upload
                    </span>
                  ) : (
                    "No documents attached"
                  )}
                </dd>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                currentStep >= step.id
                  ? "bg-sky-500 text-white"
                  : "bg-white/10 text-slate-400 hover:bg-white/20"
              }`}
            >
              {step.id}
            </button>
            {index < steps.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-4 sm:mx-2 sm:w-8 ${
                  currentStep > step.id ? "bg-sky-500" : "bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-50">
          {steps[currentStep - 1].title}
        </h2>
        <p className="text-sm text-slate-400">
          {steps[currentStep - 1].description}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Step content */}
      <div className="glass p-6">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        {currentStep < steps.length ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {mode === "create" ? "Create Case" : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <dt className="text-sm font-medium text-slate-400">{title}</dt>
      <dd className="mt-1 text-slate-200 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
