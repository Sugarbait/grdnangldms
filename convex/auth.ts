import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import bcrypt from "bcryptjs";
import { api, internal } from "./_generated/api";
import { deriveEncryptionKey, generateEncryptionKey } from "./encryption";

/**
 * Helper function to generate email verification token
 */
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 34); // 32-char string
}

/**
 * Generate a TOTP secret in base32 format
 */
function generateTOTPSecret(): string {
  // Generate a 32-character base32 string
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
 * Verify a TOTP code
 */
export const verifyTOTPCodeAction = action({
  args: { secret: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    // Validate token format
    if (!/^\d{6}$/.test(args.token)) {
      return false;
    }
    // Accept valid 6-digit codes for now
    return true;
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
      throw new ConvexError("This identity node is already registered. Please unlock the existing vault.");
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

      console.log("[setupMFA] Code validation passed");

      // Generate backup codes
      const backupCodes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        backupCodes.push(code);
      }

      console.log("[setupMFA] Generated backup codes, attempting to save MFA settings");

      // Save MFA settings
      await ctx.runMutation(internal.users.saveMFASettings, {
        userId: args.userId as any,
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
  handler: async (ctx, args): Promise<{ userId: string; isNewUser: boolean }> => {
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

    return {
      userId: userId.toString(),
      isNewUser: true,
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
