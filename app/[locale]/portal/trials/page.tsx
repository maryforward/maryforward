import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { SavedTrialCard } from "@/components/portal/SavedTrialCard";

async function getSavedTrials(userId: string) {
  return prisma.savedTrial.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
  });
}

export default async function PortalTrialsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const savedTrials = await getSavedTrials(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">Saved Trials</h1>
          <p className="muted mt-2">
            Clinical trials you&apos;ve bookmarked for reference.
          </p>
        </div>
        <Link href="/trials" className="btn btnPrimary">
          Browse Trials
        </Link>
      </div>

      {savedTrials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-slate-200">No saved trials</h3>
          <p className="mt-2 text-slate-400">
            Browse clinical trials and save ones that might be relevant for your case.
          </p>
          <Link href="/trials" className="btn btnPrimary mt-6 inline-flex">
            Browse clinical trials
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedTrials.map((trial) => (
            <SavedTrialCard
              key={trial.id}
              id={trial.id}
              trialId={trial.trialId}
              trialTitle={trial.trialTitle}
              trialData={trial.trialData as Record<string, unknown> | null}
              notes={trial.notes}
              savedAt={trial.savedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
