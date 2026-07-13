import axios from "axios";

// Get base URL from .env file
const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/**
 * Decode a Google ID token (JWT) on the client to read basic profile info
 * (name, email, picture). Used as a graceful fallback and to prefill the user.
 */
export const decodeJwt = (token = "") => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Exchange a Google ID token for an app session.
 *
 * NOTE: The backend endpoint is a placeholder — update the URL / payload shape
 * once the Google SSO contract is finalized. Expected request body:
 *   { idToken: "<google-jwt-credential>" }
 */
export const googleLogin = async (idToken) => {
  const url = `${baseUrl}/api/Registration/QeebGoogleLogin`;
  const response = await axios.post(
    url,
    { idToken },
    {
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
    }
  );
  return response.data;
};
