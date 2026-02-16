"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";

interface SavedTrialCardProps {
  id: string;
  trialId: string;
  trialTitle: string;
  trialData: Record<string, unknown> | null;
  notes: string | null;
  savedAt: Date;
}

export function SavedTrialCard({
  trialId,
  trialTitle,
  trialData,
  notes,
  savedAt,
}: SavedTrialCardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Remove this trial from your saved list?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trials/saved/${trialId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove trial");
      }

      addToast("Trial removed from saved list", "success");
      router.refresh();
    } catch {
      addToast("Failed to remove trial", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const phase = trialData?.phase as string | undefined;
  const status = trialData?.status as string | undefined;
  const location = trialData?.location as string | undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-sky-400">{trialId}</span>
        <button
          onClick={handleRemove}
          disabled={isDeleting}
          className="text-slate-400 hover:text-red-400 transition-colors"
          title="Remove from saved"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <h3 className="mt-2 font-medium text-slate-50 line-clamp-2">{trialTitle}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {phase && (
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs text-violet-300">
            {phase}
          </span>
        )}
        {status && (
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300">
            {status}
          </span>
        )}
      </div>

      {location && (
        <p className="mt-2 text-sm text-slate-400 truncate">{location}</p>
      )}

      {notes && (
        <p className="mt-2 text-sm text-slate-300 line-clamp-2">{notes}</p>
      )}

      <p className="mt-3 text-xs text-slate-500">Saved {formatDate(savedAt)}</p>
    </div>
  );
}
