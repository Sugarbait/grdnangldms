/**
 * TOTP Utilities - Moved to auth.ts for Convex compatibility
 * This file is kept for backwards compatibility with QR code generation
 */

/**
 * Generate a QR code URL for a TOTP secret
 * Returns the otpauth:// URL that can be converted to QR code
 *
 * @param secret - Base32 encoded TOTP secret
 * @param email - User's email for account identification
 * @returns otpauth:// URL suitable for QR code generation
 */
export function generateOtpauthUrl(secret: string, email: string): string {
  const issuer = 'Guardian Angel DMS';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Note: verifyTOTP and generateTOTPSecretBase32 have been moved to auth.ts
 * and are implemented as Convex actions to access Node.js crypto
 */
