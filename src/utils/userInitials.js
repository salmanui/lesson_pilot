/**
 * Derives a two-letter avatar label from a user object.
 * Prefers the two initials of a multi-word name (e.g. "Jane Doe" -> "JD"),
 * falls back to the first two letters of a single word or the email handle,
 * and finally to "U" when nothing usable is available.
 */
export const getInitials = (user) => {
  const source = (user?.name || user?.email || "").trim();
  if (!source) return "U";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};
