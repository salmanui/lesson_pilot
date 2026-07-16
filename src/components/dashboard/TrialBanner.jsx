"use client";

import React, { useContext, useEffect, useState } from "react";
import { HiOutlineClock, HiOutlineSparkles } from "react-icons/hi2";
import { UserContext } from "@/src/utils/userContext";
import { getUserSubscriptionStatus } from "@/src/utils/subscriptionApi";

/**
 * Strip above the dashboard navbar counting down the free trial, and prompting
 * to upgrade once it lapses. Rendered by DashboardNavbar so every page carrying
 * the navbar gets it.
 *
 * Shows nothing for guests (guestAiUsage handles them) or for Premium.
 */
export default function TrialBanner() {
  const { user, hasLoadedUser, openSubscriptionModal } =
    useContext(UserContext);

  // Read status here rather than from context's subscriptionSummary: that
  // snapshot is memoised on the user payload, so the day count would not refresh
  // on navigation within a long-lived session.
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!hasLoadedUser) return;
    setStatus(user ? getUserSubscriptionStatus(user) : null);
  }, [user, hasLoadedUser]);

  if (!status?.isSignedIn || status.isPremium) return null;

  const expired = status.isTrialExpired;
  const days = status.trialDaysRemaining;

  return (
    <div
      className={`print:hidden ${
        expired
          ? "bg-gradient-to-r from-slate-800 to-slate-900"
          : "bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 sm:px-8">
        <p className="flex items-center gap-2 text-center text-xs font-semibold text-white sm:text-sm">
          {expired ? (
            <HiOutlineClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <HiOutlineSparkles
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          )}
          {expired ? (
            <span>
              Your {status.trialLengthDays}-day free trial has ended.
              <span className="hidden sm:inline">
                {" "}
                Upgrade to Premium to keep generating.
              </span>
            </span>
          ) : (
            <span>
              <span className="font-bold">
                {days} {days === 1 ? "day" : "days"} left
              </span>{" "}
              in your free trial
            </span>
          )}
        </p>

        <button
          type="button"
          onClick={() =>
            openSubscriptionModal({
              reason: expired ? "trial_expired" : "trial_active",
            })
          }
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}
