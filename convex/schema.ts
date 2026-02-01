
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
    masterEncryptionKey: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    authProvider: v.optional(v.string()),
    oauthProviderId: v.optional(v.string()),
    oauthEmail: v.optional(v.string()),
    oauthName: v.optional(v.string()),
    oauthAvatarUrl: v.optional(v.string()),
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
    checkInTokenSentAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  timers: defineTable({
    userId: v.id("users"),
    status: v.string(),
    durationSeconds: v.number(),
    lastReset: v.number(),
    emailsSentAt: v.optional(v.number()), // Timestamp when notification emails were sent
    reminderSeconds: v.optional(v.number()), // How many seconds before expiry to send reminder (e.g., 600 = 10 min)
    reminderSentAt: v.optional(v.number()), // Timestamp when reminder email was sent
    checkInAlertSentAt: v.optional(v.number()), // Timestamp when check-in alert sent to authorized recipients
  }).index("by_user", ["userId"]).index("by_status", ["status"]),
});
