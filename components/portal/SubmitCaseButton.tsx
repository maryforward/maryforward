"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface SubmitCaseButtonProps {
  caseId: string;
}

export function SubmitCaseButton({ caseId }: SubmitCaseButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/submit`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to submit case");
      }
    } catch {
      alert("Failed to submit case");
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="glass p-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-2">
          Submit Case for Review?
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Once submitted, your case will be reviewed by our medical team. You won&apos;t be able to edit the case details after submission.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Yes, Submit for Review
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6 border-2 border-dashed border-sky-400/30 bg-sky-500/5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-sky-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-50">
            Ready to Submit?
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            When you&apos;re finished adding all your information and documents, submit your case for review by our medical team.
          </p>
          <Button
            onClick={() => setShowConfirm(true)}
            className="mt-4"
          >
            Submit for Review
          </Button>
        </div>
      </div>
    </div>
  );
}
