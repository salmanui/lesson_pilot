"use client";

import Link from "next/link";
import { BsStars } from "react-icons/bs";
import DashboardUserMenu from "@/src/components/dashboard/DashboardUserMenu";
import TrialBanner from "@/src/components/dashboard/TrialBanner";

/**
 * Sticky top navigation shared by the dashboard and the AI tool pages:
 * brand mark on the left, account menu on the right.
 *
 * The trial strip sits above the navbar and scrolls away with the page, leaving
 * the navbar itself stuck to the top.
 */
export default function DashboardNavbar() {
  return (
    <>
      <TrialBanner />
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <BsStars className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-slate-900">
              LessonPilot
            </span>
          </Link>

          <DashboardUserMenu />
        </div>
      </header>
    </>
  );
}
