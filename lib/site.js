export const SITE_NAME = "LessonPilot";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const SITE_TAGLINE = "AI Lesson Plans & Test Generator for Teachers";

export const SITE_DESCRIPTION =
  "LessonPilot is an AI-powered assistant that turns any topic into classroom-ready lesson plans and printable tests — complete with objectives, activities, answer keys and marks. Free to start.";

export const SITE_KEYWORDS = [
  "AI lesson plan generator",
  "AI test generator",
  "lesson plan maker",
  "quiz generator for teachers",
  "printable tests",
  "worksheet generator",
  "AI tools for teachers",
  "lesson planning software",
  "classroom resources",
  "education AI",
];

// Twitter / X handle for the brand — update to the real handle.
export const TWITTER_HANDLE = "@lessonpilot";

// Public social profile URLs for the Organization schema `sameAs`.
// Fill these in with the real profiles (e.g. LinkedIn, X, Instagram).
export const SITE_SOCIALS = [];

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
