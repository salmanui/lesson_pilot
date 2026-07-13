"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMail, FiLock } from "react-icons/fi";
import InputField from "./InputField";
import SubmitButton from "./SubmitButton";
import { validateLogin } from "@/src/utils/auth/validators";

const INITIAL = { identifier: "", password: "" };

export default function LoginForm({ onSubmit, loading }) {
  const [fields, setFields] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);

  const update = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateLogin(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit({ ...fields, remember });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <InputField
        label="Email or phone"
        name="identifier"
        icon={FiMail}
        value={fields.identifier}
        onChange={update}
        error={errors.identifier}
        placeholder="you@school.edu"
        autoComplete="username"
        disabled={loading}
      />

      <InputField
        label="Password"
        name="password"
        type="password"
        icon={FiLock}
        value={fields.password}
        onChange={update}
        error={errors.password}
        placeholder="Enter your password"
        autoComplete="current-password"
        disabled={loading}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Remember me
        </label>
        <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Forgot password?
        </Link>
      </div>

      <SubmitButton loading={loading}>Sign in</SubmitButton>
    </form>
  );
}
