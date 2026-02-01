
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query to get all data needed for sending emails
export const getTriggeredUserData = internalQuery({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (!timer) return null;

    const user = await ctx.db.get(timer.userId);
    if (!user) return null;

    const recipients = await ctx.db
      .query("recipients")
      .withIndex("by_user", (q) => q.eq("userId", timer.userId))
      .collect();

    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", timer.userId))
      .collect();

    return { timer, user, recipients, files };
  },
});

// Internal mutation to mark emails as sent
export const markEmailsSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { emailsSentAt: Date.now() });
  },
});

// Internal query to get user by ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Internal query to find timers that need email notifications
export const getExpiredTimers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allTimers = await ctx.db.query("timers").collect();
    const now = Date.now();

    return allTimers.filter((timer) => {
      // Skip if emails already sent
      if (timer.emailsSentAt) return false;

      // Check if timer has expired
      const elapsed = (now - timer.lastReset) / 1000;
      const expired = elapsed >= timer.durationSeconds;

      return expired;
    });
  },
});

// Internal query to find timers that need reminder emails
export const getTimersNeedingReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allTimers = await ctx.db.query("timers").collect();
    const now = Date.now();

    return allTimers.filter((timer) => {
      // Skip if no reminder set
      if (!timer.reminderSeconds) return false;

      // Skip if reminder already sent for this cycle
      if (timer.reminderSentAt && timer.reminderSentAt > timer.lastReset) return false;

      // Skip if emails already sent (timer already expired)
      if (timer.emailsSentAt && timer.emailsSentAt > timer.lastReset) return false;

      // Calculate time remaining
      const elapsed = (now - timer.lastReset) / 1000;
      const remaining = timer.durationSeconds - elapsed;

      // Send reminder if remaining time is less than or equal to reminder threshold
      // but timer hasn't expired yet
      const shouldRemind = remaining <= timer.reminderSeconds && remaining > 0;

      return shouldRemind;
    });
  },
});

// Internal query to get user's timer by userId
export const getUserTimer = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Internal mutation to mark reminder as sent
export const markReminderSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { reminderSentAt: Date.now() });
  },
});

// Internal query to get timer by userId (for reminder checks)
export const getTimerByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Internal mutation to mark reminder as sent (alternative naming)
export const markReminderAsSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { reminderSentAt: Date.now() });
  },
});

// Internal query to find authorized recipients needing check-in alert
export const getAuthorizedRecipientsNeedingAlert = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allTimers = await ctx.db.query("timers").collect();
    const now = Date.now();
    const ALERT_THRESHOLD_SECONDS = 86400; // 24 hours before expiry

    const recipientsToAlert: any[] = [];

    for (const timer of allTimers) {
      // Skip if alert already sent this cycle
      if (timer.checkInAlertSentAt && timer.checkInAlertSentAt > timer.lastReset) {
        continue;
      }

      // Skip if emails already sent (timer expired)
      if (timer.emailsSentAt && timer.emailsSentAt > timer.lastReset) {
        continue;
      }

      // Skip if timer is not active
      if (timer.status !== "active") {
        continue;
      }

      // Calculate time remaining
      const elapsed = (now - timer.lastReset) / 1000;
      const remaining = timer.durationSeconds - elapsed;

      // Check if we're in the alert window (24 hours or less, but timer hasn't expired)
      if (remaining <= ALERT_THRESHOLD_SECONDS && remaining > 0) {
        // Get authorized recipients for this user
        const recipients = await ctx.db
          .query("recipients")
          .withIndex("by_user", (q) => q.eq("userId", timer.userId))
          .collect();

        const authorizedRecipients = recipients.filter(
          (r) => r.canTriggerCheckIn && r.checkInAuthToken
        );

        if (authorizedRecipients.length > 0) {
          recipientsToAlert.push({
            timer,
            recipients: authorizedRecipients,
            user: await ctx.db.get(timer.userId),
          });
        }
      }
    }

    return recipientsToAlert;
  },
});

// Internal mutation to mark check-in alert as sent
export const markCheckInAlertSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { checkInAlertSentAt: Date.now() });
  },
});
