// Shared password rules so registration, password reset, and the
// profile "change password" form all enforce the same requirement.
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Returns a user-facing error message if the password is invalid,
 * or null if it satisfies the app's requirements.
 */
export function getPasswordError(password) {
  if (!password) return "Enter a password.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}
