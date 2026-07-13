import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

export default function CtaSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-600 px-8 py-14 text-center shadow-2xl shadow-indigo-500/30 sm:px-16">
          <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 animate-blob rounded-full bg-white/10 blur-3xl" />
          <div
            className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 animate-blob rounded-full bg-white/10 blur-3xl"
            style={{ animationDelay: "3s" }}
          />

          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to save hours every week?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
              Join thousands of teachers creating better lessons and tests in a fraction of
              the time.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:shadow-xl"
              >
                Get started free
                <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
