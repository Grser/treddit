const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres e incluir mayúscula, minúscula, número y carácter especial.`;

export function isStrongPassword(password: string): boolean {
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
