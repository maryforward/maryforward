"use client";

import { ReactNode } from "react";

interface AlertProps {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}

export function Alert({ children, variant = "info", className = "" }: AlertProps) {
  const variants = {
    info: "border-sky-400/30 bg-sky-500/10 text-sky-200",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    error: "border-red-400/30 bg-red-500/10 text-red-200",
  };

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
