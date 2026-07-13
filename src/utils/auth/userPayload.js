/**
 * Normalizes the many possible shapes an auth API (or Google profile) can
 * return into a single, consistent user object stored in context/localStorage.
 * `fallback` carries the values the user just typed, used when the API omits them.
 */
export const buildUserPayload = (response, fallback = {}) => {
  const source = response?.data || response?.result || response?.user || response || {};

  return {
    ...source,
    name:
      source.name ||
      source.fullName ||
      source.userName ||
      fallback.name ||
      fallback.userName ||
      "",
    email: source.email || fallback.email || "",
    mobileNumber:
      source.mobileNumber ||
      source.mobileNo ||
      source.phoneNumber ||
      fallback.phone ||
      fallback.mobileNumber ||
      "",
    organizationName:
      source.organizationName ||
      source.schoolName ||
      fallback.organization ||
      fallback.organizationName ||
      "",
    photo: source.picture || source.photo || fallback.picture || "",
    userId:
      source.userId ||
      source.id ||
      source.UserId ||
      source.ID ||
      source.sub ||
      fallback.email ||
      "",
  };
};
