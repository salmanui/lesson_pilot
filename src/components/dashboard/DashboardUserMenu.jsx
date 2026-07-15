"use client";

import ProfileMenu from "@/src/components/user/ProfileMenu";

/**
 * Profile avatar + dropdown for the dashboard top nav.
 * The panel itself lives in ProfileMenu, shared with the landing nav.
 */
export default function DashboardUserMenu() {
  return <ProfileMenu trigger="pill" />;
}
