"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageList, MessageInput } from "@/components/inbox";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string | null;
    role: string;
  };
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageKey: string;
  }[];
}

interface CaseInfo {
  id: string;
  caseNumber: string;
  title: string | null;
  patient: { id: string; name: string | null };
  clinician: { id: string; name: string | null } | null;
}

export default function ClinicianInboxPage() {
  const { data: session } = useSession();
  const params = useParams();
  const caseId = params.id as string;
  const t = useTranslations("inbox");

  const [messages, setMessages] = useState<Message[]>([]);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasMarkedReadRef = useRef(false);

  const fetchMessages = useCallback(async (markAsRead = false) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/messages`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.messages);
      setCaseInfo(data.case);

      // Only mark messages as read once on initial load
      if (markAsRead && !hasMarkedReadRef.current) {
        hasMarkedReadRef.current = true;
        fetch(`/api/cases/${caseId}/messages/mark-read`, {
          method: "POST",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Poll for new messages every 60 seconds (reduced from 30)
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(false), 60000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
        <p className="text-rose-200">{error}</p>
        <Link href="/clinician/cases" className="btn btnSecondary mt-4">
          Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/clinician/cases" className="hover:text-slate-200">
              My Cases
            </Link>
            <span>/</span>
            <Link
              href={`/clinician/cases/${caseId}`}
              className="hover:text-slate-200"
            >
              {caseInfo?.caseNumber}
            </Link>
            <span>/</span>
            <span className="text-slate-200">{t("title")}</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-50 mt-1">
            {t("title")} - {caseInfo?.title || caseInfo?.caseNumber}
          </h1>
        </div>
        {caseInfo?.patient && (
          <div className="text-sm text-slate-400">
            {t("patient")}: <span className="text-sky-400">{caseInfo.patient.name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col bg-white/5 rounded-xl border border-white/10 mt-4 overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={session?.user?.id || ""}
          caseId={caseId}
        />
        <MessageInput caseId={caseId} onMessageSent={fetchMessages} />
      </div>
    </div>
  );
}
