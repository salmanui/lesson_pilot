"use client";

import { useContext } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { LuClipboardList, LuFileQuestion, LuLogOut } from "react-icons/lu";
import { UserContext } from "@/src/utils/userContext";

const tools = [
  {
    title: "Lesson Plan Generator",
    description:
      "Create structured teacher lesson plans with objectives, activities, assessment ideas, and classroom flow.",
    href: "/ai/lesson-plan-generator",
    icon: LuClipboardList,
  },
  {
    title: "AI Test Generator",
    description:
      "Build printable tests with MCQs, true/false, descriptive questions, answer keys, and marks.",
    href: "/ai-test-generator",
    icon: LuFileQuestion,
  },
];

export default function TeacherToolsHome() {
  const { user, logout } = useContext(UserContext);
  const displayName = user?.name || user?.email || "there";

  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
            <BsStars className="h-5 w-5" />
          </div>
          <span className="text-base font-bold text-slate-900">LessonPilot</span>
        </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              Hi, <span className="font-semibold text-slate-800">{displayName}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <LuLogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
            <BsStars className="h-4 w-4" />
            Teacher Tools
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
            Plan lessons and generate tests faster with AI.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Choose one of the two available tools to prepare classroom-ready
            teaching material.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  {tool.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {tool.description}
                </p>
                <div className="mt-6 text-sm font-semibold text-sky-700">
                  Open tool
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
