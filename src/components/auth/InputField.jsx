"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

/**
 * Reusable labeled input with an optional leading icon, inline error state,
 * and a built-in show/hide toggle for password fields.
 */
export default function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  icon: Icon,
  placeholder,
  autoComplete,
  required,
  disabled,
  children,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className={`group relative flex items-center rounded-xl border bg-white transition ${
          error
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100"
            : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100"
        }`}
      >
        {Icon && (
          <span
            className={`pl-3.5 ${
              error ? "text-red-400" : "text-slate-400 group-focus-within:text-indigo-500"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}

        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className="w-full rounded-xl bg-transparent px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((prev) => !prev)}
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
            className="pr-3.5 text-slate-400 transition hover:text-slate-600"
          >
            {show ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        )}
      </div>

      {children}

      {error && (
        <p id={`${name}-error`} className="mt-1.5 animate-fade-in text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
