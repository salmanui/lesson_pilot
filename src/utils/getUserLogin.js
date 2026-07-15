import { postAuth } from "./auth/authClient";

/**
 * POST /api/auth/signin
 * Body: { emailOrPhone, password }
 *
 * `emailOrPhone` accepts either identifier. Inactive accounts are rejected with
 * 403 "Inactive user." even when the password is correct.
 */
export const loginUser = async ({ emailOrPhone, password }) =>
  postAuth("/api/auth/signin", { emailOrPhone, password }, "User login failed");
