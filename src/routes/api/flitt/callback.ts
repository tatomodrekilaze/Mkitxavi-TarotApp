import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { handleFlittCallback } from "@/lib/flitt.server";

async function parseCallbackBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    // Some Flitt setups wrap under { response: {...} }
    if (json.response && typeof json.response === "object") {
      return json.response as Record<string, unknown>;
    }
    return json;
  }

  const text = await request.text();
  const params = new URLSearchParams(text);
  const out: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

export const Route = createFileRoute("/api/flitt/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = await parseCallbackBody(request);
          await handleFlittCallback(payload);
          // Flitt expects HTTP 200 with body "OK" for some integrations.
          return new Response("OK", { status: 200 });
        } catch (err) {
          console.error("Flitt callback error", err);
          const message = err instanceof Error ? err.message : "Callback error";
          const status = message.includes("signature") || message.includes("Signature") ? 400 : 500;
          return new Response(message, { status });
        }
      },
      // Some gateways probe with GET
      GET: async () => new Response("Flitt callback ready", { status: 200 }),
    },
  },
});
