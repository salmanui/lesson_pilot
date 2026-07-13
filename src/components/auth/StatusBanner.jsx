"use client";

import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";

/**
 * Inline success / error banner shown above the auth forms.
 */
export default function StatusBanner({ type, message }) {
  if (!message) return null;

  const success = type === "success";
  const Icon = success ? FiCheckCircle : FiAlertCircle;

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm animate-fade-in ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
