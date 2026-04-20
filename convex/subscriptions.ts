import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Internal Query: Get subscription by user ID
export const getSubscription = internalQuery({
  args: { userId: v.union(v.id("users"), v.string()) },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .first();

    return subscription;
  },
});

// Query: Check if trial is still active
export const isTrialActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) return false;
    if (subscription.status !== "trial") return false;

    const now = Date.now();
    return now < subscription.trialEndsAt;
  },
});

// Query: Check if user can access paid features
export const canAccessPaidFeatures = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) return false;

    // Can access if: trial is active, or subscription is active/past_due
    const now = Date.now();
    const isTrialActive = subscription.status === "trial" && now < subscription.trialEndsAt;
    const isPaidActive = subscription.status === "active" || subscription.status === "past_due";

    return isTrialActive || isPaidActive;
  },
});

// Query: Get file upload limit based on subscription
export const getFileUploadLimit = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) return 5; // Default to 5 for guests/new users

    const now = Date.now();
    const isTrialActive = subscription.status === "trial" && now < subscription.trialEndsAt;
    const isPaidActive = subscription.status === "active" || subscription.status === "past_due";

    // Paid tiers have unlimited files
    if (isPaidActive) return Infinity;

    // Trial tier has 5 file limit
    if (isTrialActive) return 5;

    // Trial expired or canceled = 5 file viewing only (no new uploads)
    return 0;
  },
});

// Internal Mutation: Update or create Stripe customer ID for a user's subscription.
// If the subscription already exists, only the stripeCustomerId is updated — the
// trial timing and status are NEVER reset. This prevents accidental trial extension
// when re-creating a live-mode Stripe customer for an existing subscriber.
export const initializeTrial = internalMutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .first();

    if (existing) {
      // Subscription already exists — only update the Stripe customer ID.
      // Do NOT touch status or trialEndsAt to avoid resetting the trial clock.
      await ctx.db.patch(existing._id, {
        stripeCustomerId: args.stripeCustomerId,
        updatedAt: now,
      });
      // Keep denormalized field in sync
      await ctx.db.patch(args.userId as any, {
        stripeCustomerId: args.stripeCustomerId,
      });
      console.log(`[Subscriptions] Updated stripeCustomerId for existing subscription ${existing._id}`);
      return existing._id;
    }

    // No existing subscription — create a fresh one with 24hr trial
    const trialEndsAt = now + 24 * 60 * 60 * 1000;
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId as any,
      stripeCustomerId: args.stripeCustomerId,
      status: "trial",
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
      cancelAtPeriodEnd: false,
    });
    await ctx.db.patch(args.userId as any, {
      stripeCustomerId: args.stripeCustomerId,
      subscriptionStatus: "trial",
    });
    console.log(`[Subscriptions] Created new trial subscription ${subscriptionId}`);
    return subscriptionId;
  },
});

// Internal Mutation: Update subscription from webhook
export const updateSubscriptionFromWebhook = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(), // "active" | "past_due" | "canceled"
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    webhookId: v.string(), // For idempotency
  },
  handler: async (ctx, args) => {
    // Find subscription by Stripe customer ID
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found for customer: ${args.stripeCustomerId}`);
    }

    // Idempotency check: skip if we already processed this webhook
    if (subscription.lastWebhookId === args.webhookId) {
      console.log(`[Subscriptions] Webhook ${args.webhookId} already processed, skipping`);
      return subscription._id;
    }

    // Update subscription
    const now = Date.now();
    const updates: Record<string, any> = {
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      updatedAt: now,
      lastWebhookId: args.webhookId,
    };

    if (args.currentPeriodStart) updates.currentPeriodStart = args.currentPeriodStart;
    if (args.currentPeriodEnd) updates.currentPeriodEnd = args.currentPeriodEnd;
    if (args.canceledAt) updates.canceledAt = args.canceledAt;

    await ctx.db.patch(subscription._id, updates);

    // Update denormalized user field
    await ctx.db.patch(subscription.userId, {
      subscriptionStatus: args.status,
    });

    console.log(`[Subscriptions] Updated subscription for ${args.stripeCustomerId} to status: ${args.status}`);
    return subscription._id;
  },
});

// Mutation: Transition trial to expired
export const markTrialExpired = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.status !== "trial") {
      throw new Error("Can only expire trial subscriptions");
    }

    const now = Date.now();

    // Update subscription
    await ctx.db.patch(subscription._id, {
      status: "trial_expired",
      updatedAt: now,
    });

    // Update user
    await ctx.db.patch(args.userId, {
      subscriptionStatus: "trial_expired",
    });

    return subscription._id;
  },
});

// Mutation: Cancel subscription (for user-initiated cancellation)
export const cancelSubscription = mutation({
  args: {
    userId: v.id("users"),
    cancelAtPeriodEnd: v.boolean(), // true = cancel after period ends, false = immediate
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const now = Date.now();

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      canceledAt: args.cancelAtPeriodEnd ? undefined : now,
      status: args.cancelAtPeriodEnd ? subscription.status : "canceled",
      updatedAt: now,
    });

    return subscription._id;
  },
});

// Query: Get full subscription status for frontend
// tier: "guest" (no subscription), "trial" (active 24hr), "subscriber" (paid active), "expired" (trial ran out or canceled)
export const getSubscriptionStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // No subscription record = guest user, no paid features
    if (!subscription) {
      return {
        status: "guest" as const,
        trialEndsAt: 0,
        canAccessPaidFeatures: false,
        isTrialActive: false,
        isPaidActive: false,
        tier: "guest" as const,
      };
    }

    const now = Date.now();
    const isTrialActive = subscription.status === "trial" && now < subscription.trialEndsAt;
    const isTrialExpired = subscription.status === "trial" && now >= subscription.trialEndsAt;
    const isPaidActive = subscription.status === "active" || subscription.status === "past_due";

    // Determine user-facing tier
    let tier: "guest" | "trial" | "subscriber" | "expired";
    if (isPaidActive) {
      tier = "subscriber";
    } else if (isTrialActive) {
      tier = "trial";
    } else {
      tier = "expired"; // trial_expired, canceled, or trial past trialEndsAt
    }

    // Can access features if: trial is active OR paid subscription is active
    const canAccessPaidFeatures = isTrialActive || isPaidActive;

    return {
      status: isTrialExpired ? "trial_expired" : subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      canAccessPaidFeatures,
      isTrialActive,
      isPaidActive,
      tier,
      stripeCustomerId: subscription.stripeCustomerId,
    };
  },
});

// Query: Find users with trials expiring in next 1 hour
export const getUsersWithTrialExpiringInOneHour = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourLater = now + 60 * 60 * 1000;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .collect();

    return subscriptions.filter((sub) => {
      return (
        sub.status === "trial" &&
        sub.trialEndsAt > now &&
        sub.trialEndsAt <= oneHourLater
      );
    });
  },
});

// Query: Find users with expired trials
export const getUsersWithExpiredTrials = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const subscriptions = await ctx.db
      .query("subscriptions")
      .collect();

    return subscriptions.filter((sub) => {
      return (
        sub.status === "trial" &&
        sub.trialEndsAt <= now
      );
    });
  },
});
