"use client";

import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/utils";
import { AttachmentPreview } from "./AttachmentPreview";

interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  createdAt: Date | string;
  sender: {
    id: string;
    name: string | null;
    role: string;
  };
  attachments: MessageAttachment[];
  isOwnMessage: boolean;
  caseId: string;
}

export function MessageBubble({
  content,
  createdAt,
  sender,
  attachments,
  isOwnMessage,
  caseId,
}: MessageBubbleProps) {
  const t = useTranslations("inbox");

  const senderName = isOwnMessage
    ? t("you")
    : sender.name || (sender.role === "CLINICIAN" ? t("clinician") : t("patient"));

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] sm:max-w-[70%] ${
          isOwnMessage
            ? "bg-gradient-to-r from-sky-500/20 to-violet-500/20 border-sky-500/30"
            : "bg-white/5 border-white/10"
        } rounded-2xl border p-4`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-medium ${
              isOwnMessage ? "text-sky-300" : "text-slate-400"
            }`}
          >
            {senderName}
          </span>
          {sender.role === "CLINICIAN" && !isOwnMessage && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              {t("clinician")}
            </span>
          )}
        </div>

        <p className="text-slate-200 whitespace-pre-wrap break-words">
          {content}
        </p>

        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                caseId={caseId}
              />
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-500 mt-2">
          {formatDateTime(new Date(createdAt))}
        </p>
      </div>
    </div>
  );
}
