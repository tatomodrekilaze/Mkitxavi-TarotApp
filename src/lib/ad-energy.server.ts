import { getSupabaseAdminClient, getSupabaseUserClient } from "@/lib/supabase/admin";
import { fetchOpsRuntimeConfig } from "@/lib/ops-runtime.server";

export type AdWatchSource = "overlay" | "gam" | "simulate";

export type BeginAdWatchResult =
  | {
      ok: true;
      ticket: string;
      eligibleAt: string;
      expiresAt: string;
      minWatchSeconds: number;
    }
  | { ok: false; error: string };

export type ClaimAdEnergyResult = { ok: true; energy: number } | { ok: false; error: string };

async function requireUserId(accessToken: string): Promise<string | null> {
  const supabase = getSupabaseUserClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

export async function beginAdWatchForUser(
  accessToken: string,
  source: AdWatchSource,
): Promise<BeginAdWatchResult> {
  const userId = await requireUserId(accessToken);
  if (!userId) return { ok: false, error: "unauthorized" };

  const runtime = await fetchOpsRuntimeConfig();
  if (!runtime.flags.adsEnabled) {
    return { ok: false, error: "ads_disabled" };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("begin_ad_watch", {
    p_user_id: userId,
    p_source: source,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("daily ad limit")) return { ok: false, error: "daily_limit" };
    if (msg.includes("too many pending")) return { ok: false, error: "pending_limit" };
    console.warn("[beginAdWatch]", msg);
    return { ok: false, error: "begin_failed" };
  }

  const row = data as {
    ticket?: string;
    eligible_at?: string;
    expires_at?: string;
    min_watch_seconds?: number;
  } | null;

  if (!row?.ticket || !row.eligible_at || !row.expires_at) {
    return { ok: false, error: "begin_failed" };
  }

  return {
    ok: true,
    ticket: row.ticket,
    eligibleAt: row.eligible_at,
    expiresAt: row.expires_at,
    minWatchSeconds: Number(row.min_watch_seconds ?? 28),
  };
}

export async function claimAdEnergyForUser(
  accessToken: string,
  ticket: string,
): Promise<ClaimAdEnergyResult> {
  const userId = await requireUserId(accessToken);
  if (!userId) return { ok: false, error: "unauthorized" };

  const runtime = await fetchOpsRuntimeConfig();
  if (!runtime.flags.adsEnabled) {
    return { ok: false, error: "ads_disabled" };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_ad_energy", {
    p_user_id: userId,
    p_ticket: ticket,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("daily ad limit")) return { ok: false, error: "daily_limit" };
    if (msg.includes("watch not finished")) return { ok: false, error: "watch_not_finished" };
    if (msg.includes("ticket")) return { ok: false, error: "invalid_ticket" };
    console.warn("[claimAdEnergy]", msg);
    return { ok: false, error: "claim_failed" };
  }

  if (typeof data !== "number") return { ok: false, error: "claim_failed" };
  return { ok: true, energy: data };
}
