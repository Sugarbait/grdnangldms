
import { mutation, query, internalQuery, internalMutation, action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Internal query: Get user by email
 */
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Internal query: Get user by ID
 */
export const getUserById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId as any);
  },
});

/**
 * Internal query: Get user's TOTP secret for login verification
 * Used during MFA login to retrieve the secret needed for verification
 */
export const getTOTPSecretForLogin = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = (await ctx.db.get(args.userId as any)) as any;
    if (!user) {
      throw new ConvexError("User not found.");
    }

    if (!user.mfaEnabled) {
      throw new ConvexError("MFA is not enabled for this user.");
    }

    if (!user.totpSecret) {
      throw new ConvexError("TOTP secret not found.");
    }

    return { totpSecret: user.totpSecret };
  },
});

/**
 * Query: Check if MFA is enabled for a user (public - safe to expose)
 * Frontend calls this during login to determine if TOTP verification is needed
 */
export const checkMFAEnabled = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = (await ctx.db.get(args.userId as any)) as any;
    if (!user) {
      throw new ConvexError("User not found.");
    }

    return { mfaEnabled: user.mfaEnabled ?? false };
  },
});

/**
 * Internal mutation: Create new user account
 */
export const createNewUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    verificationToken: v.string(),
    verificationTokenExpiry: v.number(),
    masterEncryptionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      password: args.password,
      lastCheckIn: Date.now(),
      emailVerified: false,
      verificationToken: args.verificationToken,
      verificationTokenExpiry: args.verificationTokenExpiry,
      mfaEnabled: false,
      mfaSetupRequired: true,
      masterEncryptionKey: args.masterEncryptionKey,
      onboardingComplete: false,
    });

    // Initialize timer
    await ctx.db.insert("timers", {
      userId: userId,
      status: "active",
      durationSeconds: 604800, // 7 days
      lastReset: Date.now(),
    });

    // Check if this email has already had a free trial
    const now = Date.now();
    const previousTrial = await ctx.db
      .query("usedTrialEmails")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    const trialGranted = !previousTrial;
    const trialEndsAt = trialGranted ? now + 24 * 60 * 60 * 1000 : 0;
    const trialStatus = trialGranted ? "trial" : "trial_expired";
    const tempCustomerId = `temp_${userId}_${Date.now()}`;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: userId,
      stripeCustomerId: tempCustomerId,
      status: trialStatus,
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
      cancelAtPeriodEnd: false,
    });

    await ctx.db.patch(userId, {
      stripeCustomerId: tempCustomerId,
      subscriptionStatus: trialStatus,
    });

    // Record this email as having used a trial (only if trial was actually granted)
    if (trialGranted) {
      await ctx.db.insert("usedTrialEmails", {
        email: args.email.toLowerCase(),
        usedAt: now,
      });
    }

    console.log(`[createNewUser] Created user ${userId} with subscription status: ${trialStatus}`);
    return userId;
  },
});

/**
 * Internal mutation: Save MFA settings
 */
export const saveMFASettings = internalMutation({
  args: {
    userId: v.string(),
    totpSecret: v.string(),
    backupCodes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId as any, {
      mfaEnabled: true,
      totpSecret: args.totpSecret,
      backupCodes: args.backupCodes,
      mfaSetupRequired: false,
    });
  },
});

/**
 * Internal mutation: Update user fields (for MFA rate limiting, etc)
 */
export const updateUserFields = internalMutation({
  args: {
    userId: v.string(),
    updates: v.any(), // Flexible updates object
  },
  handler: async (ctx, args) => {
    const updateObj: Record<string, any> = args.updates;
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updateObj).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(args.userId as any, cleanUpdates);
  },
});

/**
 * Retrieves a user profile by ID
 */
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId || args.userId === "skip") return null;
    try {
      // Try to get user directly - Convex handles ID normalization
      const user = await ctx.db.get(args.userId as any);
      if (!user) return null;
      return user;
    } catch (e) {
      // Log the error but don't log out on query errors
      console.error("Error fetching user:", e);
      return undefined; // Return undefined instead of null to distinguish from "not found"
    }
  },
});

/**
 * Updates a user profile
 */
export const update = mutation({
  args: { userId: v.id("users"), name: v.string(), email: v.string(), avatarUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, ...data } = args;
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Identity node not found.");
    await ctx.db.patch(userId, data);
  },
});

/**
 * Reset user account (clear files, recipients, reset timer)
 */
export const fullReset = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Purge files
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);

    // Purge recipients
    const recipients = await ctx.db
      .query("recipients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const r of recipients) await ctx.db.delete(r._id);

    // Reset timer
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (timer) await ctx.db.patch(timer._id, { status: "active", lastReset: Date.now() });
  },
});

/**
 * Permanently delete user account and all associated data
 */
export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("[deleteAccount] Starting account deletion for user:", args.userId);

    // Delete all files for this user
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    console.log("[deleteAccount] Deleting", files.length, "files");
    for (const f of files) {
      await ctx.db.delete(f._id);
    }

    // Delete all recipients for this user
    const recipients = await ctx.db
      .query("recipients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    console.log("[deleteAccount] Deleting", recipients.length, "recipients");
    for (const r of recipients) {
      await ctx.db.delete(r._id);
    }

    // Delete timer for this user
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (timer) {
      console.log("[deleteAccount] Deleting timer");
      await ctx.db.delete(timer._id);
    }

    // Delete the user itself
    console.log("[deleteAccount] Deleting user record");
    await ctx.db.delete(args.userId);

    console.log("[deleteAccount] Account deletion complete");
    return { success: true };
  },
});

/**
 * Internal mutation: Verify email token and mark email as verified
 */
export const verifyEmailTokenMutation = internalMutation({
  args: { email: v.string(), verificationToken: v.string() },
  handler: async (ctx, args) => {
    console.log("[verifyEmailTokenMutation] Verifying email:", args.email);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      console.error("[verifyEmailTokenMutation] User not found for email:", args.email);
      throw new ConvexError("This email address is not registered. Please create an account first.");
    }

    // Check if already verified
    if (user.emailVerified) {
      console.log("[verifyEmailTokenMutation] Email already verified for user:", user._id);
      throw new ConvexError("This email has already been verified! You can now log in.");
    }

    // Check token validity
    if (user.verificationToken !== args.verificationToken) {
      console.error("[verifyEmailTokenMutation] Invalid verification token");
      throw new ConvexError("This verification link is invalid. Please check your email for the correct link.");
    }

    if (!user.verificationTokenExpiry || user.verificationTokenExpiry < Date.now()) {
      console.error("[verifyEmailTokenMutation] Token expired for user:", user._id);
      throw new ConvexError("Your verification link has expired. We can send you a new one!");
    }

    console.log("[verifyEmailTokenMutation] Token is valid, marking email as verified");
    // Mark email as verified
    await ctx.db.patch(user._id, {
      emailVerified: true,
      verificationToken: undefined,
      verificationTokenExpiry: undefined,
      verifiedAt: Date.now(),
    });

    return { success: true, userId: user._id.toString(), userEmail: user.email, userName: user.name };
  },
});

/**
 * Action: Verify email token and set up Stripe + trial subscription
 */
export const verifyEmailToken = action({
  args: { email: v.string(), verificationToken: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; userId: string }> => {
    console.log("[verifyEmailToken] Starting email verification for:", args.email);

    // Call internal mutation to verify token and mark email
    const result: any = await ctx.runMutation(internal.users.verifyEmailTokenMutation, {
      email: args.email,
      verificationToken: args.verificationToken,
    });

    const userId: string = result.userId;
    const userEmail: string = result.userEmail;
    const userName: string = result.userName;

    // Create Stripe customer
    console.log("[verifyEmailToken] Creating Stripe customer for user:", userId);
    const stripeResult: any = await ctx.runAction(api.stripeActions.createStripeCustomer, {
      email: userEmail,
      name: userName,
    });
    const stripeCustomerId: string = stripeResult.id;

    // Initialize trial subscription
    console.log("[verifyEmailToken] Initializing trial subscription for user:", userId);
    await ctx.runMutation(internal.subscriptions.initializeTrial, {
      userId: userId as any,
      stripeCustomerId: stripeCustomerId,
    });

    console.log("[verifyEmailToken] Email verified and trial initialized for user:", userId);

    // Send welcome email to newly verified user
    console.log("[verifyEmailToken] Sending welcome email to:", userEmail);
    try {
      const emailResult: any = await ctx.runAction(api.emails.sendWelcomeEmail, {
        userId: userId as any,
        email: userEmail,
        name: userName,
      });
      console.log("[verifyEmailToken] Welcome email result:", emailResult);
      if (!emailResult.success) {
        console.error("[verifyEmailToken] Failed to send welcome email:", emailResult.error);
      }
    } catch (emailError: any) {
      console.error("[verifyEmailToken] Error sending welcome email:", emailError);
    }

    return { success: true, userId };
  },
});

/**
 * Get TOTP secret for QR code generation (called on MFA setup page)
 * This query is called to fetch the TOTP secret that was generated during signup
 */
export const getTOTPSecret = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found.");
    }

    if (user.mfaEnabled) {
      throw new ConvexError("MFA is already enabled.");
    }

    // Generate fresh TOTP secret - this should be called via auth.generateTOTPSecret action
    // For now we'll return a placeholder that the frontend will use
    throw new ConvexError("Use the generateTOTPSecret action to get a fresh secret.");
  },
});

/**
 * Verify TOTP code during login
 */
export const verifyTOTPCode = mutation({
  args: { userId: v.id("users"), totpCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.totpSecret) {
      throw new ConvexError("MFA not enabled.");
    }

    // This should be verified via auth.verifyTOTPCode action
    throw new ConvexError("Use the verifyTOTPCode action to verify the code.");
  },
});

/**
 * Use a backup code for login when TOTP device is unavailable
 */
export const usedBackupCode = mutation({
  args: { userId: v.id("users"), backupCode: v.string() },
  handler: async (ctx, args) => {
    console.log("[usedBackupCode] Verifying backup code for user:", args.userId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.error("[usedBackupCode] User not found:", args.userId);
      throw new ConvexError("User not found.");
    }

    if (!user.backupCodes || user.backupCodes.length === 0) {
      console.error("[usedBackupCode] MFA not enabled for user:", args.userId);
      throw new ConvexError("MFA not enabled for this account.");
    }

    console.log("[usedBackupCode] User has", user.backupCodes.length, "backup codes");
    const codeIndex = user.backupCodes.indexOf(args.backupCode);
    if (codeIndex === -1) {
      console.error("[usedBackupCode] Invalid backup code provided");
      throw new ConvexError("Invalid backup code. Please check and try again.");
    }

    console.log("[usedBackupCode] Valid backup code found at index:", codeIndex);
    // Remove used code from array
    const updatedCodes = user.backupCodes.filter((_, i) => i !== codeIndex);
    await ctx.db.patch(user._id, { backupCodes: updatedCodes });

    console.log("[usedBackupCode] Backup code removed. Remaining codes:", updatedCodes.length);
    return { valid: true, remainingCodes: updatedCodes.length };
  },
});

/**
 * Internal mutation: Save password reset token
 */
export const savePasswordResetToken = internalMutation({
  args: {
    userId: v.id("users"),
    resetToken: v.string(),
    resetTokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      resetToken: args.resetToken,
      resetTokenExpiry: args.resetTokenExpiry,
    });
  },
});

/**
 * Internal mutation: Update password and clear reset token
 */
export const updatePassword = internalMutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      password: args.newPassword,
      resetToken: undefined,
      resetTokenExpiry: undefined,
      emailVerified: true,
    });
  },
});

/**
 * Mutation: Mark onboarding as complete for a user
 */
export const completeOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("[completeOnboarding] Starting for user:", args.userId);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.error("[completeOnboarding] User not found:", args.userId);
      throw new ConvexError("User not found.");
    }

    console.log("[completeOnboarding] Updating onboardingComplete to true");
    await ctx.db.patch(args.userId, {
      onboardingComplete: true,
    });

    console.log("[completeOnboarding] Success! Onboarding completed for user:", args.userId);
    return { success: true };
  },
});

/**
 * Internal mutation: Create OAuth user account
 */
export const createOAuthUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    authProvider: v.string(),
    oauthProviderId: v.string(),
    oauthEmail: v.string(),
    oauthName: v.string(),
    oauthAvatarUrl: v.string(),
    masterEncryptionKey: v.string(),
    emailVerified: v.boolean(),
    lastCheckIn: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      authProvider: args.authProvider,
      oauthProviderId: args.oauthProviderId,
      oauthEmail: args.oauthEmail,
      oauthName: args.oauthName,
      oauthAvatarUrl: args.oauthAvatarUrl,
      lastCheckIn: args.lastCheckIn,
      emailVerified: args.emailVerified,
      masterEncryptionKey: args.masterEncryptionKey,
      mfaEnabled: false,
      mfaSetupRequired: false,
      onboardingComplete: false,
    });

    // Initialize timer for OAuth user
    await ctx.db.insert("timers", {
      userId: userId,
      status: "active",
      durationSeconds: 604800, // 7 days
      lastReset: Date.now(),
    });

    // Check if this email has already had a free trial
    const now = Date.now();
    const emailToCheck = (args.oauthEmail || "").toLowerCase();
    const previousTrial = await ctx.db
      .query("usedTrialEmails")
      .withIndex("by_email", (q) => q.eq("email", emailToCheck))
      .first();

    const trialGranted = !previousTrial && !!emailToCheck;
    const trialEndsAt = trialGranted ? now + 24 * 60 * 60 * 1000 : 0;
    const trialStatus = trialGranted ? "trial" : "trial_expired";
    const tempCustomerId = `temp_${userId}_${Date.now()}`;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: userId,
      stripeCustomerId: tempCustomerId,
      status: trialStatus,
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
      cancelAtPeriodEnd: false,
    });

    await ctx.db.patch(userId, {
      stripeCustomerId: tempCustomerId,
      subscriptionStatus: trialStatus,
    });

    if (trialGranted) {
      await ctx.db.insert("usedTrialEmails", {
        email: emailToCheck,
        usedAt: now,
      });
    }

    console.log(`[createOAuthUser] Created OAuth user ${userId} with subscription status: ${trialStatus}`);
    return userId;
  },
});

/**
 * Internal mutation: Update existing user with OAuth info
 */
export const updateOAuthUser = internalMutation({
  args: {
    userId: v.id("users"),
    authProvider: v.string(),
    oauthProviderId: v.string(),
    oauthEmail: v.string(),
    oauthName: v.string(),
    oauthAvatarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      authProvider: args.authProvider,
      oauthProviderId: args.oauthProviderId,
      oauthEmail: args.oauthEmail,
      oauthName: args.oauthName,
      avatarUrl: args.oauthAvatarUrl || undefined,
    });
  },
});
