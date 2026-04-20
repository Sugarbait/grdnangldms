
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastCheckIn: v.number(),
    emailVerified: v.optional(v.boolean()),
    verificationToken: v.optional(v.string()),
    verificationTokenExpiry: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    resetToken: v.optional(v.string()),
    resetTokenExpiry: v.optional(v.number()),
    mfaEnabled: v.optional(v.boolean()),
    totpSecret: v.optional(v.string()),
    backupCodes: v.optional(v.array(v.string())),
    mfaSetupRequired: v.optional(v.boolean()),
    mfaFailedAttempts: v.optional(v.number()), // Track failed MFA attempts for rate limiting
    mfaLockedUntil: v.optional(v.number()), // Timestamp when MFA lock expires (rate limiting)
    lastUsedTOTPCode: v.optional(v.string()), // Prevent TOTP code reuse
    lastTOTPCodeTime: v.optional(v.number()), // Timestamp of last TOTP code use
    masterEncryptionKey: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    authProvider: v.optional(v.string()),
    oauthProviderId: v.optional(v.string()),
    oauthEmail: v.optional(v.string()),
    oauthName: v.optional(v.string()),
    oauthAvatarUrl: v.optional(v.string()),
    // Subscription fields (denormalized for quick access)
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()), // "trial" | "active" | "past_due" | "canceled" | "trial_expired"
    welcomeEmailSentAt: v.optional(v.number()), // Timestamp when welcome email was sent | "active" | "past_due" | "canceled" | "trial_expired"
  }).index("by_email", ["email"]).index("by_oauth_provider_id", ["oauthProviderId"]),

  files: defineTable({
    userId: v.id("users"),
    name: v.string(),
    size: v.string(),
    type: v.string(),
    content: v.optional(v.string()),
    plaintext: v.optional(v.string()), // Unencrypted plaintext for messages (used in emails)
    audioStorageId: v.optional(v.id("_storage")),
    imageStorageId: v.optional(v.id("_storage")),
    documentStorageId: v.optional(v.id("_storage")),
    audioData: v.optional(v.string()), // Deprecated: kept for backwards compatibility with existing documents
    recipientIds: v.array(v.string()),
    addedDate: v.string(),
    isEncrypted: v.boolean(),
  }).index("by_user", ["userId"]),

  recipients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    relationship: v.string(),
    email: v.string(),
    phone: v.string(),
    avatarUrl: v.optional(v.string()),
    status: v.string(),
    canTriggerCheckIn: v.optional(v.boolean()),
    checkInAuthToken: v.optional(v.string()),
    checkInAuthTokenExpiry: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  timers: defineTable({
    userId: v.id("users"),
    status: v.string(),
    durationSeconds: v.number(),
    lastReset: v.number(),
    emailsSentAt: v.optional(v.number()), // Timestamp when notification emails were sent
    reminderSeconds: v.optional(v.number()), // DEPRECATED: kept for backwards compatibility
    reminderSentAt: v.optional(v.number()), // DEPRECATED: kept for backwards compatibility
    reminderSecondsArray: v.optional(v.array(v.number())), // Array of reminder thresholds (e.g., [300, 1500] for 5 and 25 min)
    remindersSentAt: v.optional(v.any()), // Object tracking which reminders were sent: { "300": timestamp, "1500": timestamp }
    checkInAlertSentAt: v.optional(v.number()), // Timestamp when check-in alert sent to authorized recipients
    checkInAlertSeconds: v.optional(v.number()), // How many seconds before expiry to send check-in helper alert (e.g., 86400 = 24 hours)
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(), // Stripe customer ID
    stripeSubscriptionId: v.optional(v.string()), // null until first payment
    status: v.string(), // "trial" | "active" | "past_due" | "canceled" | "trial_expired"
    trialEndsAt: v.number(), // timestamp when free trial expires
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(), // true if canceling but letting current period finish
    couponCode: v.optional(v.string()), // Coupon code applied to subscription
    discountPercentage: v.optional(v.number()), // Discount percentage (0-100)
    createdAt: v.number(),
    updatedAt: v.number(),
    lastWebhookId: v.optional(v.string()), // Last processed Stripe webhook ID for idempotency
    trialExpiringEmailSentAt: v.optional(v.number()), // Timestamp when "trial expiring" email was sent (prevents duplicates)
  }).index("by_user", ["userId"]).index("by_stripe_customer", ["stripeCustomerId"]),

  // Tracks emails that have already received a free trial — persists even after account deletion
  usedTrialEmails: defineTable({
    email: v.string(),
    usedAt: v.number(),
  }).index("by_email", ["email"]),

  coupons: defineTable({
    code: v.string(), // Coupon code (e.g., "SAVE10", "WELCOME50")
    description: v.string(), // Human-readable description
    discountPercentage: v.number(), // Discount percentage (10, 15, 20, 25, 50, 100)
    isActive: v.boolean(), // Whether coupon is currently active
    maxUses: v.optional(v.number()), // Max number of times coupon can be used (null = unlimited)
    currentUses: v.number(), // Current number of times coupon has been used
    validFrom: v.number(), // Start date (timestamp)
    validUntil: v.optional(v.number()), // End date (timestamp, null = no expiry)
    createdAt: v.number(),
    createdBy: v.string(), // Admin user who created the coupon
  }).index("by_code", ["code"]),
});
