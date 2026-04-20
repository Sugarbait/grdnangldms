import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query: Validate coupon code
export const validateCoupon = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!coupon) {
      return { valid: false, error: "Coupon not found" };
    }

    const now = Date.now();

    // Check if coupon is active
    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is not active" };
    }

    // Check if coupon has expired
    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, error: "Coupon has expired" };
    }

    // Check if coupon is available yet
    if (now < coupon.validFrom) {
      return { valid: false, error: "Coupon is not yet available" };
    }

    // Check if coupon has reached max uses
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, error: "Coupon has been fully used" };
    }

    return {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountPercentage: coupon.discountPercentage,
      originalPrice: 1.99,
      discountedPrice: (1.99 * (100 - coupon.discountPercentage)) / 100,
    };
  },
});

// Mutation: Apply coupon to subscription (called when subscription is created)
export const applyCouponToSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    couponCode: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.couponCode.toUpperCase()))
      .first();

    if (!coupon) {
      throw new Error("Coupon not found");
    }

    const now = Date.now();

    // Validation checks
    if (!coupon.isActive) {
      throw new Error("Coupon is not active");
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      throw new Error("Coupon has expired");
    }

    if (now < coupon.validFrom) {
      throw new Error("Coupon is not yet available");
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      throw new Error("Coupon has been fully used");
    }

    // Apply coupon to subscription
    await ctx.db.patch(args.subscriptionId, {
      couponCode: coupon.code,
      discountPercentage: coupon.discountPercentage,
      updatedAt: Date.now(),
    });

    // Increment coupon usage
    await ctx.db.patch(coupon._id, {
      currentUses: coupon.currentUses + 1,
    });

    console.log(
      `[Coupons] Applied coupon ${coupon.code} (${coupon.discountPercentage}% off) to subscription ${args.subscriptionId}`
    );

    return {
      success: true,
      discountPercentage: coupon.discountPercentage,
      originalPrice: 1.99,
      discountedPrice: (1.99 * (100 - coupon.discountPercentage)) / 100,
    };
  },
});

// Query: Get all active coupons (for admin/display)
export const getActiveCoupons = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const coupons = await ctx.db.query("coupons").collect();

    return coupons
      .filter((coupon) => {
        // Filter for currently active coupons
        return (
          coupon.isActive &&
          now >= coupon.validFrom &&
          (!coupon.validUntil || now <= coupon.validUntil) &&
          (!coupon.maxUses || coupon.currentUses < coupon.maxUses)
        );
      })
      .map((coupon) => ({
        code: coupon.code,
        description: coupon.description,
        discountPercentage: coupon.discountPercentage,
      }));
  },
});

// Query: Get coupon by code (for admin)
export const getCouponByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!coupon) {
      return null;
    }

    const now = Date.now();
    return {
      code: coupon.code,
      description: coupon.description,
      discountPercentage: coupon.discountPercentage,
      isActive: coupon.isActive,
      maxUses: coupon.maxUses,
      currentUses: coupon.currentUses,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      isCurrentlyValid:
        coupon.isActive &&
        now >= coupon.validFrom &&
        (!coupon.validUntil || now <= coupon.validUntil) &&
        (!coupon.maxUses || coupon.currentUses < coupon.maxUses),
    };
  },
});

// Mutation: Create new coupon (admin only - you can add authentication later)
export const createCoupon = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    discountPercentage: v.number(), // 10, 15, 20, 25, 50, 100
    isActive: v.boolean(),
    maxUses: v.optional(v.number()),
    validFrom: v.number(),
    validUntil: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate discount percentage
    const validPercentages = [10, 15, 20, 25, 50, 100];
    if (!validPercentages.includes(args.discountPercentage)) {
      throw new Error(
        "Invalid discount percentage. Must be one of: 10, 15, 20, 25, 50, 100"
      );
    }

    // Check if coupon code already exists
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existing) {
      throw new Error("Coupon code already exists");
    }

    const couponId = await ctx.db.insert("coupons", {
      code: args.code.toUpperCase(),
      description: args.description,
      discountPercentage: args.discountPercentage,
      isActive: args.isActive,
      maxUses: args.maxUses,
      currentUses: 0,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    console.log(
      `[Coupons] Created new coupon: ${args.code} (${args.discountPercentage}% off)`
    );
    return couponId;
  },
});

// Mutation: Update coupon (admin only)
export const updateCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
    isActive: v.optional(v.boolean()),
    maxUses: v.optional(v.number()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    const updates: Record<string, any> = {};
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.maxUses !== undefined) updates.maxUses = args.maxUses;
    if (args.validUntil !== undefined) updates.validUntil = args.validUntil;

    await ctx.db.patch(args.couponId, updates);

    console.log(`[Coupons] Updated coupon ${coupon.code}`);
    return { success: true };
  },
});

// Query: Get coupon statistics (admin)
export const getCouponStats = query({
  args: {},
  handler: async (ctx) => {
    const coupons = await ctx.db.query("coupons").collect();
    const now = Date.now();

    const stats = {
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter(
        (c) =>
          c.isActive &&
          now >= c.validFrom &&
          (!c.validUntil || now <= c.validUntil) &&
          (!c.maxUses || c.currentUses < c.maxUses)
      ).length,
      totalUsage: coupons.reduce((sum, c) => sum + c.currentUses, 0),
      byDiscount: {
        10: coupons.filter((c) => c.discountPercentage === 10).length,
        15: coupons.filter((c) => c.discountPercentage === 15).length,
        20: coupons.filter((c) => c.discountPercentage === 20).length,
        25: coupons.filter((c) => c.discountPercentage === 25).length,
        50: coupons.filter((c) => c.discountPercentage === 50).length,
        100: coupons.filter((c) => c.discountPercentage === 100).length,
      },
    };

    return stats;
  },
});
