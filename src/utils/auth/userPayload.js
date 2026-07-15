/**
 * Normalizes the auth API's sign-in envelope into a single, consistent user object
 * stored in context/localStorage.
 *
 * The envelope nests the profile under `user` but keeps the session alongside it:
 *   { success, message, accessToken, expiresAtUtc,
 *     user: { id, email, userName, phoneNumber, schoolOrganization, isActive } }
 * so the token is read from the envelope while the profile is read from `user`.
 *
 * `fallback` carries the values the user just typed, used when the API omits them.
 */
export const buildUserPayload = (response, fallback = {}) => {
  const envelope = response || {};
  const source = envelope.data || envelope.result || envelope.user || envelope;

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
      source.schoolOrganization ||
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
    // Session lives on the envelope, not on `user`.
    accessToken: envelope.accessToken || envelope.token || "",
    expiresAtUtc: envelope.expiresAtUtc || "",
  };
};
