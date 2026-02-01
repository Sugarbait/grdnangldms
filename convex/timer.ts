
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!timer) return null;

    const elapsed = (Date.now() - timer.lastReset) / 1000;
    const remaining = Math.max(0, timer.durationSeconds - elapsed);

    return {
      ...timer,
      remainingSeconds: Math.floor(remaining),
      // Return actual database status, not computed status
    };
  },
});

export const checkAndTrigger = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("[checkAndTrigger] Called for userId:", args.userId);

    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!timer) {
      console.log("[checkAndTrigger] No timer found for userId:", args.userId);
      return { triggered: false, error: "No timer found" };
    }

    const elapsed = (Date.now() - timer.lastReset) / 1000;
    const remaining = Math.max(0, timer.durationSeconds - elapsed);

    console.log("[checkAndTrigger] Timer state:", {
      timerId: timer._id,
      elapsed,
      remaining,
      durationSeconds: timer.durationSeconds,
      currentStatus: timer.status,
    });

    // If already triggered, return success
    if (timer.status === "triggered") {
      console.log("[checkAndTrigger] Timer already triggered");
      return { triggered: true, alreadyTriggered: true, timerId: timer._id };
    }

    // If timer has expired (remaining <= 0) or is very close to expiring (within 2 seconds),
    // update status to triggered. This handles client-server timing discrepancies where
    // the client has determined the timer should trigger but server is still slightly ahead.
    // The client has already done the local countdown calculation, so we trust it.
    if (remaining <= 2) {
      console.log("[checkAndTrigger] Triggering timer - updating status to 'triggered' (remaining:", remaining + ")");
      await ctx.db.patch(timer._id, { status: "triggered" });
      return { triggered: true, timerId: timer._id };
    }

    console.log("[checkAndTrigger] Timer not yet expired");
    return { triggered: false, remaining };
  },
});

export const reset = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (timer) {
      await ctx.db.patch(timer._id, {
        lastReset: Date.now(),
        status: "active",
        emailsSentAt: undefined, // Clear emails sent flag when resetting
        reminderSentAt: undefined, // Clear reminder sent flag when resetting
        checkInAlertSentAt: undefined, // Clear check-in alert flag when resetting
      });
    }
  },
});

export const trigger = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (timer) {
      await ctx.db.patch(timer._id, { status: "triggered", lastReset: 0 });
    }
  },
});

export const updateDuration = mutation({
  args: { userId: v.id("users"), durationSeconds: v.number() },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (timer) {
      await ctx.db.patch(timer._id, {
        durationSeconds: args.durationSeconds,
        lastReset: Date.now(), // Reset the timer when duration changes
        emailsSentAt: undefined, // Clear email sent flag
        reminderSentAt: undefined, // Clear reminder sent flag
      });
    } else {
      // Create a new timer if one doesn't exist
      await ctx.db.insert("timers", {
        userId: args.userId,
        durationSeconds: args.durationSeconds,
        lastReset: Date.now(),
        status: "active",
      });
    }
  },
});

export const updateReminder = mutation({
  args: { userId: v.id("users"), reminderSeconds: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (timer) {
      await ctx.db.patch(timer._id, {
        reminderSeconds: args.reminderSeconds,
        reminderSentAt: undefined, // Clear reminder sent flag when setting changes
      });
    }
  },
});

export const stop = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (timer) {
      await ctx.db.patch(timer._id, {
        status: "stopped",
        lastReset: 0,
      });
    }
  },
});

export const resetViaRecipientAuthorization = mutation({
  args: {
    userId: v.id("users"),
    recipientId: v.id("recipients"),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, recipientId, authToken } = args;

    // Get timer
    const timer = await ctx.db
      .query("timers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!timer) {
      throw new Error("Timer not found");
    }

    // Check timer is active
    if (timer.status !== "active") {
      throw new Error("Timer is not active");
    }

    // Get recipient
    const recipient = await ctx.db.get(recipientId);
    if (!recipient || recipient.userId !== userId) {
      throw new Error("Recipient not found or does not belong to user");
    }

    // Verify permission is enabled
    if (!recipient.canTriggerCheckIn) {
      throw new Error("Recipient does not have check-in permission");
    }

    // Verify token matches
    if (recipient.checkInAuthToken !== authToken) {
      throw new Error("Invalid authentication token");
    }

    // Token doesn't expire, but verify it exists
    if (!recipient.checkInAuthToken) {
      throw new Error("No valid authentication token");
    }

    // Reset the timer (same as normal reset)
    await ctx.db.patch(timer._id, {
      lastReset: Date.now(),
      status: "active",
      emailsSentAt: undefined,
      reminderSentAt: undefined,
      checkInAlertSentAt: undefined,
    });

    return { success: true, message: "Timer reset by authorized recipient" };
  },
});
