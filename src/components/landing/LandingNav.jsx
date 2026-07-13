"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { FiMenu, FiX, FiArrowRight, FiGrid } from "react-icons/fi";
import { UserContext } from "@/src/utils/userContext";
import ScrollLink from "./ScrollLink";
import UserAvatarMenu from "./UserAvatarMenu";

const NAV_LINKS = [
  { to: "features", label: "Features" },
  { to: "how-it-works", label: "How it works" },
  { to: "testimonials", label: "Testimonials" },
];

/**
 * Sticky, auth-aware top navigation for the public landing page.
 * Shows the user avatar menu when signed in, otherwise Log in / Get started.
 * On mobile the menu is a left-sliding drawer.
 */
export default function LandingNav() {
  const { user, hasLoadedUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const isAuthed = hasLoadedUser && !!user;

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
            <BsStars className="h-5 w-5" />
          </div>
          <span className="hidden text-base font-bold text-slate-900 min-[430px]:inline md:inline">
            LessonPilot
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <ScrollLink
              key={link.to}
              to={link.to}
              className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              {link.label}
            </ScrollLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthed ? (
            <UserAvatarMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 transition hover:text-indigo-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl"
              >
                Get started <FiArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile cluster: auth actions beside the toggle */}
        <div className="flex items-center gap-3 md:hidden">
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-2 text-xs md:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shimmer"
                />
                <FiGrid className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
                <span>Dashboard</span>
              </Link>
              <UserAvatarMenu showDashboardButton={false} includeDashboardInMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:text-indigo-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="group relative inline-flex items-center overflow-hidden whitespace-nowrap rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shimmer"
                />
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-lg py-2 text-slate-700 transition hover:text-indigo-600 focus:outline-none"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <FiMenu className="h-6 w-6" />
          </button>
        </div>
      </nav>
    </header>

      {/* Mobile drawer + backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <BsStars className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-slate-900">LessonPilot</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100"
            aria-label="Close menu"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <ScrollLink
                key={link.to}
                to={link.to}
                onNavigate={() => setOpen(false)}
                className="block cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </ScrollLink>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
