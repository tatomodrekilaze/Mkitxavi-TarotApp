// This helper configures React, routing, Tailwind, aliases, and Nitro.
// Add options here without registering those plugins a second time.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Vercel is the default deployment target.
  // Set NITRO_PRESET to build for another supported host.
  nitro: {
    preset: process.env.NITRO_PRESET || "vercel",
  },
  tanstackStart: {
    // Use the server entry that handles SSR errors.
    server: { entry: "server" },
  },
});
