import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
import { api, internal } from "./_generated/api";
import { deriveEncryptionKey, generateEncryptionKey } from "./encryption";
import { generateOtpauthUrl } from "./totp";

/**
 * Helper function to generate email verification token
 */
function generateVerificationToken(): string {
  // Use crypto.getRandomValues for cryptographically secure token generation
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join(''); // 48-char hex string
}

/**
 * Decode base32 string to hex string
 * RFC 4648 base32 alphabet
 */
function base32DecodeToHex(encoded: string): string {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  const cleaned = encoded.replace(/=/g, "").toUpperCase();

  for (let i = 0; i < cleaned.length; i++) {
    const index = base32Chars.indexOf(cleaned[i]);
    if (index === -1) throw new Error("Invalid base32 character");
    bits += index.toString(2).padStart(5, "0");
  }

  // Convert bits to hex
  let hex = "";
  for (let i = 0; i <= bits.length - 8; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8), 2);
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

/**
 * Verify TOTP token against secret using CryptoJS
 * Implements RFC 6238 Time-based One-Time Password algorithm
 * CryptoJS is used because Node.js crypto module is not available in Convex
 */
function verifyTOTP(secret: string, token: string): boolean {
  try {
    // Validate token format
    if (!/^\d{6}$/.test(token)) {
      console.log("[verifyTOTP] Invalid token format:", token);
      return false;
    }

    console.log("[verifyTOTP] Starting verification with secret length:", secret.length);

    // Decode base32 secret to hex string
    let secretHex: string;
    try {
      secretHex = base32DecodeToHex(secret);
      console.log("[verifyTOTP] Successfully decoded secret to hex, length:", secretHex.length);
    } catch (decodeError: any) {
      console.error("[verifyTOTP] Failed to decode base32 secret:", decodeError.message);
      return false;
    }

    // Get current time counter (30-second intervals)
    const now = Math.floor(Date.now() / 1000);
    const timeCounter = Math.floor(now / 30);
    console.log("[verifyTOTP] Current time counter:", timeCounter);

    // Check current and adjacent time windows (±1 for clock skew tolerance, 90-second total window)
    for (let i = -1; i <= 1; i++) {
      try {
        const counter = timeCounter + i;

        // Create 8-byte counter (big-endian) as hex string
        // JavaScript >>> only works on 32-bit integers, so we split into high/low 32-bit parts
        const high = Math.floor(counter / 0x100000000);
        const low = counter >>> 0;
        const counterHex =
          high.toString(16).padStart(8, "0") +
          low.toString(16).padStart(8, "0");

        // Create HMAC-SHA1 using CryptoJS
        // IMPORTANT: Must parse hex strings into WordArrays first
        // CryptoJS treats raw strings as UTF-8 text, not hex-encoded binary
        const C = CryptoJS as any;
        const counterWords = C.enc.Hex.parse(counterHex);
        const secretWords = C.enc.Hex.parse(secretHex);
        const hmacHex = C.HmacSHA1(counterWords, secretWords).toString();
        console.log(`[verifyTOTP] Counter: ${counter}, CounterHex: ${counterHex}`);

        console.log(`[verifyTOTP] Window ${i}: HMAC computed, length: ${hmacHex.length}`);

        // Convert hex string to bytes array
        const hashBytes: number[] = [];
        for (let j = 0; j < hmacHex.length; j += 2) {
          hashBytes.push(parseInt(hmacHex.substr(j, 2), 16));
        }

        // Dynamic truncation per RFC 6238
        const offset = hashBytes[hashBytes.length - 1] & 0x0f;
        const code =
          ((hashBytes[offset] & 0x7f) << 24) |
          ((hashBytes[offset + 1] & 0xff) << 16) |
          ((hashBytes[offset + 2] & 0xff) << 8) |
          (hashBytes[offset + 3] & 0xff);

        // Extract 6-digit code
        const totpCode = (code % 1000000).toString().padStart(6, "0");
        console.log(`[verifyTOTP] Window ${i}: generated ${totpCode}, comparing with ${token}`);

        if (totpCode === token) {
          console.log("[verifyTOTP] ✓ Token verified successfully");
          return true;
        }
      } catch (windowError: any) {
        console.error(`[verifyTOTP] Error processing window ${i}:`, windowError.message);
      }
    }

    console.log("[verifyTOTP] ✗ Token verification failed - code does not match secret");
    return false;
  } catch (e: any) {
    console.error("[verifyTOTP] ✗ Unexpected error verifying TOTP token:", e.message);
    return false;
  }
}

/**
 * Generate a TOTP secret in base32 format
 */
function generateTOTPSecret(): string {
  // Generate a random 32-character base32 string
  // This will be used by the user's authenticator app (Google Authenticator, Authy, etc)
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";

  for (let i = 0; i < 32; i++) {
    secret += alphabet[Math.floor(Math.random() * 32)];
  }

  return secret;
}

/**
 * Hash a password using bcryptjs
 */
export const hashPassword = action({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    return await bcrypt.hash(args.password, 10);
  },
});

/**
 * Verify a password against a hash
 */
export const verifyPassword = action({
  args: { password: v.string(), hash: v.string() },
  handler: async (ctx, args) => {
    return await bcrypt.compare(args.password, args.hash);
  },
});

/**
 * Generate TOTP secret
 */
export const generateTOTPSecretAction = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const secret = generateTOTPSecret();

    return { secret };
  },
});

/**
 * Verify a TOTP code against a secret
 * This performs proper HMAC-SHA1 based verification using speakeasy
 */
export const verifyTOTPCodeAction = action({
  args: { secret: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    // Validate token format
    if (!/^\d{6}$/.test(args.token)) {
      return false;
    }

    // Verify the token against the secret using proper TOTP verification
    const isValid = verifyTOTP(args.secret, args.token);
    return isValid;
  },
});

/**
 * Verify TOTP code during login
 * Retrieves the user's TOTP secret and verifies the provided code
 * Includes rate limiting to prevent brute force attacks
 * This is the main function used by the login page for MFA verification
 */
export const verifyTOTPCodeForLogin = action({
  args: { userId: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    // Validate token format
    if (!/^\d{6}$/.test(args.token)) {
      throw new ConvexError("Invalid authentication code format.");
    }

    // Get user and check for rate limiting
    const user = (await ctx.runQuery(internal.users.getUserById, {
      userId: args.userId,
    })) as any;

    if (!user) {
      throw new ConvexError("User not found.");
    }

    // Check if user is locked out due to too many failed attempts
    const now = Date.now();
    if (user.mfaLockedUntil && now < user.mfaLockedUntil) {
      const minutesRemaining = Math.ceil((user.mfaLockedUntil - now) / 60000);
      throw new ConvexError(
        `Too many failed attempts. Please try again in ${minutesRemaining} minute(s).`
      );
    }

    // Check if TOTP code was recently used (prevent code reuse)
    if (
      user.lastUsedTOTPCode === args.token &&
      user.lastTOTPCodeTime &&
      now - user.lastTOTPCodeTime < 30000 // 30 seconds
    ) {
      throw new ConvexError(
        "This authentication code was just used. Please wait for a new code to be generated."
      );
    }

    // Get user's TOTP secret
    if (!user.mfaEnabled || !user.totpSecret) {
      throw new ConvexError("MFA not properly configured. Please contact support.");
    }

    // Verify the TOTP code against the secret
    const isValid = verifyTOTP(user.totpSecret, args.token);
    if (!isValid) {
      // Increment failed attempts
      const failedAttempts = (user.mfaFailedAttempts || 0) + 1;
      const updates: Record<string, any> = { mfaFailedAttempts: failedAttempts };

      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        updates.mfaLockedUntil = now + 15 * 60 * 1000; // 15 minutes
        console.warn(
          `[MFA] User ${args.userId} locked due to ${failedAttempts} failed attempts`
        );
      }

      await ctx.runMutation(internal.users.updateUserFields, {
        userId: args.userId,
        updates: updates,
      });

      throw new ConvexError(
        `Invalid authentication code. ${5 - failedAttempts} attempt(s) remaining before lockout.`
      );
    }

    // Success - reset failed attempts and store the used code to prevent reuse
    await ctx.runMutation(internal.users.updateUserFields, {
      userId: args.userId,
      updates: {
        mfaFailedAttempts: 0,
        mfaLockedUntil: undefined,
        lastUsedTOTPCode: args.token,
        lastTOTPCodeTime: now,
      },
    });

    return { valid: true };
  },
});

/**
 * Create a new user account with email verification required
 */
export const createAccount = action({
  args: { name: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ userId: string; verificationToken: string; email: string }> => {
    // Normalize email to lowercase for consistency
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.users.getUserByEmail, { email: normalizedEmail });
    if (existingUser) {
      throw new ConvexError("This email is already registered. Please sign in instead.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Derive encryption key from password
    const masterEncryptionKey = deriveEncryptionKey(args.password);

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user in database
    const userId = await ctx.runMutation(internal.users.createNewUser, {
      name: args.name,
      email: normalizedEmail,
      password: hashedPassword,
      verificationToken: verificationToken,
      verificationTokenExpiry: verificationTokenExpiry,
      masterEncryptionKey: masterEncryptionKey,
    });

    // Send verification email
    console.log("[createAccount] Sending verification email to:", normalizedEmail);
    try {
      const emailResult = await ctx.runAction(api.emails.sendVerificationEmail, {
        userId: userId as any,
        email: normalizedEmail,
        verificationToken: verificationToken,
      });
      console.log("[createAccount] Verification email result:", emailResult);
      if (!emailResult.success) {
        console.error("[createAccount] Failed to send verification email:", emailResult.error);
      }
    } catch (emailError: any) {
      console.error("[createAccount] Error sending verification email:", emailError);
    }

    return { userId, verificationToken, email: args.email };
  },
});

/**
 * Authenticate user with email/password
 */
export const loginUser = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ userId: string; mfaEnabled: boolean }> => {
    const trimmedEmail = args.email.trim();
    console.log("[loginUser] Attempting login with email:", trimmedEmail);

    // Try exact match first (for existing accounts), then try normalized (for new accounts)
    let user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail });
    console.log("[loginUser] Exact match result:", user ? "FOUND" : "not found");

    // If not found with exact case, try lowercase (for new accounts with normalization)
    if (!user) {
      console.log("[loginUser] Trying lowercase match:", trimmedEmail.toLowerCase());
      user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail.toLowerCase() });
      console.log("[loginUser] Lowercase match result:", user ? "FOUND" : "not found");
    }

    if (!user) {
      console.error("[loginUser] User not found for email:", trimmedEmail);
      throw new ConvexError("No secure identity found for this email address.");
    }

    console.log("[loginUser] User found:", user._id);

    // Check if user has a password (OAuth users don't)
    if (!user.password) {
      throw new ConvexError("This account is registered with OAuth. Please use Google or Microsoft sign-in instead.");
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(args.password, user.password);
    if (!passwordMatch) {
      throw new ConvexError("Incorrect password. Please try again.");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ConvexError("Please verify your email before logging in. Check your inbox for verification link.");
    }

    return { userId: user._id, mfaEnabled: user.mfaEnabled ?? false };
  },
});

/**
 * Set up MFA for a user
 * Verifies the provided TOTP code against the secret before enabling MFA
 */
export const setupMFA = action({
  args: { userId: v.string(), totpSecret: v.string(), totpCode: v.string() },
  handler: async (ctx, args) => {
    try {
      console.log("[setupMFA] Starting MFA setup for user:", args.userId);

      // Get user
      const user = (await ctx.runQuery(internal.users.getUserById, { userId: args.userId })) as any;
      console.log("[setupMFA] User query result:", user ? "Found" : "Not found");

      if (!user) {
        throw new ConvexError("User not found.");
      }

      if (user.mfaEnabled) {
        throw new ConvexError("MFA is already enabled. Disable it first to reconfigure.");
      }

      // Validate code format
      if (!/^\d{6}$/.test(args.totpCode)) {
        throw new ConvexError("Invalid authentication code format.");
      }

      console.log("[setupMFA] Code validation passed, verifying TOTP code");

      // Verify the TOTP code against the secret
      // This must succeed before we enable MFA
      const isCodeValid = verifyTOTP(args.totpSecret, args.totpCode);
      if (!isCodeValid) {
        throw new ConvexError("Invalid authentication code. Please check your authenticator app and try again.");
      }

      console.log("[setupMFA] TOTP code verified successfully");

      // Generate cryptographically secure backup codes
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const backupCodes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);
        const code = Array.from(randomBytes, b => chars[b % chars.length]).join('');
        backupCodes.push(code);
      }

      console.log("[setupMFA] Generated backup codes, attempting to save MFA settings");

      // Save MFA settings
      await ctx.runMutation(internal.users.saveMFASettings, {
        userId: args.userId,
        totpSecret: args.totpSecret,
        backupCodes: backupCodes,
      });

      console.log("[setupMFA] MFA settings saved successfully");
      return { backupCodes };
    } catch (error) {
      console.error("[setupMFA] Error during MFA setup:", error);
      throw error;
    }
  },
});

/**
 * Request password reset - generates token and sends email
 */
export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = args.email.trim();
    console.log("[requestPasswordReset] Starting for email:", trimmedEmail);

    // Try exact match first, then try lowercase for backward compatibility
    let user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail });
    if (!user) {
      user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail.toLowerCase() });
    }

    console.log("[requestPasswordReset] User lookup result:", user ? `Found user ${user._id}` : "No user found");

    if (!user) {
      console.log("[requestPasswordReset] User not found - returning error");
      return { success: false, error: "No account found with this email address. Please create an account first." };
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const resetTokenExpiry = Date.now() + 1 * 60 * 60 * 1000; // 1 hour expiry

    console.log("[requestPasswordReset] Generated reset token:", resetToken);

    // Save reset token to database
    await ctx.runMutation(internal.users.savePasswordResetToken, {
      userId: user._id,
      resetToken: resetToken,
      resetTokenExpiry: resetTokenExpiry,
    });

    console.log("[requestPasswordReset] Saved reset token to database");

    // Send password reset email
    console.log("[requestPasswordReset] About to call sendPasswordResetEmail action");
    const emailResult = await ctx.runAction(api.emails.sendPasswordResetEmail, {
      email: trimmedEmail,
      resetToken: resetToken,
    });

    console.log("[requestPasswordReset] Email result:", emailResult);

    if (!emailResult.success) {
      console.error(`[requestPasswordReset] Failed to send password reset email to ${args.email}:`, emailResult.error);
      return { success: false, error: "Failed to send password reset email. Please try again." };
    } else {
      console.log(`[requestPasswordReset] Password reset email sent successfully to ${args.email}`);
    }

    return { success: true };
  },
});

/**
 * Reset password with valid token
 */
export const resetPassword = action({
  args: { email: v.string(), resetToken: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    // Validate password length
    if (args.newPassword.length < 8) {
      throw new ConvexError("Password must be at least 8 characters.");
    }

    const trimmedEmail = args.email.trim();

    // Try exact match first, then try lowercase for backward compatibility
    let user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail });
    if (!user) {
      user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail.toLowerCase() });
    }

    if (!user) {
      throw new ConvexError("User not found.");
    }

    // Validate reset token
    if (user.resetToken !== args.resetToken) {
      throw new ConvexError("Invalid reset token.");
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      throw new ConvexError("Reset token has expired. Please request a new one.");
    }

    // Hash new password with proper error handling
    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(args.newPassword, 10);
    } catch (hashError) {
      console.error("Password hashing failed:", hashError);
      throw new ConvexError("Failed to process password. Please try again.");
    }

    // Verify the hash was created successfully
    if (!hashedPassword || hashedPassword.length === 0) {
      throw new ConvexError("Password hashing failed. Please try again.");
    }

    // Update password and clear reset token
    await ctx.runMutation(internal.users.updatePassword, {
      userId: user._id,
      newPassword: hashedPassword,
    });

    return { success: true };
  },
});

/**
 * Disable MFA for a user (admin/support function)
 * Used to reset MFA if user loses access to their authenticator
 */
export const disableMFA = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const user = (await ctx.runQuery(internal.users.getUserById, {
        userId: args.userId,
      })) as any;

      if (!user) {
        throw new ConvexError("User not found.");
      }

      // Update user to disable MFA
      await ctx.runMutation(internal.users.updateUserFields, {
        userId: args.userId,
        updates: {
          mfaEnabled: false,
          totpSecret: undefined,
          backupCodes: [],
          mfaFailedAttempts: 0,
          mfaLockedUntil: undefined,
        },
      });

      console.log(`[disableMFA] MFA disabled for user: ${args.userId}`);
      return { success: true };
    } catch (error: any) {
      console.error("[disableMFA] Error disabling MFA:", error.message);
      throw new ConvexError("Failed to disable MFA. Please contact support.");
    }
  },
});

/**
 * Derive the encryption key from password after login
 * Used to decrypt files on the client side
 */
export const deriveEncryptionKeyAction = action({
  args: { password: v.string() },
  handler: async (ctx, args): Promise<{ encryptionKey: string }> => {
    const encryptionKey = deriveEncryptionKey(args.password);
    return { encryptionKey };
  },
});

/**
 * Create or update OAuth user account
 * Called when user authenticates via Google, Microsoft, or other OAuth provider
 */
export const createOrUpdateOAuthUser = action({
  args: {
    provider: v.string(), // "google" | "microsoft"
    providerId: v.string(), // unique ID from OAuth provider
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ userId: string; isNewUser: boolean; mfaEnabled: boolean }> => {
    const trimmedEmail = args.email.trim();

    // Try exact match first, then try lowercase for backward compatibility
    let existingUserByEmail = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail });
    if (!existingUserByEmail) {
      existingUserByEmail = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail.toLowerCase() });
    }

    if (existingUserByEmail) {
      // User already exists - update OAuth info if needed
      const oauthProviderId = `${args.provider}_${args.providerId}`;
      await ctx.runMutation(internal.users.updateOAuthUser, {
        userId: existingUserByEmail._id,
        authProvider: args.provider,
        oauthProviderId: oauthProviderId,
        oauthEmail: trimmedEmail,
        oauthName: args.name,
        oauthAvatarUrl: args.avatarUrl || existingUserByEmail.oauthAvatarUrl || "",
      });

      return {
        userId: existingUserByEmail._id.toString(),
        isNewUser: false,
        mfaEnabled: existingUserByEmail.mfaEnabled ?? false,
      };
    }

    // Create new OAuth user
    const oauthProviderId = `${args.provider}${args.providerId}`;

    // Generate random encryption key for OAuth user (no password-based derivation)
    const masterEncryptionKey = generateEncryptionKey();

    // Normalize new emails to lowercase for consistency
    const normalizedEmail = trimmedEmail.toLowerCase();

    const userId = await ctx.runMutation(internal.users.createOAuthUser, {
      name: args.name,
      email: normalizedEmail,
      authProvider: args.provider,
      oauthProviderId: oauthProviderId,
      oauthEmail: normalizedEmail,
      oauthName: args.name,
      oauthAvatarUrl: args.avatarUrl || "",
      masterEncryptionKey: masterEncryptionKey,
      emailVerified: true, // OAuth providers verify email
      lastCheckIn: Date.now(),
    });


    // Send welcome email to new OAuth user
    console.log("[createOrUpdateOAuthUser] Sending welcome email to:", normalizedEmail);
    try {
      const emailResult = await ctx.runAction(api.emails.sendWelcomeEmail, {
        userId: userId as any,
        email: normalizedEmail,
        name: args.name,
      });
      console.log("[createOrUpdateOAuthUser] Welcome email result:", emailResult);
      if (!emailResult.success) {
        console.error("[createOrUpdateOAuthUser] Failed to send welcome email:", emailResult.error);
      }
    } catch (emailError: any) {
      console.error("[createOrUpdateOAuthUser] Error sending welcome email:", emailError);
    }

    return {
      userId: userId.toString(),
      isNewUser: true,
      mfaEnabled: false,
    };
  },
});

/**
 * Resend verification email to user
 */
export const resendVerificationEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string; error?: string }> => {
    const trimmedEmail = args.email.toLowerCase().trim();
    console.log("[resendVerificationEmail] Starting for email:", trimmedEmail);

    try {
      // Find user by email
      let user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail });
      if (!user) {
        // Try lowercase lookup for backward compatibility
        user = await ctx.runQuery(internal.users.getUserByEmail, { email: trimmedEmail.toLowerCase() });
      }

      if (!user) {
        console.error("[resendVerificationEmail] User not found for email:", trimmedEmail);
        throw new ConvexError("Email address not found in our system.");
      }

      // Check if email is already verified
      if (user.emailVerified) {
        console.log("[resendVerificationEmail] Email already verified for user:", user._id);
        return {
          success: true,
          message: "This email has already been verified! You can log in now.",
        };
      }

      // Check if user has a verification token
      if (!user.verificationToken) {
        console.error("[resendVerificationEmail] No verification token found for user:", user._id);
        throw new ConvexError("Cannot resend verification - token missing. Please contact support.");
      }

      // Resend verification email
      console.log("[resendVerificationEmail] Sending verification email to:", trimmedEmail);
      const emailResult = await ctx.runAction(api.emails.sendVerificationEmail, {
        userId: user._id,
        email: trimmedEmail,
        verificationToken: user.verificationToken,
      });

      if (!emailResult.success) {
        console.error("[resendVerificationEmail] Failed to send email:", emailResult.error);
        throw new ConvexError("Failed to send verification email. Please try again later.");
      }

      console.log("[resendVerificationEmail] Verification email sent successfully to:", trimmedEmail);
      return {
        success: true,
        message: "Verification email has been sent! Please check your inbox.",
      };
    } catch (error) {
      console.error("[resendVerificationEmail] Error:", error);
      if (error instanceof ConvexError) {
        return { success: false, error: error.data };
      }
      return { success: false, error: "An error occurred while resending the verification email." };
    }
  },
});
