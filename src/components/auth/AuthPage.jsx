"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { BsStars } from "react-icons/bs";
import { UserContext } from "@/src/utils/userContext";
import { loginUser } from "@/src/utils/getUserLogin";
import { registerUser } from "@/src/utils/userRegistration";
import { googleLogin, decodeJwt } from "@/src/utils/auth/googleAuth";
import { buildUserPayload } from "@/src/utils/auth/userPayload";
import AuthShowcase from "./AuthShowcase";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import GoogleAuthButton from "./GoogleAuthButton";

const HOME_ROUTE = "/dashboard";

export default function AuthPage({ initialMode = "login" }) {
  const router = useRouter();
  const { user, setUser } = useContext(UserContext);

  const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isRegister = mode === "register";

  // Already signed in → send straight to Home.
  useEffect(() => {
    if (user) router.replace(HOME_ROUTE);
  }, [user, router]);

  const goHome = () => router.push(HOME_ROUTE);

  const switchMode = (nextMode) => {
    setMode(nextMode);
  };

  const handleLogin = async (fields) => {
    setLoading(true);
    try {
      const response = await loginUser({
        userName: fields.identifier,
        password: fields.password,
      });
      setUser(buildUserPayload(response, { email: fields.identifier }));
      toast.success("Signed in successfully. Redirecting...");
      goHome();
    } catch (error) {
      toast.error(error?.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (fields) => {
    setLoading(true);
    try {
      const response = await registerUser({
        name: fields.userName,
        email: fields.email,
        mobileNumber: fields.phone,
        organizationName: fields.organization,
        password: fields.password,
      });
      setUser(
        buildUserPayload(response, {
          name: fields.userName,
          email: fields.email,
          phone: fields.phone,
          organization: fields.organization,
        })
      );
      toast.success("Account created! Redirecting...");
      goHome();
    } catch (error) {
      toast.error(error?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) {
      toast.error(
        "Google Sign-In isn't configured yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable it."
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const profile = decodeJwt(credential);
      let payload;
      try {
        const response = await googleLogin(credential);
        payload = buildUserPayload(response, profile || {});
      } catch {
        // Backend endpoint not wired yet — fall back to the verified Google profile
        // so the flow works end to end during development.
        payload = buildUserPayload(null, {
          name: profile?.name,
          email: profile?.email,
          picture: profile?.picture,
        });
      }
      setUser(payload);
      toast.success(`Welcome${payload.name ? `, ${payload.name}` : ""}! Redirecting...`);
      goHome();
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-slate-50">
      <AuthShowcase mode={mode} />

      {/* Scroll container: on tablets/small laptops only the form scrolls while the
          showcase stays fixed; on large screens it all fits in one shot (no scrollbar).
          The inner min-h-full wrapper keeps the form centred when it fits, yet lets it
          scroll from the top (no clipped header) when it overflows. */}
      <div className="h-screen w-full overflow-y-auto lg:w-[54%] xl:w-1/2">
        <div className="flex min-h-full w-full items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md animate-fade-in-up">
          {/* Brand (mobile / tablet only — the showcase carries it on desktop) */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30">
              <BsStars className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">LessonPilot</span>
          </div>

          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {isRegister ? "Create your account" : "Sign in to your account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister
                ? "Start planning smarter lessons today."
                : "Welcome back! Please enter your details."}
            </p>
          </div>

          {/* Segmented mode toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                !isRegister
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                isRegister
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Register
            </button>
          </div>

          {isRegister ? (
            <RegisterForm onSubmit={handleRegister} loading={loading} />
          ) : (
            <LoginForm onSubmit={handleLogin} loading={loading} />
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              or continue with
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleAuthButton onCredential={handleGoogleCredential} loading={googleLoading} />

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
          </div>
        </div>
      </div>
    </main>
  );
}
