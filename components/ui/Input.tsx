"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-slate-50 placeholder-slate-400 outline-none transition-colors focus:border-sky-400/50 focus:bg-white/10 ${
            error ? "border-red-400/50" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
