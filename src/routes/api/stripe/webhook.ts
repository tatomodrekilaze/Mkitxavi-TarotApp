import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { handleStripeWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing stripe-signature", { status: 400 });
        }

        const rawBody = await request.text();

        try {
          await handleStripeWebhook(rawBody, signature);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Stripe webhook error", err);
          const message = err instanceof Error ? err.message : "Webhook error";
          const status = message.includes("Signature") || message.includes("signature") ? 400 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
