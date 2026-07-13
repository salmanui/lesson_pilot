"use client";

import { getPasswordStrength } from "@/src/utils/auth/validators";

const BAR_COLORS = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-lime-500",
  "bg-emerald-500",
];
const TEXT_COLORS = [
  "text-red-500",
  "text-orange-500",
  "text-amber-600",
  "text-lime-600",
  "text-emerald-600",
];

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-2 animate-fade-in">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < score ? BAR_COLORS[score] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${TEXT_COLORS[score]}`}>
        Password strength: {label}
      </p>
    </div>
  );
}
