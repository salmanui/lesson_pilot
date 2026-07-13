import axios from "axios";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/**
 * Fetch AI Lesson Plan (POST /api/GeminiApi/TextApiNew)
 * Body: { prompt: string, deviceId: "1" }
 */
export const fetchLessonPlan = async (prompt) => {
  if (!prompt || !prompt.trim()) throw new Error("Prompt is required");

  const url = `${baseUrl}/api/GoogleGenAI/TextPrompt`;

  try {
    const res = await axios.post(
      url,
      { prompt: prompt.trim(), deviceId: "1" },
      {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        // timeout: 30000,
      }
    );
    return res.data;
  } catch (error) {
    console.error("Error fetching lesson plan:", error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not generate the lesson plan. Please try again."
    );
  }
};


