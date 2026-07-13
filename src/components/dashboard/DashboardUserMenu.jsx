"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { FiLogOut, FiChevronDown } from "react-icons/fi";
import { UserContext } from "@/src/utils/userContext";
import { getInitials } from "@/src/utils/userInitials";

/**
 * Profile avatar + dropdown for the dashboard top nav.
 * Mirrors the landing page's avatar control: two-letter initials avatar that
 * toggles a menu with the user's name/email and sign out.
 * Closes on outside click or the Escape key.
 */
export default function DashboardUserMenu() {
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
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 py-1 pl-1 pr-1 transition hover:border-slate-300 hover:bg-white sm:pr-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 animate-fade-in-up"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
              {getInitials(user)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              {user.email && (
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              )}
            </div>
          </div>

          <div className="px-1.5 py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <FiLogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
