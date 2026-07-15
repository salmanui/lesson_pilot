"use client";

import { useContext } from "react";
import Link from "next/link";
import { FiGrid } from "react-icons/fi";
import { UserContext } from "@/src/utils/userContext";
import ProfileMenu from "@/src/components/user/ProfileMenu";

/**
 * Signed-in user control for the landing top nav: an optional Dashboard button
 * beside the account dropdown. The dropdown panel is ProfileMenu, shared with
 * the dashboard, so both stay identical.
 */
export default function UserAvatarMenu({
  showDashboardButton = true,
  includeDashboardInMenu = false,
}) {
  const { user } = useContext(UserContext);

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
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

      <ProfileMenu trigger="avatar" showDashboardItem={includeDashboardInMenu} />
    </div>
  );
}
