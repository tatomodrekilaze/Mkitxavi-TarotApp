import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether real credentials are present. The app is expected to boot and render
 * with a blank `.env`, so every Supabase call site checks this first rather
 * than throwing at import time.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient<Database> | null = null;

/**
 * Must match the browser origin that stored the PKCE verifier.
 * Do not force apex while the user is on www (localStorage is per-host).
 */
export function authCallbackUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

/**
 * Browser-only client. PKCE verifier lives in localStorage.
 * detectSessionInUrl is off - /auth/callback exchanges the code once.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() must run in the browser");
  }
  cached ??= createClient<Database>(url, anonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
    },
  });
  return cached;
}
