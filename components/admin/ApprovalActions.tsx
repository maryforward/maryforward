"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface ApprovalActionsProps {
  clinicianId: string;
  clinicianName: string;
}

export function ApprovalActions({ clinicianId, clinicianName }: ApprovalActionsProps) {
  const router = useRouter();
  const t = useTranslations("admin.approvals");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    if (!confirm(t("approveConfirm", { name: clinicianName }))) {
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch(`/api/admin/approvals/${clinicianId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve clinician");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to approve clinician:", error);
      alert(error instanceof Error ? error.message : "Failed to approve clinician");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(t("rejectConfirm", { name: clinicianName }))) {
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/admin/approvals/${clinicianId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject clinician");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to reject clinician:", error);
      alert(error instanceof Error ? error.message : "Failed to reject clinician");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        isLoading={isApproving}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        {t("approve")}
      </Button>
      <Button
        variant="outline"
        onClick={handleReject}
        isLoading={isRejecting}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
      >
        {t("reject")}
      </Button>
    </div>
  );
}
