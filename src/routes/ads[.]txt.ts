import { createFileRoute } from "@tanstack/react-router";
import { adsTxtBody } from "@/lib/ads";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(adsTxtBody() + "\n", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
