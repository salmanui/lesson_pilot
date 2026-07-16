const TRIAL_LENGTH_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const hasWindow = () => typeof window !== "undefined";

const resolveUserKey = (user) => {
  const raw =
    user?.userId ||
    user?.email ||
    user?.mobileNumber ||
    user?.mobileNo ||
    user?.phoneNumber ||
    "";

  return String(raw).trim().toLowerCase();
};

const trialStorageKey = (user) =>
  `qeeb:teacher-tools:trial-start:${resolveUserKey(user)}`;

const readStoredTrialStart = (user) => {
  if (!hasWindow() || !resolveUserKey(user)) return null;

  try {
    const parsed = Number.parseInt(
      localStorage.getItem(trialStorageKey(user)) || "",
      10,
    );
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const writeStoredTrialStart = (user, startedAt) => {
  if (!hasWindow() || !resolveUserKey(user)) return;

  try {
    localStorage.setItem(trialStorageKey(user), String(startedAt));
  } catch {}
};

/**
 * Accepts what a JSON API realistically sends for a date: an ISO string, epoch
 * milliseconds, or epoch seconds. Values below 1e12 are read as seconds — that
 * boundary sits in 2001, so any plausible millisecond stamp is far above it and
 * any plausible second stamp far below.
 */
const toTimestamp = (value) => {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value < 1e12 ? value * 1000 : value;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

// Nothing populates these today. They are read anyway so that a server which
// starts returning trial dates takes over from the local stamp with no further
// change here — the same approach resolveIsPremium() takes for entitlement.
const TRIAL_END_FIELDS = [
  "trialEndsAt",
  "trialEndAt",
  "trialEndDate",
  "trialExpiresAt",
];
const TRIAL_START_FIELDS = [
  "trialStartedAt",
  "trialStartAt",
  "trialStartDate",
  "createdAt",
  "createdOn",
  "registeredAt",
];

const firstTimestamp = (user, fields) => {
  for (const field of fields) {
    const timestamp = toTimestamp(user?.[field] ?? user?.subscription?.[field]);
    if (timestamp) return timestamp;
  }
  return null;
};

/**
 * The trial window, or null when this user has no anchor yet. A server-provided
 * end date wins outright; otherwise the window is derived from a start date,
 * which is either the server's or the stamp written at first sign-in.
 */
const resolveTrialWindow = (user) => {
  const serverEnd = firstTimestamp(user, TRIAL_END_FIELDS);
  if (serverEnd)
    return {
      startsAt: firstTimestamp(user, TRIAL_START_FIELDS),
      endsAt: serverEnd,
    };

  const startsAt =
    firstTimestamp(user, TRIAL_START_FIELDS) ?? readStoredTrialStart(user);
  if (!startsAt) return null;

  return { startsAt, endsAt: startsAt + TRIAL_LENGTH_DAYS * DAY_MS };
};

const PREMIUM_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "premium",
  "pro",
]);

/**
 * Reads premium entitlement off the stored user payload. Nothing grants it yet —
 * there is no billing backend — so this returns false for every real session
 * today. It reads from the payload rather than hard-coding false so that a
 * server which starts returning any of these fields lights premium up with no
 * further change here.
 */
const resolveIsPremium = (user) => {
  if (!user) return false;
  if (user.isPremium === true || user.premium === true) return true;

  const plan = String(user.plan || user.subscriptionPlan || "")
    .trim()
    .toLowerCase();
  if (plan && plan !== "free") return true;

  const status = String(
    user.subscriptionStatus || user.subscription?.status || "",
  )
    .trim()
    .toLowerCase();

  return PREMIUM_SUBSCRIPTION_STATUSES.has(status);
};

/**
 * Stamps the start of the trial on first sign-in. Called from an effect rather
 * than from getUserSubscriptionStatus() so that reading entitlement stays free
 * of side effects — a read happens during render, and writing there would be a
 * render-phase mutation.
 *
 * Only ever writes when nothing else anchors the trial, so a server date and an
 * already-running trial are both left alone: re-stamping would silently hand the
 * user a fresh 14 days on every sign-in.
 */
export const startTrialIfNeeded = (user) => {
  if (!hasWindow() || !resolveUserKey(user)) return;
  if (resolveIsPremium(user)) return;
  if (resolveTrialWindow(user)) return;

  writeStoredTrialStart(user, Date.now());
};

export const getUserSubscriptionStatus = (user) => {
  const isSignedIn = Boolean(resolveUserKey(user));
  const isPremium = isSignedIn && resolveIsPremium(user);
  const now = Date.now();

  // A signed-in user with no anchor yet is on day 1: startTrialIfNeeded() writes
  // the stamp from an effect, which can land after the first render reads this.
  // Treating "unstamped" as a full trial keeps that first render consistent with
  // the stamp the effect is about to write.
  const trialEndsAt = isSignedIn
    ? (resolveTrialWindow(user)?.endsAt ?? now + TRIAL_LENGTH_DAYS * DAY_MS)
    : null;

  const msRemaining = trialEndsAt == null ? 0 : trialEndsAt - now;
  const isTrialing = isSignedIn && !isPremium && msRemaining > 0;
  const isTrialExpired = isSignedIn && !isPremium && msRemaining <= 0;

  return {
    isSignedIn,
    isPremium,
    isTrialing,
    isTrialExpired,
    // Rounded up, and never 0 while the trial is still live: the last few hours
    // read as "1 day left" rather than "0 days left".
    trialDaysRemaining: isTrialing
      ? Math.max(1, Math.ceil(msRemaining / DAY_MS))
      : 0,
    trialEndsAt,
    trialLengthDays: TRIAL_LENGTH_DAYS,
    // Premium is uncapped; the trial is full access until it lapses. Guests get
    // nothing here — they are handled separately by guestAiUsage.
    canGenerate: isPremium || isTrialing,
    canDownload: isPremium || isTrialing,
  };
};
