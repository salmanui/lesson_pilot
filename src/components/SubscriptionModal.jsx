"use client";

import React, { useContext, useEffect } from "react";
import { HiCheck, HiOutlineSparkles, HiXMark } from "react-icons/hi2";
import { UserContext } from "../utils/userContext";
import { GUEST_AI_TOOL_KEYS } from "../utils/guestAiUsage";
import { getUserSubscriptionStatus } from "../utils/subscriptionApi";

/**
 * Upgrade prompt shown when a gated action is refused, and from the trial strip.
 * Mounted once, app-wide (see app/providers.js), because every AI tool shares one
 * free trial.
 *
 * Opened via openSubscriptionModal({ reason, sourceTool }) from UserContext.
 * `reason` is "trial_expired", "download_locked", or "trial_active" (the strip's
 * upgrade button, pressed while the trial is still running).
 */

const TOOL_LABELS = {
  [GUEST_AI_TOOL_KEYS.LESSON_PLAN]: "Lesson Plan Generator",
  [GUEST_AI_TOOL_KEYS.AI_TEST]: "AI Test Generator",
  [GUEST_AI_TOOL_KEYS.LESSON_PLAN_EXPORT]: "Lesson Plan export",
};

// The two rates every other number derives from — set these and the totals,
// savings and discount below all follow, so they cannot drift out of sync.
const LIST_MONTHLY = 399;
const OFFER_MONTHLY = 220;
const PAID_MONTHS = 12;
const TRIAL_MONTHS = 1;

// Derived, never hard-coded: the badge is a claim about the two prices above,
// so computing it keeps it honest if either price is edited.
const DISCOUNT_PERCENT = Math.round((1 - OFFER_MONTHLY / LIST_MONTHLY) * 100);
const listTotal = LIST_MONTHLY * PAID_MONTHS;
const offerTotal = OFFER_MONTHLY * PAID_MONTHS;
const savings = listTotal - offerTotal;
const totalMonths = TRIAL_MONTHS + PAID_MONTHS;

const inr = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const PREMIUM_POINTS = [
  "Unlimited AI generations",
  "Downloads and exports unlocked",
  `${TRIAL_MONTHS} month free trial`,
  "Every board, class and format",
];

export default function SubscriptionModal() {
  const {
    user,
    isSubscriptionModalOpen,
    subscriptionModalReason,
    subscriptionModalSourceTool,
    closeSubscriptionModal,
  } = useContext(UserContext);

  useEffect(() => {
    if (!isSubscriptionModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeSubscriptionModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSubscriptionModalOpen, closeSubscriptionModal]);

  if (!isSubscriptionModalOpen) return null;

  // Read on open rather than from context: that snapshot is memoised on the user
  // payload, so a trial that lapsed during this session would still read as live.
  const status = getUserSubscriptionStatus(user);
  const toolLabel = TOOL_LABELS[subscriptionModalSourceTool] || "this tool";

  const note = status.isTrialing
    ? `You have ${status.trialDaysRemaining} ${
        status.trialDaysRemaining === 1 ? "day" : "days"
      } left in your free trial. Upgrade any time to keep your access.`
    : subscriptionModalReason === "download_locked"
      ? `Your free trial has ended, so downloads and exports for the ${toolLabel} are locked.`
      : `Your ${status.trialLengthDays}-day free trial has ended. Upgrade to keep using the ${toolLabel}.`;

  const freePoints = [
    `${status.trialLengthDays} days of full access`,
    "Unlimited generations while it runs",
    "Downloads and exports included",
    "Locks when the trial ends",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={closeSubscriptionModal}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-modal-title"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                <HiOutlineSparkles className="h-3 w-3" />
                Premium
              </span>
              <h2
                id="subscription-modal-title"
                className="mt-1.5 text-lg font-bold leading-tight text-slate-900"
              >
                Upgrade to Premium
              </h2>
            </div>
            <button
              type="button"
              onClick={closeSubscriptionModal}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Close"
            >
              <HiXMark className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] leading-5 text-sky-700">
            {note}
          </p>

          {/* Plans */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-800">Free trial</p>
              <p className="mt-0.5 text-lg font-bold text-slate-400">
                {status.trialLengthDays} days
              </p>
              <ul className="mt-2 space-y-1.5">
                {freePoints.map((point) => (
                  <li
                    key={point}
                    className="text-[11px] leading-4 text-slate-500"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/60 to-sky-50/60 p-3">
              <span className="absolute -top-2 right-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                Best value
              </span>
              <p className="text-sm font-bold text-indigo-700">Premium</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900">
                  {inr(OFFER_MONTHLY)}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  /mo
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                <span className="line-through">{inr(LIST_MONTHLY)}</span>{" "}
                <span className="font-bold text-emerald-600">
                  {DISCOUNT_PERCENT}% off
                </span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {PREMIUM_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-600"
                  >
                    <HiCheck className="mt-0.5 h-3 w-3 shrink-0 text-indigo-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Offer maths */}
          <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-4 text-slate-500">
            {TRIAL_MONTHS} month free + {PAID_MONTHS} months paid ={" "}
            <span className="font-semibold text-slate-700">
              {totalMonths} months
            </span>
            . Billed yearly at{" "}
            <span className="font-semibold text-slate-700">
              {inr(offerTotal)}
            </span>{" "}
            instead of {inr(listTotal)} — you save{" "}
            <span className="font-semibold text-emerald-600">
              {inr(savings)}
            </span>
            .
          </p>

          {/* No checkout exists yet — no billing backend, no pricing route, and
              nothing sets premium on the user payload. Wire the real flow into
              this handler; see resolveIsPremium() in utils/subscriptionApi.js
              for the fields a server needs to return to grant access. */}
          <button
            type="button"
            onClick={closeSubscriptionModal}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40"
          >
            Get Premium Now
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Checkout is not connected yet — contact your administrator to
            upgrade.
          </p>
        </div>
      </div>
    </div>
  );
}
