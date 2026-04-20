import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Stripe webhook endpoint
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get Stripe signature from headers
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
          status: 400,
        });
      }

      // Get raw body
      const body = await request.text();

      // Call the webhook handler action
      const result = await ctx.runAction(api.stripeActions.handleStripeWebhook, {
        signature,
        body,
      });

      if (result.success) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: result.error }), { status: 400 });
      }
    } catch (error: any) {
      console.error("[HTTP] Error processing Stripe webhook:", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }),
});

export default http;
