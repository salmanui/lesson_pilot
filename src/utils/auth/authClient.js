import axios from "axios";

// In the browser the call must stay same-origin — the auth API sends no CORS
// headers — so it goes to /api/auth/* and next.config.js rewrites it to the auth
// host. On the server there is no origin to respect, so call the host directly.
// NEXT_PUBLIC_API_URL still points at the backend that generates lesson plans.
const baseUrl =
  typeof window === "undefined" ? process.env.NEXT_PUBLIC_AUTH_API_URL || "" : "";

/**
 * Posts to the auth service and unwraps its `{ success, message, ... }` envelope.
 * Failures carry a human-readable `message` ("Email is already registered.",
 * "Inactive user.") that the auth screens surface directly, so it is preserved
 * here rather than replaced with a generic error.
 */
export const postAuth = async (path, payload, fallbackMessage) => {
  let data;

  try {
    const response = await axios.post(`${baseUrl}${path}`, payload, {
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
    });
    data = response.data;
  } catch (error) {
    console.error(`Auth request failed: ${path}`, error);
    // A request that never reached the API (offline, DNS, CORS) has no `response`
    // and only a bare "Network Error" message — show the caller's wording instead.
    throw new Error(
      error?.response?.data?.message ||
        (error?.response ? error?.message : null) ||
        fallbackMessage
    );
  }

  // Rejections normally arrive as 4xx (which axios throws on), but the envelope is
  // the source of truth: a `success: false` body must never be read as a sign-in,
  // even if it is served with a 2xx status.
  if (data?.success === false) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};
