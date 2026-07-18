// Shared by the lesson plan and AI test generators so the two tools always
// offer the same output languages.
//
// Values are the plain language names because both generators drop them
// straight into the prompt text sent to the model.
export const LANGUAGES = ["English", "Hindi", "Telugu"];

export const LANGUAGE_OPTIONS = LANGUAGES.map((language) => ({
  value: language,
  label: language,
}));

export const DEFAULT_LANGUAGE = LANGUAGES[0];
