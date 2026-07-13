import axios from "axios";

// Get base URL from .env file
const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/**
 * QeebChangePassword payload:
 * {
 *   "userName": "string",
 *   "oldPassword": "string",
 *   "newPassword": "string"
 * }
 */
export const updateUserPassword = async (userName, oldPassword, newPassword) => {
  const url = `${baseUrl}/api/Registration/QeebChangePassword`;
  try {
    const response = await axios.post(
      url,
      { userName, oldPassword, newPassword },
      {
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating password:", error);
    throw new Error("Password change failed");
  }
};


