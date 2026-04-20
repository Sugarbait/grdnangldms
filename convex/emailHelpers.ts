
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

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

    // Flatten into list of { timer, reminderThreshold } pairs for each reminder that needs sending
    const remindersToSend: Array<{ timer: Doc<"timers">; reminderThreshold: number }> = [];

    for (const timer of allTimers) {
      // Skip if timer is not active (stopped, triggered, or not started)
      if (timer.status !== "active") continue;

      // Skip if emails already sent (timer already expired)
      if (timer.emailsSentAt && timer.emailsSentAt > timer.lastReset) continue;

      // Calculate time remaining
      const elapsed = (now - timer.lastReset) / 1000;
      const remaining = timer.durationSeconds - elapsed;

      // Check multiple reminder thresholds (new system)
      if (timer.reminderSecondsArray && timer.reminderSecondsArray.length > 0) {
        for (const threshold of timer.reminderSecondsArray) {
          // Check if this specific reminder was already sent for this cycle
          const remindersSentAt = (timer.remindersSentAt || {}) as Record<string, number>;
          const alreadySent = remindersSentAt[threshold.toString()] && remindersSentAt[threshold.toString()] > timer.lastReset;

          if (alreadySent) continue;

          // Send reminder if remaining time is <= threshold and > 0
          if (remaining <= threshold && remaining > 0) {
            remindersToSend.push({ timer, reminderThreshold: threshold });
          }
        }
      } else if (timer.reminderSeconds) {
        // Fallback to old single-reminder system for backwards compatibility
        // Skip if reminder already sent for this cycle
        if (timer.reminderSentAt && timer.reminderSentAt > timer.lastReset) continue;

        // Send reminder if remaining time is less than or equal to reminder threshold
        // but timer hasn't expired yet
        if (remaining <= timer.reminderSeconds && remaining > 0) {
          remindersToSend.push({ timer, reminderThreshold: timer.reminderSeconds });
        }
      }
    }

    return remindersToSend;
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
  args: { timerId: v.id("timers"), reminderThreshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    if (!timer) return;

    if (args.reminderThreshold !== undefined) {
      // New multi-reminder system: track which specific reminder thresholds were sent
      const remindersSentAt = (timer.remindersSentAt || {}) as Record<string, number>;
      remindersSentAt[args.reminderThreshold.toString()] = Date.now();
      await ctx.db.patch(args.timerId, { remindersSentAt });
    } else {
      // Old single-reminder system for backwards compatibility
      await ctx.db.patch(args.timerId, { reminderSentAt: Date.now() });
    }
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

// Internal mutation to clear reminder sent flag (used when email send fails)
export const clearReminderSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { reminderSentAt: undefined });
  },
});

// Internal mutation to clear emails sent flag (used when all email sends fail)
export const clearEmailsSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { emailsSentAt: undefined });
  },
});

// Internal mutation to clear check-in alert sent flag (used when all email sends fail)
export const clearCheckInAlertSent = internalMutation({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timerId, { checkInAlertSentAt: undefined });
  },
});

// Internal query to find authorized recipients needing check-in alert
export const getAuthorizedRecipientsNeedingAlert = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allTimers = await ctx.db.query("timers").collect();
    const now = Date.now();
    const DEFAULT_ALERT_THRESHOLD_SECONDS = 86400; // 24 hours before expiry

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

      // Use custom threshold if set, otherwise use default
      const alertThreshold = timer.checkInAlertSeconds || DEFAULT_ALERT_THRESHOLD_SECONDS;

      // Calculate time remaining
      const elapsed = (now - timer.lastReset) / 1000;
      const remaining = timer.durationSeconds - elapsed;

      // Check if we're in the alert window (custom threshold or less, but timer hasn't expired)
      if (remaining <= alertThreshold && remaining > 0) {
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

// Internal mutation to mark trial expiring email as sent (prevents duplicate sends)
export const markTrialExpiringEmailSent = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, { trialExpiringEmailSentAt: Date.now() });
  },
});

// Internal mutation to clear trial expiring email sent flag (used when email send fails)
export const clearTrialExpiringEmailSent = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, { trialExpiringEmailSentAt: undefined });
  },
});

// Internal query to find trials expiring in the next hour
export const getTrialsExpiringInOneHour = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourLater = now + 60 * 60 * 1000;

    const subscriptions = await ctx.db.query("subscriptions").collect();

    const trialsExpiring = subscriptions.filter((sub) => {
      // Skip if email already sent
      if ((sub as any).trialExpiringEmailSentAt) return false;

      return (
        sub.status === "trial" &&
        sub.trialEndsAt > now &&
        sub.trialEndsAt <= oneHourLater
      );
    });

    // Enrich with user data
    const enriched = [];
    for (const subscription of trialsExpiring) {
      const user = await ctx.db.get(subscription.userId);
      enriched.push({
        subscription,
        user,
      });
    }

    return enriched;
  },
});

// Internal query to find expired trials
export const getExpiredTrials = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const subscriptions = await ctx.db.query("subscriptions").collect();

    const expiredTrials = subscriptions.filter((sub) => {
      return (
        sub.status === "trial" &&
        sub.trialEndsAt <= now
      );
    });

    // Enrich with user data
    const enriched = [];
    for (const subscription of expiredTrials) {
      const user = await ctx.db.get(subscription.userId);
      enriched.push({
        subscription,
        user,
      });
    }

    return enriched;
  },
});

// Internal mutation to mark trial expiry email as sent
export const markTrialExpirySent = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (subscription) {
      await ctx.db.patch(args.subscriptionId, {
        status: "trial_expired",
        updatedAt: Date.now(),
      });

      // Update user's subscription status
      await ctx.db.patch(subscription.userId, {
        subscriptionStatus: "trial_expired",
      });
    }
  },
});
