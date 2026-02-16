"use client";

import { useTranslations } from "next-intl";

interface AttachmentPreviewProps {
  attachment: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageKey: string;
  };
  caseId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType === "application/pdf") return "📄";
  if (fileType.includes("word")) return "📝";
  if (fileType === "text/plain") return "📃";
  return "📎";
}

export function AttachmentPreview({ attachment, caseId }: AttachmentPreviewProps) {
  const t = useTranslations("inbox");

  const handleDownload = async () => {
    // For now, we'll use the storage key to construct the download URL
    // In a production app, this would go through an API route for security
    const downloadUrl = `/api/cases/${caseId}/messages/attachments/${attachment.id}`;
    window.open(downloadUrl, "_blank");
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-3 w-full p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-start"
    >
      <span className="text-xl">{getFileIcon(attachment.fileType)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{attachment.fileName}</p>
        <p className="text-xs text-slate-500">{formatFileSize(attachment.fileSize)}</p>
      </div>
      <svg
        className="w-4 h-4 text-slate-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </button>
  );
}
