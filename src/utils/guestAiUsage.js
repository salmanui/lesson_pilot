export const GUEST_AI_TOOL_KEYS = {
  AI_TEST: "ai-test-generator",
  LESSON_PLAN: "lesson-plan-generator",
  LESSON_PLAN_EXPORT: "lesson-plan-export",
};

const FREE_GUEST_USES = 1;

const usageKey = (toolKey) => `qeeb:guest:ai-tool-uses:${toolKey}`;

const readGuestUsageCount = (toolKey) => {
  if (typeof window === "undefined") return 0;
  if (!toolKey) return 0;
  try {
    const raw = localStorage.getItem(usageKey(toolKey));
    const parsed = Number.parseInt(raw ?? "0", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

export const canUseAiToolAsGuest = (toolKey) =>
  readGuestUsageCount(toolKey) < FREE_GUEST_USES;

export const consumeAiToolGuestUse = (toolKey) => {
  if (typeof window === "undefined") return;
  if (!toolKey) return;
  const next = Math.min(FREE_GUEST_USES, readGuestUsageCount(toolKey) + 1);
  try {
    localStorage.setItem(usageKey(toolKey), String(next));
  } catch {}
};
