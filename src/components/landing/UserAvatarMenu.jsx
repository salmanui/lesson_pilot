"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiGrid, FiLogOut, FiPhone, FiBriefcase } from "react-icons/fi";
import { UserContext } from "@/src/utils/userContext";
import { getInitials } from "@/src/utils/userInitials";

/**
 * Signed-in user control for the top nav: a two-letter avatar that toggles a
 * dropdown showing the user's name/email plus quick actions (Dashboard, Sign out).
 * Closes on outside click or the Escape key.
 */
export default function UserAvatarMenu({
  showDashboardButton = true,
  includeDashboardInMenu = false,
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
    <div ref={containerRef} className="flex items-center gap-3">
      {showDashboardButton && (
        <Link
          href="/dashboard"
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shimmer"
          />
          <FiGrid className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
          Dashboard
        </Link>
      )}

      <div className="relative">
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

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              {user.email && (
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              )}

              {(user.mobileNumber || user.organizationName) && (
                <div className="mt-2 space-y-1">
                  {user.mobileNumber && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FiPhone className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{user.mobileNumber}</span>
                    </p>
                  )}
                  {user.organizationName && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FiBriefcase className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{user.organizationName}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {includeDashboardInMenu && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FiGrid className="h-4 w-4 text-slate-400" />
                Dashboard
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <FiLogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
