const FREE_SIGNED_IN_GENERATION_LIMIT = 3;

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

const usageStorageKey = (user) =>
  `qeeb:teacher-tools:generation-uses:${resolveUserKey(user)}`;

const readGenerationUsage = (user) => {
  if (!hasWindow() || !resolveUserKey(user)) return 0;

  try {
    const parsed = Number.parseInt(localStorage.getItem(usageStorageKey(user)) || "0", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeGenerationUsage = (user, count) => {
  if (!hasWindow() || !resolveUserKey(user)) return;

  try {
    localStorage.setItem(usageStorageKey(user), String(Math.max(0, count)));
  } catch {}
};

export const getUserSubscriptionStatus = (user) => {
  const isSignedIn = Boolean(resolveUserKey(user));
  const usedGenerations = readGenerationUsage(user);
  const remainingGenerations = isSignedIn
    ? Math.max(0, FREE_SIGNED_IN_GENERATION_LIMIT - usedGenerations)
    : 0;

  return {
    isPremium: false,
    canGenerate: isSignedIn && remainingGenerations > 0,
    canDownload: isSignedIn,
    usedGenerations,
    remainingGenerations,
    generationLimit: FREE_SIGNED_IN_GENERATION_LIMIT,
  };
};

export const consumeGenerationForUser = ({ user }) => {
  const status = getUserSubscriptionStatus(user);
  if (!status.canGenerate) return status;

  writeGenerationUsage(user, status.usedGenerations + 1);
  return getUserSubscriptionStatus(user);
};
