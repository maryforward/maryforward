"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AssignCaseButtonProps {
  caseId: string;
}

export function AssignCaseButton({ caseId }: AssignCaseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAssign = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/assign`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign case");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to assign case:", error);
      alert(error instanceof Error ? error.message : "Failed to assign case");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAssign}
      isLoading={isLoading}
      className="bg-gradient-to-r from-emerald-500 to-teal-500"
    >
      Assign to Me
    </Button>
  );
}
