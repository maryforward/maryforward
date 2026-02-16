"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
}

const roles = [
  {
    value: "PATIENT",
    label: "Patient or Family Member",
    description: "Get personalized decision support for complex medical decisions",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    value: "CLINICIAN",
    label: "Healthcare Provider",
    description: "Review cases and provide expert decision support to patients",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

export function RoleSelectionModal({ isOpen, onClose, mode }: RoleSelectionModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleRoleSelect = (role: string) => {
    const path = mode === "login" ? "/login" : "/signup";
    router.push(`${path}?role=${role}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-50">
              {mode === "login" ? "Log in as..." : "Sign up as..."}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => handleRoleSelect(role.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-sky-400/50 hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-sky-500/20 p-3 text-sky-400">
                    {role.icon}
                  </div>
                  <div>
                    <p className="font-medium text-slate-50">{role.label}</p>
                    <p className="text-sm text-slate-400">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const event = new CustomEvent("openAuthModal", { detail: { mode: "signup" } });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  className="text-sky-400 hover:text-sky-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const event = new CustomEvent("openAuthModal", { detail: { mode: "login" } });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  className="text-sky-400 hover:text-sky-300"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
