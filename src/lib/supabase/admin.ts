import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function requirePublicConfig(): { url: string; anonKey: string } {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }
  return { url, anonKey };
}

/**
 * Browser auth is stored in localStorage (PKCE), not cookies - so server
 * functions often see no session. Use the caller's access token instead.
 */
export function getSupabaseUserClient(accessToken: string): SupabaseClient<Database> {
  const cfg = requirePublicConfig();
  return createClient<Database>(cfg.url, cfg.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Bypasses Row Level Security. Only for trusted server-side work.
 * Never import this from a React component.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  const cfg = requirePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin/webhook operations.");
  }

  return createClient<Database>(cfg.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
