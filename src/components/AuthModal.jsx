"use client";

import React, { useContext, useMemo, useState } from "react";
import { UserContext } from "../utils/userContext";
import { loginUser } from "../utils/getUserLogin";
import { registerUser } from "../utils/userRegistration";
import { buildUserPayload } from "../utils/auth/userPayload";

const initialFields = {
  name: "",
  email: "",
  mobileNumber: "",
  organization: "",
  password: "",
};

export default function AuthModal() {
  const {
    isSignInModalOpen,
    closeSignInModal,
    authMode,
    setUser,
  } = useContext(UserContext);

  const [mode, setMode] = useState(authMode === "signup" ? "signup" : "login");
  const [fields, setFields] = useState(initialFields);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (mode === "signup") return "Create account";
    return "Sign in";
  }, [mode]);

  if (!isSignInModalOpen) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
  };

  const handleClose = () => {
    setMessage("");
    setLoading(false);
    closeSignInModal?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageTone("error");

    try {
      if (mode === "signup") {
        const response = await registerUser({
          email: fields.email,
          userName: fields.name,
          phoneNumber: fields.mobileNumber,
          schoolOrganization: fields.organization,
          password: fields.password,
        });
        // No session comes back — the account is inactive until an administrator
        // activates it, so drop the user on the sign-in form with the API's message.
        // setMode (not switchMode) keeps that message visible across the switch.
        setMessage(
          response?.message ||
            "Account created. You can sign in once an administrator activates it."
        );
        setMessageTone("info");
        setMode("login");
        return;
      }

      const response = await loginUser({
        emailOrPhone: fields.email || fields.mobileNumber,
        password: fields.password,
      });
      setUser(
        buildUserPayload(response, {
          email: fields.email,
          phone: fields.mobileNumber,
        })
      );
      handleClose();
    } catch (error) {
      setMessage(error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            aria-label="Close sign in modal"
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <input
              name="name"
              value={fields.name}
              onChange={updateField}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500"
              required
            />
          )}

          <input
            name="email"
            value={fields.email}
            onChange={updateField}
            placeholder="Email or username"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500"
            required={mode !== "signup"}
          />

          {mode === "signup" && (
            <>
              <input
                name="mobileNumber"
                value={fields.mobileNumber}
                onChange={updateField}
                placeholder="Mobile number"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500"
                required
              />
              <input
                name="organization"
                value={fields.organization}
                onChange={updateField}
                placeholder="School / organization"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500"
                required
              />
            </>
          )}

          <input
            name="password"
            type="password"
            value={fields.password}
            onChange={updateField}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500"
            required
          />
          {mode === "signup" && (
            <p className="text-xs text-slate-500">Use at least 8 characters.</p>
          )}

          {message && <p className="text-sm text-red-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Please wait..." : title}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
          {mode !== "login" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-semibold text-sky-700"
            >
              Sign in
            </button>
          )}
          {mode !== "signup" && (
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="font-semibold text-sky-700"
            >
              Create account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
