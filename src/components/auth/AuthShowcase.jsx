"use client";

import { BsStars } from "react-icons/bs";
import { FiZap, FiClipboard, FiFileText, FiShield } from "react-icons/fi";
import Link from "next/link";

const FEATURES = [
  {
    icon: FiClipboard,
    title: "AI Lesson Plans",
    text: "Structured objectives, activities & assessments in seconds.",
  },
  {
    icon: FiFileText,
    title: "Smart Test Generator",
    text: "Printable tests with answer keys and marks, instantly.",
  },
  {
    icon: FiShield,
    title: "Private & Secure",
    text: "Your account and data stay protected end to end.",
  },
];

/**
 * The left-hand promotional panel. Hidden on small screens; the form takes the
 * full width on tablet/mobile.
 */
export default function AuthShowcase({ mode }) {
  const isRegister = mode === "register";

  return (
    <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-[46%] xl:w-1/2">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-600" />

      {/* Animated blobs */}
      <div className="absolute -left-16 top-10 h-72 w-72 animate-blob rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-80 w-80 animate-blob rounded-full bg-sky-300/30 blur-3xl [animation-delay:3s]" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 animate-blob rounded-full bg-violet-400/30 blur-3xl [animation-delay:6s]" />

      {/* Subtle dotted grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white xl:p-14">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <BsStars className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">LessonPilot</span>
        </Link>

        <div className="max-w-md mt-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <FiZap className="h-3.5 w-3.5" /> Powered by AI
          </div>

          <h1 className="text-4xl font-bold leading-tight xl:text-[2.75rem]">
            {isRegister ? "Join thousands of teachers." : "Welcome back, educator."}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/80">
            Plan lessons and generate classroom-ready tests faster than ever with
            intelligent, teacher-first tools.
          </p>

          <div className="mt-8 space-y-3.5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex animate-fade-in-up items-start gap-3.5 rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur transition hover:bg-white/15"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{feature.title}</p>
                    <p className="text-xs leading-5 text-white/70">{feature.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/70">
          <div className="flex -space-x-2">
            {["A", "M", "S", "R"].map((initial, index) => (
              <span
                key={index}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-xs font-bold backdrop-blur"
              >
                {initial}
              </span>
            ))}
          </div>
          <span>Trusted by educators worldwide</span>
        </div>
      </div>
    </div>
  );
}
