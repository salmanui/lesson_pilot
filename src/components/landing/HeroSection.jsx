import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClipboard, FiFileText } from "react-icons/fi";
import ScrollLink from "./ScrollLink";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-indigo-200/50 blur-3xl" />
        <div
          className="absolute right-0 top-10 h-96 w-96 animate-blob rounded-full bg-sky-200/50 blur-3xl"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-in-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500" /> AI-powered teaching assistant
          </div>

          <h1 className="text-3xl font-bold text-slate-900 md:text-5xl lg:leading-[54px]">
            Plan lessons &amp; generate tests in{" "}
            <p className="bg-gradient-to-r lg:leading-[60px] from-indigo-600 to-sky-500 bg-clip-text text-transparent">
              minutes, not hours.
            </p>
          </h1>

          <p className="mt-5 max-w-xl text-sm md:text-base lg:leading-8 leading-6 text-slate-600">
            LessonPilot turns any topic into classroom-ready lesson plans and printable
            tests — complete with objectives, activities, answer keys and marks. Spend less
            time preparing and more time teaching.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              href="/register"
              className="group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-4 md:py-3.5 py-3 md:text-sm text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 sm:flex-none sm:px-6"
            >
              Get started free
              <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <ScrollLink
              to="how-it-works"
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 md:py-3.5 py-3 md:text-sm text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none sm:px-6"
            >
              See how it works
            </ScrollLink>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" /> Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" /> No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" /> Export to PDF
            </span>
          </div>
        </div>

        {/* Hero visual: stylized app preview with floating badges */}
        <div className="relative animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <div className="relative mx-auto max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-indigo-500/10">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <FiClipboard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="h-2.5 w-3/4 rounded-full bg-indigo-200" />
                  <div className="mt-2 h-2 w-1/2 rounded-full bg-indigo-100" />
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100" />
                <div className="h-2.5 w-5/6 rounded-full bg-slate-100" />
                <div className="h-2.5 w-2/3 rounded-full bg-slate-100" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="h-2 w-1/2 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-200" />
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-1/2 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>

            <div className="absolute -left-6 -top-6 flex animate-float items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <FiFileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Test ready</p>
                <p className="text-[10px] text-slate-400">20 questions + key</p>
              </div>
            </div>

            <div
              className="absolute -bottom-6 -right-4 flex animate-float items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-xl"
              style={{ animationDelay: "1.5s" }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <FiCheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Saved 3 hours</p>
                <p className="text-[10px] text-slate-400">this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
