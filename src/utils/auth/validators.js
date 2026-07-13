// Shared, framework-agnostic validation helpers for the auth forms.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value = "") => EMAIL_REGEX.test(value.trim());

export const isValidPhone = (value = "") => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

// Returns a 0-4 strength score with a human label for the password meter.
export const getPasswordStrength = (password = "") => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] || "Too weak" };
};

export const validateLogin = (fields = {}) => {
  const errors = {};
  if (!fields.identifier?.trim()) {
    errors.identifier = "Email or phone is required.";
  }
  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  return errors;
};

export const validateRegister = (fields = {}) => {
  const errors = {};

  if (!fields.userName?.trim()) {
    errors.userName = "User name is required.";
  } else if (fields.userName.trim().length < 2) {
    errors.userName = "Please enter your full name.";
  }

  if (!fields.email?.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(fields.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!fields.phone?.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(fields.phone)) {
    errors.phone = "Enter a valid phone number (10-15 digits).";
  }

  if (!fields.organization?.trim()) {
    errors.organization = "School / organization is required.";
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
};
