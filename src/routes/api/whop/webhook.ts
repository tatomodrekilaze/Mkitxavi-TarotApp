import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { handleWhopWebhook } from "@/lib/whop.server";

export const Route = createFileRoute("/api/whop/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const headers = Object.fromEntries(request.headers.entries());

        try {
          await handleWhopWebhook(rawBody, headers);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Whop webhook error", err);
          const message = err instanceof Error ? err.message : "Webhook error";
          const status =
            message.toLowerCase().includes("signature") || message.toLowerCase().includes("webhook")
              ? 400
              : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
