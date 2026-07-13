import axios from "axios";
// Get base URL from .env file
const baseUrl = process.env.NEXT_PUBLIC_API_URL;
// Utility function to handle the API POST request for user registration
export const loginUser = async (formData) => {
  const url = `${baseUrl}/api/Registration/QeebLogin`;
  try {
    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
    });
    return response.data; // Assuming successful response returns the response data
  } catch (error) {
    console.error("Error while user login:", error);
    throw new Error("User login failed");
  }
};

