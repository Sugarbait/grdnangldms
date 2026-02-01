
import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Internal query: Get recipient by ID
 */
export const getRecipientById = internalQuery({
  args: { recipientId: v.id("recipients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.recipientId);
  },
});

/**
 * Internal mutation: Update recipient
 */
export const updateRecipientInternal = internalMutation({
  args: { recipientId: v.id("recipients"), updates: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipientId, args.updates);
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    relationship: v.string(),
    email: v.string(),
    phone: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipients", { ...args, status: "pending", canTriggerCheckIn: false });
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    recipientId: v.id("recipients"),
    name: v.string(),
    relationship: v.string(),
    email: v.string(),
    phone: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { recipientId, userId, ...data } = args;

    // Verify recipient belongs to user
    const recipient = await ctx.db.get(recipientId);
    if (!recipient || recipient.userId !== userId) {
      throw new ConvexError("Recipient not found or does not belong to user");
    }

    await ctx.db.patch(recipientId, data);
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), recipientId: v.id("recipients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recipientId);
  },
});

export const updateCheckInPermission = action({
  args: {
    userId: v.id("users"),
    recipientId: v.id("recipients"),
    canTriggerCheckIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, recipientId, canTriggerCheckIn } = args;

    // Verify recipient belongs to user
    const recipient = await ctx.runQuery(internal.recipients.getRecipientById, { recipientId });
    if (!recipient || recipient.userId !== userId) {
      throw new ConvexError("Recipient not found or does not belong to user");
    }

    // Generate new token if enabling permission
    let updateData: any = { canTriggerCheckIn };
    if (canTriggerCheckIn) {
      // Generate a 32-character alphanumeric token
      const token = Math.random().toString(36).substring(2, 34) + Math.random().toString(36).substring(2, 8);
      updateData.checkInAuthToken = token;
      updateData.checkInAuthTokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      // Clear token when disabling
      updateData.checkInAuthToken = undefined;
      updateData.checkInAuthTokenExpiry = undefined;
    }

    await ctx.runMutation(internal.recipients.updateRecipientInternal, {
      recipientId,
      updates: updateData,
    });
  },
});
