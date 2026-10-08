import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { Database } from "./types";
import { requirePublicConfig } from "./admin";

/**
 * Request-scoped client that reads the session from cookies.
 * Do not import this file from client components.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  const cfg = requirePublicConfig();

  return createServerClient<Database>(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies() ?? {}).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options);
        }
      },
    },
  });
}
