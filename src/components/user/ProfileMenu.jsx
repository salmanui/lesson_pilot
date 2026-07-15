"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiLogOut,
  FiChevronDown,
  FiPhone,
  FiBriefcase,
  FiGrid,
} from "react-icons/fi";
import { UserContext } from "@/src/utils/userContext";
import { getInitials } from "@/src/utils/userInitials";

/**
 * The signed-in account dropdown, shared by the dashboard and the landing nav
 * so the panel only ever exists once.
 *
 * trigger="pill"   avatar + name + chevron (dashboard, where there is room)
 * trigger="avatar" circle avatar only (landing nav, which is tighter)
 *
 * Closes on outside click or the Escape key.
 */
export default function ProfileMenu({
  trigger = "pill",
  showDashboardItem = false,
}) {
  const { user, logout } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const displayName = user.name || user.email || "Your account";

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  return (
    <div ref={containerRef} className="relative">
      {trigger === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 py-1 pl-1 pr-1 transition hover:border-indigo-300 hover:bg-white sm:pr-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open account menu"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">
            {getInitials(user)}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-slate-700 sm:inline">
            {displayName}
          </span>
          <FiChevronDown
            className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:inline ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open account menu"
        >
          {getInitials(user)}
        </button>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-900/10 animate-fade-in-up"
        >
          {/* Gradient identity header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 px-4 py-4">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur-sm">
                {getInitials(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName}
                </p>
                {user.email && (
                  <p className="truncate text-xs text-white/80">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact details — sit on the white body, above Sign out. Icon badges
              mirror the Sign out item so both icon columns line up. */}
          {(user.mobileNumber || user.organizationName) && (
            <div className="space-y-1.5 px-4 pb-3 pt-3.5">
              {user.mobileNumber && (
                <p className="flex items-center gap-2.5 text-base text-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <FiPhone className="h-[18px] w-[18px]" />
                  </span>
                  <span className="truncate">{user.mobileNumber}</span>
                </p>
              )}
              {user.organizationName && (
                <p className="flex items-center gap-2.5 text-base text-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <FiBriefcase className="h-[18px] w-[18px]" />
                  </span>
                  <span className="truncate">{user.organizationName}</span>
                </p>
              )}
            </div>
          )}

          <div className="mx-3 border-t border-slate-100" />

          <div className="space-y-0.5 p-1.5">
            {showDashboardItem && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-indigo-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-200">
                  <FiGrid className="h-[18px] w-[18px]" />
                </span>
                Dashboard
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 transition group-hover:bg-rose-200">
                <FiLogOut className="h-[18px] w-[18px]" />
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
