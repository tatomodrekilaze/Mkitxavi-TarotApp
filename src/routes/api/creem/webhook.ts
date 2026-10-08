import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { handleCreemWebhook } from "@/lib/creem.server";

export const Route = createFileRoute("/api/creem/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("creem-signature");
        if (!signature) {
          return new Response("Missing creem-signature", { status: 400 });
        }

        const rawBody = await request.text();

        try {
          await handleCreemWebhook(rawBody, signature);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Creem webhook error", err);
          const message = err instanceof Error ? err.message : "Webhook error";
          const status = message.includes("signature") || message.includes("Signature") ? 400 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
