"use client";

import { useState } from "react";
import { FiUser, FiMail, FiPhone, FiBriefcase, FiLock } from "react-icons/fi";
import InputField from "./InputField";
import SubmitButton from "./SubmitButton";
import PasswordStrength from "./PasswordStrength";
import { validateRegister } from "@/src/utils/auth/validators";

const INITIAL = {
  userName: "",
  email: "",
  phone: "",
  organization: "",
  password: "",
};

export default function RegisterForm({ onSubmit, loading }) {
  const [fields, setFields] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const update = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateRegister(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit(fields);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <InputField
        label="Email ID"
        name="email"
        type="email"
        icon={FiMail}
        value={fields.email}
        onChange={update}
        error={errors.email}
        placeholder="you@school.edu"
        autoComplete="email"
        disabled={loading}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="User name"
          name="userName"
          icon={FiUser}
          value={fields.userName}
          onChange={update}
          error={errors.userName}
          placeholder="Jane Doe"
          autoComplete="name"
          disabled={loading}
        />

        <InputField
          label="Phone number"
          name="phone"
          type="tel"
          icon={FiPhone}
          value={fields.phone}
          onChange={update}
          error={errors.phone}
          placeholder="+1 555 000 1234"
          autoComplete="tel"
          disabled={loading}
        />
      </div>

      <InputField
        label="School / organization"
        name="organization"
        icon={FiBriefcase}
        value={fields.organization}
        onChange={update}
        error={errors.organization}
        placeholder="Springfield High School"
        autoComplete="organization"
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
        placeholder="Create a strong password"
        autoComplete="new-password"
        disabled={loading}
      >
        <PasswordStrength password={fields.password} />
      </InputField>

      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
  );
}
