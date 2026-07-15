"use client";

import { useContext } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import {
  LuClipboardList,
  LuFileQuestion,
  LuDownload,
  LuArrowRight,
  LuMousePointerClick,
  LuPencilLine,
} from "react-icons/lu";
import { UserContext } from "@/src/utils/userContext";
import DashboardUserMenu from "@/src/components/dashboard/DashboardUserMenu";

const tools = [
  {
    title: "Generator Lesson Plan",
    description:
      "Create structured teacher lesson plans with objectives, activities, assessment ideas, and classroom flow.",
    href: "/ai/generator-lesson-plan",
    icon: LuClipboardList,
    accent: "from-indigo-600 to-sky-500",
    glow: "shadow-indigo-500/25",
    chips: ["Objectives", "Activities", "Assessment", "Classroom flow"],
  },
  {
    title: "Generator AI Exam",
    description:
      "Build printable tests with MCQs, true/false, descriptive questions, answer keys, and marks.",
    href: "/ai/generator-ai-test",
    icon: LuFileQuestion,
    accent: "from-sky-500 to-cyan-500",
    glow: "shadow-sky-500/25",
    chips: ["MCQs", "True / False", "Answer keys", "Marks"],
  },
];

const steps = [
  {
    icon: LuMousePointerClick,
    title: "Pick a tool",
    description: "Choose the lesson plan or test generator to get started.",
  },
  {
    icon: LuPencilLine,
    title: "Add your details",
    description: "Enter the subject, grade, topic, and any preferences.",
  },
  {
    icon: LuDownload,
    title: "Generate & export",
    description: "Review, fine-tune, and download your material as a PDF.",
  },
];

export default function TeacherToolsHome() {
  const { user } = useContext(UserContext);
  const displayName = user?.name || user?.email || "there";
  const firstName = (user?.name || user?.email || "there").split(/[\s@]/)[0];

  return (
    <main className="relative min-h-screen bg-[#f7fbff] text-slate-950">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <BsStars className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-slate-900">LessonPilot</span>
          </Link>

          <DashboardUserMenu />
        </div>
      </header>

      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 overflow-hidden">
        <div className="mx-auto flex max-w-6xl justify-between">
          <div className="h-64 w-64 -translate-x-24 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="h-64 w-64 translate-x-24 rounded-full bg-sky-300/20 blur-3xl" />
        </div>
      </div>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        {/* Welcome header */}
        <div className="mb-8 sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
            <BsStars className="h-4 w-4" />
            AI Tools
          </div>
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl md:text-5xl">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:mt-4 md:text-base">
            Plan lessons and generate tests faster with AI. Choose a tool below to prepare
            classroom-ready teaching material.
          </p>
        </div>

        {/* Tools */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 focus:outline-none focus:ring-4 focus:ring-sky-200 sm:p-6"
              >
                {/* top accent line */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tool.accent}`}
                />

                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.accent} text-white shadow-lg ${tool.glow} transition duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">{tool.title}</h3>
                <p className="mt-2.5 text-sm leading-6 text-slate-600">{tool.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tool.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                  Open tool
                  <LuArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* How it works */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:mt-12 sm:p-8">
          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Get the most out of LessonPilot</h2>
            <p className="mt-1 text-sm text-slate-500">Three quick steps from idea to printable material.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="text-slate-400">{index + 1}.</span> {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 hidden">
          Signed in as <span className="font-medium text-slate-500">{displayName}</span>
        </p>
      </section>
    </main>
  );
}
