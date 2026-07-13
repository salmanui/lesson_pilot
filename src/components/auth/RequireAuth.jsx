"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "@/src/utils/userContext";

/**
 * Route guard: renders its children only for an authenticated user.
 * While the stored session is being read it shows a loader, and if there is
 * no user it redirects to /login. Wrap any page that should be private.
 */
export default function RequireAuth({ children }) {
  const router = useRouter();
  const { user, hasLoadedUser } = useContext(UserContext);

  useEffect(() => {
    if (hasLoadedUser && !user) {
      router.replace("/login");
    }
  }, [hasLoadedUser, user, router]);

  // Still resolving localStorage, or about to redirect an unauthenticated user.
  if (!hasLoadedUser || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbff]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return children;
}
