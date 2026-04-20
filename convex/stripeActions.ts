import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import crypto from "crypto";

// Initialize Stripe - only instantiate when STRIPE_SECRET_KEY is available
let stripe: Stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Action: Create Stripe customer
export const createStripeCustomer = action({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
      }

      const customer = await stripe.customers.create({
        email: args.email,
        name: args.name,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      });

      console.log(`[Stripe] Created customer: ${customer.id}`);
      return { id: customer.id, email: customer.email };
    } catch (error: any) {
      console.error("[Stripe] Failed to create customer:", error.message);
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  },
});

// Action: Create checkout session for upgrade
export const createCheckoutSession = action({
  args: {
    userId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string | null }> => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
      }

      // Get user's subscription to find Stripe customer ID
      let subscription: any = await ctx.runQuery(internal.subscriptions.getSubscription, {
        userId: args.userId as any,
      });

      let stripeCustomerId: string;

      const storedCustomerId = subscription?.stripeCustomerId;
      let customerIsValid = false;

      // Verify the stored customer exists in live Stripe (test-mode IDs will fail here)
      if (storedCustomerId && !storedCustomerId.startsWith("temp_")) {
        try {
          await stripe.customers.retrieve(storedCustomerId);
          customerIsValid = true;
          console.log(`[Checkout] Customer ${storedCustomerId} verified in live Stripe`);
        } catch (err: any) {
          console.warn(`[Checkout] Customer ${storedCustomerId} not found in live Stripe (likely test-mode ID): ${err.message}`);
          customerIsValid = false;
        }
      }

      if (!customerIsValid) {
        // No valid customer — create a new live-mode Stripe customer
        console.log(`[Checkout] Creating new live Stripe customer for user ${args.userId}...`);

        const user: any = await ctx.runQuery(internal.users.getUserById, {
          userId: args.userId as any,
        });

        if (!user) {
          throw new Error("User not found");
        }

        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: args.userId,
            createdAt: new Date().toISOString(),
          },
        });
        stripeCustomerId = customer.id;
        console.log(`[Checkout] Created live customer: ${stripeCustomerId}`);

        // Persist the new live customer ID
        await ctx.runMutation(internal.subscriptions.initializeTrial, {
          userId: args.userId as any,
          stripeCustomerId: stripeCustomerId,
        });
      } else {
        stripeCustomerId = storedCustomerId!;
      }

      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        throw new Error("STRIPE_PRICE_ID not configured");
      }

      // Create checkout session
      const sessionConfig: any = {
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        subscription_data: {
          metadata: {
            userId: args.userId,
            couponCode: args.couponCode || "",
          },
        },
      };

      const session: any = await stripe.checkout.sessions.create(sessionConfig);

      console.log(`[Stripe] Created checkout session: ${session.id}`);
      return { url: session.url };
    } catch (error: any) {
      console.error("[Stripe] Failed to create checkout session:", error.message, "| type:", error.type, "| code:", error.code, "| statusCode:", error.statusCode);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  },
});

// Action: Get customer billing portal URL
export const getBillingPortalUrl = action({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: args.customerId,
        return_url: args.returnUrl,
      });

      console.log(`[Stripe] Created billing portal session`);
      return { url: session.url };
    } catch (error: any) {
      console.error("[Stripe] Failed to create billing portal URL:", error.message);
      throw new Error(`Failed to access billing portal: ${error.message}`);
    }
  },
});

// Action: Get billing portal URL with automatic live-mode customer migration
// Handles the case where stored customer ID is from test mode
export const getPortalUrl = action({
  args: {
    userId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    // Get subscription record
    const subscription: any = await ctx.runQuery(internal.subscriptions.getSubscription, {
      userId: args.userId as any,
    });

    let customerId: string | null = subscription?.stripeCustomerId || null;

    // Verify the customer exists in live Stripe (test-mode IDs won't exist)
    let customerIsValid = false;
    if (customerId && !customerId.startsWith("temp_")) {
      try {
        await stripe.customers.retrieve(customerId);
        customerIsValid = true;
        console.log(`[Portal] Customer ${customerId} verified in live Stripe`);
      } catch (err: any) {
        console.warn(`[Portal] Customer ${customerId} not found in live Stripe (likely test-mode ID): ${err.message}`);
        customerIsValid = false;
      }
    }

    // If customer doesn't exist in live mode, create a new live customer
    if (!customerIsValid) {
      const user: any = await ctx.runQuery(internal.users.getUserById, {
        userId: args.userId as any,
      });
      if (!user) throw new Error("User not found");

      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: args.userId },
      });
      customerId = newCustomer.id;
      console.log(`[Portal] Created new live customer ${customerId} for user ${args.userId}`);

      // Persist new live customer ID
      await ctx.runMutation(internal.subscriptions.initializeTrial, {
        userId: args.userId as any,
        stripeCustomerId: customerId,
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId!,
      return_url: args.returnUrl,
    });

    console.log(`[Portal] Created billing portal session for customer ${customerId}`);
    return { url: session.url };
  },
});

// Action: Cancel subscription
export const cancelStripeSubscription = action({
  args: {
    subscriptionId: v.string(),
    atPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
      }

      if (args.atPeriodEnd) {
        // Schedule cancellation at period end
        await stripe.subscriptions.update(args.subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancel immediately
        await stripe.subscriptions.cancel(args.subscriptionId);
      }

      console.log(`[Stripe] Canceled subscription: ${args.subscriptionId}`);
      return { success: true };
    } catch (error: any) {
      console.error("[Stripe] Failed to cancel subscription:", error.message);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  },
});

// Action: Handle Stripe webhook
export const handleStripeWebhook = action({
  args: {
    signature: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
      }

      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET not configured");
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          args.body,
          args.signature,
          webhookSecret
        );
      } catch (error: any) {
        console.error("[Webhook] Invalid signature:", error.message);
        return { success: false, error: "Invalid signature" };
      }

      console.log(`[Webhook] Received event: ${event.type} (ID: ${event.id})`);

      // Handle different event types
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionEvent(ctx, subscription, event.id);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(ctx, subscription, event.id);
          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object as any;
          if (session.mode === "subscription" && session.subscription) {
            console.log(`[Webhook] Checkout completed, retrieving subscription ${session.subscription}`);
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            await handleSubscriptionEvent(ctx, subscription, event.id);
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            const subscriptionId = typeof invoice.subscription === "string"
              ? invoice.subscription
              : (invoice.subscription as any).id;
            await handlePaymentFailed(ctx, subscriptionId, event.id);
          }
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      return { success: true, eventId: event.id };
    } catch (error: any) {
      console.error("[Webhook] Error processing webhook:", error.message);
      return { success: false, error: error.message };
    }
  },
});

// Helper: Handle subscription created/updated
async function handleSubscriptionEvent(
  ctx: any,
  subscription: Stripe.Subscription,
  webhookId: string
) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  // Map Stripe status to our status
  let status = "active";
  if (subscription.status === "past_due") status = "past_due";
  if (subscription.status === "canceled" || subscription.canceled_at) status = "canceled";

  await ctx.runMutation(internal.subscriptions.updateSubscriptionFromWebhook, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status,
    currentPeriodStart: (subscription as any).current_period_start * 1000,
    currentPeriodEnd: (subscription as any).current_period_end * 1000,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    webhookId,
  });

  console.log(`[Webhook] Updated subscription for customer ${customerId} to status: ${status}`);
}

// Helper: Handle subscription deleted
async function handleSubscriptionDeleted(
  ctx: any,
  subscription: Stripe.Subscription,
  webhookId: string
) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  await ctx.runMutation(internal.subscriptions.updateSubscriptionFromWebhook, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: "canceled",
    canceledAt: Date.now(),
    webhookId,
  });

  console.log(`[Webhook] Canceled subscription for customer ${customerId}`);
}

// Helper: Handle payment failed
async function handlePaymentFailed(
  ctx: any,
  subscriptionId: string,
  webhookId: string
) {
  try {
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

    // Update to past_due status
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromWebhook, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "past_due",
      webhookId,
    });

    console.log(`[Webhook] Marked subscription ${subscriptionId} as past_due`);

    // TODO: Send payment failed email
    // await sendPaymentFailedEmail(userId)
  } catch (error: any) {
    console.error("[Webhook] Error handling payment failure:", error.message);
  }
}

// Action: Verify subscription status directly with Stripe
// Called from frontend after returning from checkout to ensure status is synced
export const verifySubscription = action({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!stripe) {
        throw new Error("Stripe is not configured.");
      }

      // Get the subscription record from our database
      const subscription: any = await ctx.runQuery(internal.subscriptions.getSubscription, {
        userId: args.userId as any,
      });

      if (!subscription || !subscription.stripeCustomerId || subscription.stripeCustomerId.startsWith("temp_")) {
        console.log(`[VerifySubscription] No valid subscription found for user ${args.userId}`);
        return { verified: false, status: "no_subscription" };
      }

      // List active subscriptions for this customer from Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (stripeSubscriptions.data.length > 0) {
        const activeSub = stripeSubscriptions.data[0];
        console.log(`[VerifySubscription] Found active Stripe subscription ${activeSub.id} for customer ${subscription.stripeCustomerId}`);

        // Update our database to match Stripe's state
        await ctx.runMutation(internal.subscriptions.updateSubscriptionFromWebhook, {
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: activeSub.id,
          status: "active",
          currentPeriodStart: (activeSub as any).current_period_start * 1000,
          currentPeriodEnd: (activeSub as any).current_period_end * 1000,
          webhookId: `verify_${Date.now()}`,
        });

        return { verified: true, status: "active" };
      }

      // Also check for past_due subscriptions
      const pastDueSubs = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
        status: "past_due",
        limit: 1,
      });

      if (pastDueSubs.data.length > 0) {
        const pastDueSub = pastDueSubs.data[0];
        await ctx.runMutation(internal.subscriptions.updateSubscriptionFromWebhook, {
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: pastDueSub.id,
          status: "past_due",
          webhookId: `verify_${Date.now()}`,
        });

        return { verified: true, status: "past_due" };
      }

      console.log(`[VerifySubscription] No active subscription found in Stripe for customer ${subscription.stripeCustomerId}`);
      return { verified: false, status: "no_active_subscription" };
    } catch (error: any) {
      console.error("[VerifySubscription] Error:", error.message);
      return { verified: false, status: "error", error: error.message };
    }
  },
});
