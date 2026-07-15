import { postAuth } from "./auth/authClient";

/**
 * POST /api/auth/register
 * Body: { email, userName, phoneNumber, schoolOrganization, password }
 *
 * Returns `{ success, message }` only — no user object and no token. New accounts
 * are inactive until an administrator activates them, so a successful call is NOT
 * a sign-in: callers must send the user to the login screen rather than straight in.
 */
export const registerUser = async ({
  email,
  userName,
  phoneNumber,
  schoolOrganization,
  password,
}) =>
  postAuth(
    "/api/auth/register",
    { email, userName, phoneNumber, schoolOrganization, password },
    "User registration failed"
  );
