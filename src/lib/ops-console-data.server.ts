import bcrypt from "bcryptjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/link-preview";
import {
  ALL_PERMISSIONS,
  PROTECTED_ROLES,
  ROLE_RANK,
  can,
  type OpsActionResult,
  type OpsAnalytics,
  type OpsAnnouncementRow,
  type OpsChallengeRow,
  type OpsContactRow,
  type OpsDevHealth,
  type OpsDeviceCluster,
  type OpsEnergyRow,
  type OpsEventRow,
  type OpsFlagRow,
  type OpsGrantRow,
  type OpsIpAllowRow,
  type OpsMacroRow,
  type OpsPermission,
  type OpsReadingFull,
  type OpsSessionRow,
  type OpsStaffRole,
  type OpsStaffRow,
  type OpsStaffUser,
  type OpsSubRow,
  type OpsUserConversation,
  type OpsChatMessage,
  type OpsUserDossier,
  opsUserLabel,
  type OpsUserRow,
  type OpsWebhookRow,
} from "@/lib/ops-console-shared";
import {
  asPermissionList,
  logOpsEvent,
  requireOpsStaff,
  requirePermission,
} from "@/lib/ops-console.server";
import {
  appendNotifyResult,
  maybeNotifyOpsUser,
  type OpsNotifyOptions,
  type OpsUserNoticeKind,
} from "@/lib/ops-user-notify.server";

const PERMANENT_BAN = "876000h";

type StaffActor = { id: string; username: string };

async function withUserNotify(
  result: OpsActionResult,
  opts: OpsNotifyOptions & {
    kind: OpsUserNoticeKind;
    staff: StaffActor;
    userId: string;
    reason?: string | null;
    amount?: number | null;
    plan?: string | null;
    days?: number | null;
    balance?: number | null;
    cap?: number | null;
  },
): Promise<OpsActionResult> {
  if (!result.ok) return result;
  const mailed = await maybeNotifyOpsUser({
    userId: opts.userId,
    notify: opts.notify,
    notifyLang: opts.notifyLang,
    kind: opts.kind,
    actorStaffId: opts.staff.id,
    actorUsername: opts.staff.username,
    reason: opts.reason,
    amount: opts.amount,
    plan: opts.plan,
    days: opts.days,
    balance: opts.balance,
    cap: opts.cap,
  });
  return {
    ...result,
    message: appendNotifyResult(result.message || "Done.", opts.notify, mailed),
  };
}

function providerOf(sub: Record<string, unknown> | null | undefined): string {
  if (!sub) return "none";
  if (sub.is_comp) return "comp";
  if (sub.whop_membership_id) return "whop";
  if (sub.creem_subscription_id) return "creem";
  if (sub.stripe_subscription_id) return "stripe";
  if (sub.flitt_order_id || sub.flitt_payment_id) return "flitt";
  return "none";
}

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const api = admin.auth.admin as unknown as {
    getUserByEmail?: (e: string) => Promise<{
      data: { user: { id: string } | null } | null;
      error: { message: string } | null;
    }>;
  };
  if (typeof api.getUserByEmail === "function") {
    const { data, error } = await api.getUserByEmail(normalized);
    if (!error && data?.user?.id) return data.user.id;
  }

  for (let page = 1; page <= 8; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = (data.users ?? []).find((u) => (u.email || "").toLowerCase() === normalized);
    if (hit) return hit.id;
    if ((data.users ?? []).length < 200) break;
  }
  return null;
}

async function authEmailsByIds(ids: string[]): Promise<Map<string, string>> {
  const admin = getSupabaseAdminClient();
  const map = new Map<string, string>();
  if (!ids.length) return map;

  const { data, error } = await admin.rpc(
    "ops_auth_emails" as never,
    {
      p_ids: ids,
    } as never,
  );
  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{ id: string; email: string | null }>) {
      const email = row.email?.trim();
      if (email) map.set(String(row.id), email);
    }
    return map;
  }

  // Fallback if RPC is unavailable.
  await Promise.all(
    ids.map(async (id) => {
      const { data: userData } = await admin.auth.admin.getUserById(id);
      const email = userData.user?.email?.trim();
      if (email) map.set(id, email);
    }),
  );
  return map;
}

function toOpsUserRow(
  r: {
    id: string;
    display_name: string;
    lang: string | null;
    banned: boolean;
    chat_restricted: boolean;
    watchlist: boolean;
    ban_reason: string | null;
    email_verified: boolean;
    streak: number;
    created_at: string;
  },
  extras: {
    authEmail: string | null;
    energy: number | null;
    unlimited: boolean;
    plan: string | null;
    sub_status: string | null;
    is_comp: boolean;
  },
): OpsUserRow {
  return {
    id: r.id,
    display_name: r.display_name,
    authEmail: extras.authEmail,
    label: opsUserLabel(r.display_name, extras.authEmail),
    lang: r.lang,
    banned: Boolean(r.banned),
    chat_restricted: Boolean(r.chat_restricted),
    watchlist: Boolean(r.watchlist),
    ban_reason: r.ban_reason,
    email_verified: Boolean(r.email_verified),
    streak: r.streak ?? 0,
    created_at: r.created_at,
    energy: extras.energy,
    unlimited: extras.unlimited,
    plan: extras.plan,
    sub_status: extras.sub_status,
    is_comp: extras.is_comp,
  };
}

async function recordGrant(input: {
  userId: string;
  kind: "energy" | "energy_unlimited" | "daily_cap" | "subscription" | "revoke";
  amount?: number | null;
  plan?: string | null;
  days?: number | null;
  expiresAt?: string | null;
  note?: string | null;
  actor: string;
}) {
  const admin = getSupabaseAdminClient();
  await admin.from("ops_grants" as never).insert({
    user_id: input.userId,
    kind: input.kind,
    amount: input.amount ?? null,
    plan: input.plan ?? null,
    days: input.days ?? null,
    expires_at: input.expiresAt ?? null,
    note: input.note?.slice(0, 500) ?? null,
    actor_username: input.actor,
  } as never);
}

/* ------------------------------------------------------------------ people */

export type OpsUserFilter =
  | "all"
  | "banned"
  | "restricted"
  | "watchlist"
  | "premium"
  | "comp"
  | "unlimited"
  | "unverified";

export async function searchOpsUsers(
  query: string,
  filter: OpsUserFilter = "all",
  limit = 60,
): Promise<OpsUserRow[]> {
  await requirePermission("users.view");
  const admin = getSupabaseAdminClient();
  const q = query.trim();

  let profileQuery = admin
    .from("profiles")
    .select(
      "id, display_name, lang, banned, chat_restricted, watchlist, ban_reason, email_verified, streak, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    if (/^[0-9a-f-]{36}$/i.test(q)) {
      profileQuery = profileQuery.eq("id", q);
    } else if (q.includes("@")) {
      const uid = await resolveUserIdByEmail(q);
      if (!uid) return [];
      profileQuery = profileQuery.eq("id", uid);
    } else {
      profileQuery = profileQuery.ilike("display_name", `%${q}%`);
    }
  }

  if (filter === "banned") profileQuery = profileQuery.eq("banned", true);
  if (filter === "restricted") profileQuery = profileQuery.eq("chat_restricted", true);
  if (filter === "watchlist") profileQuery = profileQuery.eq("watchlist", true);
  if (filter === "unverified") profileQuery = profileQuery.eq("email_verified", false);

  if (filter === "premium" || filter === "comp") {
    const subQuery = admin
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active")
      .limit(500);
    const { data: subs } = filter === "comp" ? await subQuery.eq("is_comp", true) : await subQuery;
    const ids = ((subs ?? []) as { user_id: string }[]).map((s) => s.user_id);
    if (!ids.length) return [];
    profileQuery = profileQuery.in("id", ids);
  }

  if (filter === "unlimited") {
    const { data: unl } = await admin
      .from("energy_balance")
      .select("user_id")
      .eq("unlimited", true)
      .limit(500);
    const ids = ((unl ?? []) as { user_id: string }[]).map((s) => s.user_id);
    if (!ids.length) return [];
    profileQuery = profileQuery.in("id", ids);
  }

  const { data: profiles } = await profileQuery;
  const rows = (profiles ?? []) as Array<{
    id: string;
    display_name: string;
    lang: string | null;
    banned: boolean;
    chat_restricted: boolean;
    watchlist: boolean;
    ban_reason: string | null;
    email_verified: boolean;
    streak: number;
    created_at: string;
  }>;
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [{ data: energy }, { data: subs }] = await Promise.all([
    admin.from("energy_balance").select("user_id, balance, unlimited").in("user_id", ids),
    admin.from("subscriptions").select("user_id, plan, status, is_comp").in("user_id", ids),
  ]);

  const energyMap = new Map(
    ((energy ?? []) as { user_id: string; balance: number; unlimited: boolean }[]).map((e) => [
      e.user_id,
      e,
    ]),
  );
  const subMap = new Map(
    (
      (subs ?? []) as {
        user_id: string;
        plan: string;
        status: string;
        is_comp: boolean;
      }[]
    ).map((s) => [s.user_id, s]),
  );
  const emailMap = await authEmailsByIds(ids);

  return rows.map((r) =>
    toOpsUserRow(r, {
      authEmail: emailMap.get(r.id) ?? null,
      energy: energyMap.get(r.id)?.balance ?? null,
      unlimited: Boolean(energyMap.get(r.id)?.unlimited),
      plan: subMap.get(r.id)?.plan ?? null,
      sub_status: subMap.get(r.id)?.status ?? null,
      is_comp: Boolean(subMap.get(r.id)?.is_comp),
    }),
  );
}

export async function fetchOpsUserDossier(userId: string): Promise<OpsUserDossier | null> {
  await requirePermission("users.view");
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;

  const p = profile as Record<string, unknown>;
  const [
    { data: energy },
    { data: sub },
    { data: readings },
    readingCount,
    { data: grants },
    authUser,
  ] = await Promise.all([
    admin.from("energy_balance").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("reading_history")
      .select("id, kind, energy_spent, created_at, result_text")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("reading_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("ops_grants" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.auth.admin.getUserById(userId),
  ]);

  const e = energy as Record<string, unknown> | null;
  const s = sub as Record<string, unknown> | null;
  const authRecord = authUser.data.user as {
    email?: string | null;
    banned_until?: string | null;
    last_sign_in_at?: string | null;
  } | null;

  const authEmail = authRecord?.email ?? null;
  const displayName = String(p.display_name ?? "");
  return {
    id: String(p.id),
    display_name: displayName,
    authEmail,
    label: opsUserLabel(displayName, authEmail),
    lang: (p.lang as string | null) ?? null,
    banned: Boolean(p.banned),
    chat_restricted: Boolean(p.chat_restricted),
    watchlist: Boolean(p.watchlist),
    ban_reason: (p.ban_reason as string | null) ?? null,
    email_verified: Boolean(p.email_verified),
    streak: Number(p.streak ?? 0),
    created_at: String(p.created_at),
    energy: e ? Number(e.balance ?? 0) : null,
    unlimited: Boolean(e?.unlimited),
    plan: s ? String(s.plan ?? "none") : null,
    sub_status: s ? String(s.status ?? "none") : null,
    is_comp: Boolean(s?.is_comp),
    birth_date: (p.birth_date as string | null) ?? null,
    interests: (p.interests as string[]) ?? [],
    hobbies: (p.hobbies as string[]) ?? [],
    cosmic_vibe: (p.cosmic_vibe as string | null) ?? null,
    onboarding_complete: Boolean(p.onboarding_complete),
    best_streak: Number(p.best_streak ?? 0),
    last_visit: (p.last_visit as string | null) ?? null,
    marketing_opt_in: Boolean(p.marketing_opt_in),
    mod_notes: (p.mod_notes as string | null) ?? null,
    banned_at: (p.banned_at as string | null) ?? null,
    banned_by: (p.banned_by as string | null) ?? null,
    daily_cap: e ? Number(e.daily_cap ?? 0) : null,
    next_free_refill_at: e ? ((e.next_free_refill_at as string | null) ?? null) : null,
    granted_by: (s?.granted_by as string | null) ?? null,
    grant_note: (s?.grant_note as string | null) ?? null,
    period_end: (s?.current_period_end as string | null) ?? null,
    provider: providerOf(s),
    authBannedUntil: authRecord?.banned_until ?? null,
    lastSignInAt: authRecord?.last_sign_in_at ?? null,
    readingsCount: readingCount.count ?? 0,
    recentReadings: ((readings ?? []) as OpsUserDossier["recentReadings"]).map((r) => ({
      ...r,
      result_text: String(r.result_text || "").slice(0, 200),
    })),
    grants: (grants ?? []) as OpsGrantRow[],
  };
}

/** Support/safety access to live chat transcript. Every open is audit-logged. */
export async function fetchOpsUserConversation(
  userId: string,
): Promise<OpsUserConversation | null> {
  const staff = await requirePermission("users.conversations");
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("chat_state")
    .select("user_id, messages, service, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const raw = Array.isArray(data?.messages) ? data!.messages : [];
  const messages: OpsChatMessage[] = raw
    .map((m: unknown): OpsChatMessage | null => {
      const row = m as Record<string, unknown>;
      const roleRaw = String(row.role ?? "unknown");
      const role: OpsChatMessage["role"] =
        roleRaw === "user" || roleRaw === "nina" ? roleRaw : "unknown";
      const text = String(row.text ?? "").slice(0, 8000);
      const imageUrl =
        typeof row.imageUrl === "string" && row.imageUrl.trim() ? row.imageUrl.trim() : null;
      const cardRows = Array.isArray(row.cards) ? row.cards : [];
      const cards = cardRows
        .map((c) => {
          if (typeof c === "string") return c;
          const obj = c as { name?: string; nameKa?: string; id?: string };
          return String(obj.name || obj.nameKa || obj.id || "").trim();
        })
        .filter(Boolean);
      // Keep image-only / card-only turns (coffee photos often have short text).
      if (!text.trim() && !imageUrl && !cards.length) return null;
      const createdAt =
        typeof row.createdAt === "string" && row.createdAt.trim() ? row.createdAt.trim() : null;
      return {
        id: Number(row.id ?? 0),
        role,
        text,
        createdAt,
        hasCards: cards.length > 0,
        hasImage: Boolean(imageUrl),
        imageUrl,
        cards,
      };
    })
    .filter((m): m is OpsChatMessage => m !== null);

  await logOpsEvent({
    category: "moderation",
    action: "conversation_view",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: userId,
    meta: { messages: messages.length },
  });

  return {
    userId,
    service: (data?.service as string | null) ?? null,
    updatedAt: (data?.updated_at as string | null) ?? null,
    messageCount: messages.length,
    messages,
  };
}

export async function clearOpsUserConversation(
  input: { userId: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.conversations");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("chat_state").upsert(
    {
      user_id: input.userId,
      messages: [],
      service: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: "conversation_clear",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    { ok: true, message: "Chat transcript cleared." },
    {
      ...input,
      kind: "conversation_cleared",
      staff,
      userId: input.userId,
    },
  );
}

export async function fetchOpsUserReadingsFull(
  userId: string,
  limit = 40,
): Promise<OpsReadingFull[]> {
  await requirePermission("users.conversations");
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("reading_history")
    .select("id, kind, lang, cards, input, result_text, energy_spent, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const inputRaw =
      r.input && typeof r.input === "object" && !Array.isArray(r.input)
        ? (r.input as Record<string, unknown>)
        : {};
    const input: Record<string, string> = {};
    for (const [k, v] of Object.entries(inputRaw)) {
      if (v == null) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        input[k] = String(v).slice(0, 2000);
      }
    }
    return {
      id: String(r.id),
      kind: String(r.kind ?? ""),
      lang: (r.lang as string | null) ?? null,
      cards: Array.isArray(r.cards) ? r.cards.map((c) => String(c)) : [],
      input,
      result_text: String(r.result_text || "").slice(0, 12000),
      energy_spent: Number(r.energy_spent ?? 0),
      created_at: String(r.created_at ?? ""),
    } satisfies OpsReadingFull;
  });
}

export async function forceOpsUserLogout(
  input: { userId: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.force_logout");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.auth.admin.signOut(input.userId, "global");
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "security",
    action: "force_logout",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    { ok: true, message: "All sessions revoked for this user." },
    { ...input, kind: "force_logout", staff, userId: input.userId },
  );
}

export async function resetOpsUserStreak(
  input: { userId: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.notes");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ streak: 0, last_visit: null })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: "streak_reset",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    { ok: true, message: "Streak reset to 0." },
    { ...input, kind: "streak_reset", staff, userId: input.userId },
  );
}

export async function banOpsUser(
  input: {
    userId: string;
    ban: boolean;
    reason?: string;
    authLevel?: boolean;
  } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.ban");
  const admin = getSupabaseAdminClient();

  const patch = input.ban
    ? {
        banned: true,
        ban_reason: input.reason?.trim() || "Banned by ops",
        banned_at: new Date().toISOString(),
        banned_by: staff.username,
      }
    : { banned: false, ban_reason: null, banned_at: null, banned_by: null };

  const { data: updated, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", input.userId)
    .select("id, banned")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "Profile not found." };

  // Auth-level ban also invalidates issued tokens, so the session dies instantly.
  let authOk = true;
  if (input.authLevel !== false) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.userId, {
      ban_duration: input.ban ? PERMANENT_BAN : "none",
    });
    if (authError) {
      authOk = false;
      console.error("ops ban auth update", authError.message);
    }
  }

  await logOpsEvent({
    category: "moderation",
    action: input.ban ? "ban" : "unban",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { reason: input.reason ?? null, authOk },
  });
  return withUserNotify(
    {
      ok: true,
      message: input.ban
        ? authOk
          ? "User banned and tokens revoked."
          : "User banned in app (auth token revoke failed — they may need a refresh)."
        : "User unbanned.",
    },
    {
      ...input,
      kind: input.ban ? "ban" : "unban",
      staff,
      userId: input.userId,
      reason: input.reason,
    },
  );
}

export async function restrictOpsUser(
  input: { userId: string; restrict: boolean } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.restrict");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ chat_restricted: input.restrict })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: input.restrict ? "restrict" : "unrestrict",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    {
      ok: true,
      message: input.restrict ? "Chat restricted." : "Restriction lifted.",
    },
    {
      ...input,
      kind: input.restrict ? "restrict" : "unrestrict",
      staff,
      userId: input.userId,
    },
  );
}

export async function watchlistOpsUser(input: {
  userId: string;
  watch: boolean;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("users.watchlist");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ watchlist: input.watch })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: input.watch ? "watchlist_add" : "watchlist_remove",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return { ok: true, message: input.watch ? "Added to watchlist." : "Removed from watchlist." };
}

export async function setOpsUserNotes(input: {
  userId: string;
  notes: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("users.notes");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ mod_notes: input.notes.slice(0, 4000) })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: "notes",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return { ok: true, message: "Notes saved." };
}

export async function verifyOpsUserEmail(
  input: { userId: string; verified: boolean } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.verify_email");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ email_verified: input.verified, email_verify_sent_at: null })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };
  if (input.verified) {
    await admin.auth.admin.updateUserById(input.userId, { email_confirm: true });
  }
  await logOpsEvent({
    category: "moderation",
    action: input.verified ? "email_verified" : "email_unverified",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    {
      ok: true,
      message: input.verified ? "Marked verified." : "Verification cleared.",
    },
    {
      ...input,
      kind: input.verified ? "email_verified" : "email_unverified",
      staff,
      userId: input.userId,
    },
  );
}

export async function resetOpsUserPassword(input: { userId: string }): Promise<OpsActionResult> {
  const staff = await requirePermission("users.reset_password");
  const admin = getSupabaseAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(input.userId);
  const email = authUser.user?.email;
  if (!email) return { ok: false, error: "No email on this account." };

  // Never return the recovery URL to the browser — deliver out-of-band only.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/reset-password` },
  });
  if (error) return { ok: false, error: error.message };

  const link = data.properties?.action_link;
  if (!link) {
    return { ok: false, error: "Could not generate recovery link." };
  }

  const delivered = await deliverOpsSecret(staff.username, email, link);
  if (!delivered) {
    return {
      ok: false,
      error:
        "No secure delivery channel. Configure DISCORD_ADMIN_WEBHOOK or RESEND_API_KEY — link is never shown in the UI.",
    };
  }

  await logOpsEvent({
    category: "moderation",
    action: "password_reset_link",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { emailed: true },
  });
  return {
    ok: true,
    message: "Recovery link sent to Discord / ops inbox — not shown in UI.",
  };
}

/** Deliver sensitive one-time links via Discord webhook and/or Resend — never via HTTP response. */
async function deliverOpsSecret(
  actor: string,
  targetEmail: string,
  link: string,
): Promise<boolean> {
  let ok = false;
  const discord = process.env.DISCORD_ADMIN_WEBHOOK?.trim();
  if (discord) {
    try {
      const res = await fetch(discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Ops Console",
          embeds: [
            {
              title: "Password recovery link",
              description: `Requested by **${actor}** for \`${targetEmail}\`.\n[Open reset link](${link})`,
              color: 0x1877f2,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      ok = res.ok || ok;
    } catch (err) {
      console.error("ops secret discord", err);
    }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_NOTIFY_TO?.trim();
  if (apiKey && to) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const from = process.env.CONTACT_FROM?.trim() || "Mkitxavi Security <onboarding@resend.dev>";
      const sent = await resend.emails.send({
        from,
        to: [to],
        subject: `[Ops] Password recovery for ${targetEmail}`,
        text: `Requested by ${actor}\nUser: ${targetEmail}\n\n${link}`,
      });
      if (!sent.error) ok = true;
    } catch (err) {
      console.error("ops secret resend", err);
    }
  }
  return ok;
}

export async function deleteOpsUser(
  input: { userId: string; confirm: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("users.delete");
  if (input.confirm.trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." };
  }
  // Email before delete — account email disappears after auth delete.
  let notifyMsg = "";
  if (input.notify) {
    const mailed = await maybeNotifyOpsUser({
      userId: input.userId,
      notify: true,
      notifyLang: input.notifyLang,
      kind: "account_deleted",
      actorStaffId: staff.id,
      actorUsername: staff.username,
    });
    notifyMsg = appendNotifyResult("", true, mailed).trim();
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(input.userId);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "moderation",
    action: "delete_user",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return {
    ok: true,
    message: notifyMsg
      ? `Account deleted permanently. ${notifyMsg}`
      : "Account deleted permanently.",
  };
}

export async function exportOpsUsersCsv(): Promise<{ csv: string; rows: number }> {
  await requirePermission("users.export");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, lang, banned, chat_restricted, email_verified, streak, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const header = "id,display_name,lang,banned,chat_restricted,email_verified,streak,created_at";
  const body = rows
    .map((r) =>
      [
        r.id,
        `"${String(r.display_name ?? "").replace(/"/g, '""')}"`,
        r.lang ?? "",
        r.banned,
        r.chat_restricted,
        r.email_verified,
        r.streak,
        r.created_at,
      ].join(","),
    )
    .join("\n");
  return { csv: `${header}\n${body}`, rows: rows.length };
}

export async function listModerationQueue(): Promise<OpsUserRow[]> {
  await requirePermission("users.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, display_name, lang, banned, chat_restricted, watchlist, ban_reason, email_verified, streak, created_at",
    )
    .or("banned.eq.true,chat_restricted.eq.true,watchlist.eq.true")
    .order("updated_at", { ascending: false })
    .limit(120);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const emailMap = await authEmailsByIds(rows.map((r) => String(r.id)));
  return rows.map((r) => {
    const id = String(r.id);
    return toOpsUserRow(
      {
        id,
        display_name: String(r.display_name ?? ""),
        lang: (r.lang as string | null) ?? null,
        banned: Boolean(r.banned),
        chat_restricted: Boolean(r.chat_restricted),
        watchlist: Boolean(r.watchlist),
        ban_reason: (r.ban_reason as string | null) ?? null,
        email_verified: Boolean(r.email_verified),
        streak: Number(r.streak ?? 0),
        created_at: String(r.created_at),
      },
      {
        authEmail: emailMap.get(id) ?? null,
        energy: null,
        unlimited: false,
        plan: null,
        sub_status: null,
        is_comp: false,
      },
    );
  });
}

/* ------------------------------------------------------------------ energy */

export async function grantOpsEnergy(
  input: { userId: string; delta: number; note?: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("energy.grant");
  const admin = getSupabaseAdminClient();
  const delta = Math.trunc(input.delta);
  if (!delta) return { ok: false, error: "Amount cannot be zero." };
  if (Math.abs(delta) > 100000) return { ok: false, error: "Amount too large." };

  const { data, error } = await admin.rpc(
    "ops_adjust_energy" as never,
    {
      p_user_id: input.userId,
      p_delta: delta,
    } as never,
  );
  if (error) return { ok: false, error: error.message };
  const balance = typeof data === "number" ? data : Number(data ?? NaN);
  if (!Number.isFinite(balance)) {
    return { ok: false, error: "Energy grant did not return a balance." };
  }

  await recordGrant({
    userId: input.userId,
    kind: "energy",
    amount: delta,
    note: input.note,
    actor: staff.username,
  });
  await logOpsEvent({
    category: "energy",
    action: delta > 0 ? "grant" : "deduct",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { delta, balance },
  });
  return withUserNotify(
    {
      ok: true,
      message:
        delta > 0
          ? `Granted ${delta} energy (now ${balance}).`
          : `Deducted ${Math.abs(delta)} energy (now ${balance}).`,
    },
    {
      ...input,
      kind: delta > 0 ? "energy_granted" : "energy_deducted",
      staff,
      userId: input.userId,
      amount: delta,
      balance,
    },
  );
}

async function patchWallet(
  userId: string,
  patch: { balance?: number; unlimited?: boolean; dailyCap?: number },
): Promise<{ balance: number; unlimited: boolean; daily_cap: number } | { error: string }> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc(
    "ops_patch_wallet" as never,
    {
      p_user_id: userId,
      p_balance: patch.balance ?? null,
      p_unlimited: patch.unlimited ?? null,
      p_daily_cap: patch.dailyCap ?? null,
    } as never,
  );
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return { error: "Wallet patch returned no row." };
  const r = row as { balance: number; unlimited: boolean; daily_cap: number };
  return {
    balance: Number(r.balance ?? 0),
    unlimited: Boolean(r.unlimited),
    daily_cap: Number(r.daily_cap ?? 5),
  };
}

export async function setOpsUserEnergy(
  input: { userId: string; balance: number } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("energy.set");
  const balance = Math.max(0, Math.min(1000000, Math.floor(input.balance)));
  const patched = await patchWallet(input.userId, { balance });
  if ("error" in patched) return { ok: false, error: patched.error };
  await recordGrant({
    userId: input.userId,
    kind: "energy",
    amount: balance,
    note: "absolute set",
    actor: staff.username,
  });
  await logOpsEvent({
    category: "energy",
    action: "set_balance",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { balance: patched.balance },
  });
  return withUserNotify(
    { ok: true, message: `Energy set to ${patched.balance}.` },
    {
      ...input,
      kind: "energy_set",
      staff,
      userId: input.userId,
      balance: patched.balance,
    },
  );
}

export async function setOpsDailyCap(
  input: { userId: string; cap: number } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("energy.cap");
  const cap = Math.max(0, Math.min(10000, Math.floor(input.cap)));
  const patched = await patchWallet(input.userId, { dailyCap: cap });
  if ("error" in patched) return { ok: false, error: patched.error };
  await recordGrant({
    userId: input.userId,
    kind: "daily_cap",
    amount: cap,
    actor: staff.username,
  });
  await logOpsEvent({
    category: "energy",
    action: "set_cap",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { cap: patched.daily_cap },
  });
  return withUserNotify(
    { ok: true, message: `Daily cap set to ${patched.daily_cap}.` },
    {
      ...input,
      kind: "daily_cap_set",
      staff,
      userId: input.userId,
      cap: patched.daily_cap,
    },
  );
}

export async function setOpsUnlimitedEnergy(
  input: { userId: string; unlimited: boolean; note?: string } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("energy.unlimited");
  const patched = await patchWallet(input.userId, { unlimited: input.unlimited });
  if ("error" in patched) return { ok: false, error: patched.error };
  await recordGrant({
    userId: input.userId,
    kind: "energy_unlimited",
    amount: input.unlimited ? 1 : 0,
    note: input.note,
    actor: staff.username,
  });
  await logOpsEvent({
    category: "energy",
    action: input.unlimited ? "unlimited_on" : "unlimited_off",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { unlimited: patched.unlimited, balance: patched.balance },
  });
  return withUserNotify(
    {
      ok: true,
      message: patched.unlimited
        ? `Unlimited energy ON (balance ${patched.balance}).`
        : "Unlimited energy removed.",
    },
    {
      ...input,
      kind: input.unlimited ? "energy_unlimited_on" : "energy_unlimited_off",
      staff,
      userId: input.userId,
    },
  );
}

export async function listOpsEnergyLeaders(): Promise<OpsEnergyRow[]> {
  await requirePermission("energy.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("energy_balance")
    .select("user_id, balance, daily_cap, unlimited, next_free_refill_at, updated_at")
    .order("balance", { ascending: false })
    .limit(80);
  const rows = (data ?? []) as Array<{
    user_id: string;
    balance: number;
    daily_cap: number;
    unlimited: boolean;
    next_free_refill_at: string | null;
    updated_at: string;
  }>;
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, display_name, banned").in("id", ids)
    : { data: [] };
  const map = new Map(
    ((profiles ?? []) as { id: string; display_name: string; banned: boolean }[]).map((p) => [
      p.id,
      p,
    ]),
  );
  return rows.map((r) => ({
    ...r,
    unlimited: Boolean(r.unlimited),
    display_name: map.get(r.user_id)?.display_name || "—",
    banned: Boolean(map.get(r.user_id)?.banned),
  }));
}

export async function listOpsGrants(limit = 80): Promise<OpsGrantRow[]> {
  await requirePermission("energy.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_grants" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OpsGrantRow[];
}

/* ----------------------------------------------------------------- billing */

export async function listOpsSubscriptions(): Promise<OpsSubRow[]> {
  await requirePermission("billing.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(150);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((r) => String(r.user_id));
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const names = new Map(
    ((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  );
  return rows.map((r) => ({
    user_id: String(r.user_id),
    display_name: names.get(String(r.user_id)) || "—",
    status: String(r.status ?? "none"),
    plan: String(r.plan ?? "none"),
    current_period_end: (r.current_period_end as string | null) ?? null,
    cancel_at_period_end: Boolean(r.cancel_at_period_end),
    updated_at: String(r.updated_at ?? ""),
    provider: providerOf(r),
    is_comp: Boolean(r.is_comp),
    granted_by: (r.granted_by as string | null) ?? null,
  }));
}

export async function grantOpsSubscription(
  input: {
    userId: string;
    plan: "mystic" | "ascended";
    days: number;
    note?: string;
    withUnlimited?: boolean;
  } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("billing.grant");
  const admin = getSupabaseAdminClient();
  const days = Math.max(1, Math.min(3650, Math.floor(input.days)));
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      plan: input.plan,
      status: "active",
      is_comp: true,
      granted_by: staff.username,
      grant_note: input.note?.slice(0, 500) ?? null,
      current_period_end: expires,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  if (input.withUnlimited && can(staff, "energy.unlimited")) {
    await patchWallet(input.userId, { unlimited: true });
  }

  await recordGrant({
    userId: input.userId,
    kind: "subscription",
    plan: input.plan,
    days,
    expiresAt: expires,
    note: input.note,
    actor: staff.username,
  });
  await logOpsEvent({
    category: "billing",
    action: "comp_grant",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { plan: input.plan, days },
  });
  return withUserNotify(
    { ok: true, message: `${input.plan} granted free for ${days} days.` },
    {
      ...input,
      kind: "sub_granted",
      staff,
      userId: input.userId,
      plan: input.plan,
      days,
    },
  );
}

export async function revokeOpsSubscription(
  input: { userId: string; alsoEnergy?: boolean } & OpsNotifyOptions,
): Promise<OpsActionResult> {
  const staff = await requirePermission("billing.revoke");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      plan: "none",
      status: "cancelled",
      is_comp: false,
      granted_by: null,
      grant_note: null,
      cancel_at_period_end: false,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  if (input.alsoEnergy) {
    await admin
      .from("energy_balance")
      .update({ unlimited: false, updated_at: new Date().toISOString() })
      .eq("user_id", input.userId);
  }

  await recordGrant({ userId: input.userId, kind: "revoke", actor: staff.username });
  await logOpsEvent({
    category: "billing",
    action: "revoke",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
  });
  return withUserNotify(
    { ok: true, message: "Subscription revoked." },
    { ...input, kind: "sub_revoked", staff, userId: input.userId },
  );
}

export async function setOpsUserPlan(input: {
  userId: string;
  plan: "none" | "mystic" | "ascended";
  status: "none" | "active" | "cancelled";
}): Promise<OpsActionResult> {
  const staff = await requirePermission("billing.grant");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      plan: input.plan,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "billing",
    action: "set_plan",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    targetUserId: input.userId,
    meta: { plan: input.plan, status: input.status },
  });
  return { ok: true, message: "Plan updated." };
}

/* ----------------------------------------------------------------- support */

export async function listOpsContacts(status?: string): Promise<OpsContactRow[]> {
  await requirePermission("support.view");
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("contact_messages")
    .select(
      "id, kind, name, email, message, user_id, status, staff_reply, resolved_at, resolved_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(120);
  if (status && status !== "all") {
    q = q.eq("status", status as "open" | "pending" | "resolved" | "spam");
  }
  const { data } = await q;
  return ((data ?? []) as OpsContactRow[]).map((c) => ({ ...c, status: c.status || "open" }));
}

export async function updateOpsContact(input: {
  id: string;
  status: "open" | "pending" | "resolved" | "spam";
  reply?: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("support.view");
  if (input.reply?.trim() && !can(staff, "support.reply")) {
    return { ok: false, error: "You cannot send replies." };
  }
  if ((input.status === "resolved" || input.status === "spam") && !can(staff, "support.close")) {
    return { ok: false, error: "You cannot close tickets." };
  }

  const admin = getSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("contact_messages")
    .update({
      status: input.status,
      ...(input.reply !== undefined ? { staff_reply: input.reply.slice(0, 8000) } : {}),
      ...(input.status === "resolved" || input.status === "spam"
        ? { resolved_at: new Date().toISOString(), resolved_by: staff.username }
        : {}),
    })
    .eq("id", input.id)
    .select("email, name, kind, message")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  let mailDetail: string | undefined;
  if (input.reply?.trim() && row) {
    const r = row as { email: string; name: string; kind: string; message: string };
    mailDetail = await sendSupportReplyEmail({
      to: r.email,
      name: r.name,
      reply: input.reply.trim(),
      original: r.message,
      kind: r.kind,
    });
  }

  await logOpsEvent({
    category: "support",
    action: "contact_update",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { id: input.id, status: input.status },
  });
  return { ok: true, message: "Ticket updated.", detail: mailDetail };
}

async function sendSupportReplyEmail(input: {
  to: string;
  name: string;
  reply: string;
  original: string;
  kind: string;
}): Promise<string | undefined> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const subject = `[Mkitxavi] Re: your ${input.kind} message`;
  const text = `Hi ${input.name},\n\n${input.reply}\n\n— Mkitxavi Support\n\n---\nYour message:\n${input.original}`;
  try {
    if (apiKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const from = process.env.CONTACT_FROM?.trim() || "Mkitxavi Support <onboarding@resend.dev>";
      const { error } = await resend.emails.send({ from, to: [input.to], subject, text });
      if (error) return `Mail failed: ${error.message}`;
      return "Reply emailed via Resend.";
    }
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(input.to)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: subject, message: text, _captcha: "false" }),
    });
    return res.ok
      ? "Reply queued via FormSubmit (needs one-time activation)."
      : `Mail failed: HTTP ${res.status}`;
  } catch (err) {
    console.error("ops support reply email", err);
    return "Mail failed — saved reply only.";
  }
}

export async function listOpsMacros(): Promise<OpsMacroRow[]> {
  await requirePermission("support.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_saved_replies" as never)
    .select("id, title, body, lang")
    .order("title");
  return (data ?? []) as OpsMacroRow[];
}

export async function addOpsMacro(input: {
  title: string;
  body: string;
  lang: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("support.macros");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("ops_saved_replies" as never).insert({
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 8000),
    lang: input.lang,
    created_by: staff.username,
  } as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Macro saved." };
}

export async function deleteOpsMacro(input: { id: number }): Promise<OpsActionResult> {
  await requirePermission("support.macros");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_saved_replies" as never)
    .delete()
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Macro deleted." };
}

/* ---------------------------------------------------------------- security */

export async function listOpsEvents(input: {
  category?: string;
  limit?: number;
}): Promise<OpsEventRow[]> {
  await requirePermission("security.events");
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("ops_events" as never)
    .select("id, category, action, actor_username, target_user_id, ip, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(400, input.limit ?? 200));
  if (input.category && input.category !== "all") q = q.eq("category", input.category);
  const { data } = await q;
  return ((data ?? []) as OpsEventRow[]).map((e) => ({
    ...e,
    meta: (e.meta && typeof e.meta === "object" ? e.meta : {}) as OpsEventRow["meta"],
  }));
}

export async function listOpsIpAllowlist(): Promise<OpsIpAllowRow[]> {
  await requirePermission("security.view");
  const admin = getSupabaseAdminClient();
  const [{ data }, { data: staff }] = await Promise.all([
    admin
      .from("ops_staff_ip_allowlist" as never)
      .select("id, staff_user_id, ip, label, created_at")
      .order("created_at", { ascending: false }),
    admin.from("ops_staff_users" as never).select("id, username"),
  ]);
  const names = new Map(
    ((staff ?? []) as { id: string; username: string }[]).map((s) => [s.id, s.username]),
  );
  return ((data ?? []) as Omit<OpsIpAllowRow, "username">[]).map((r) => ({
    ...r,
    username: names.get(r.staff_user_id) || "?",
  }));
}

export async function listOpsChallenges(): Promise<OpsChallengeRow[]> {
  await requirePermission("security.view");
  const admin = getSupabaseAdminClient();
  const [{ data }, { data: staff }] = await Promise.all([
    admin
      .from("ops_ip_challenges" as never)
      .select("id, staff_user_id, ip, status, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
    admin.from("ops_staff_users" as never).select("id, username"),
  ]);
  const names = new Map(
    ((staff ?? []) as { id: string; username: string }[]).map((s) => [s.id, s.username]),
  );
  return ((data ?? []) as Omit<OpsChallengeRow, "username">[]).map((r) => ({
    ...r,
    username: names.get(r.staff_user_id) || "?",
  }));
}

export async function listOpsSessions(): Promise<OpsSessionRow[]> {
  await requirePermission("security.view");
  const admin = getSupabaseAdminClient();
  const [{ data }, { data: staff }] = await Promise.all([
    admin
      .from("ops_staff_sessions" as never)
      .select("id, staff_user_id, ip, user_agent, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
    admin.from("ops_staff_users" as never).select("id, username"),
  ]);
  const names = new Map(
    ((staff ?? []) as { id: string; username: string }[]).map((s) => [s.id, s.username]),
  );
  return ((data ?? []) as Array<Omit<OpsSessionRow, "username"> & { staff_user_id: string }>).map(
    (r) => ({
      id: r.id,
      username: names.get(r.staff_user_id) || "?",
      ip: r.ip,
      user_agent: r.user_agent,
      expires_at: r.expires_at,
      revoked_at: r.revoked_at,
      created_at: r.created_at,
    }),
  );
}

export async function revokeOpsSession(input: { id: string }): Promise<OpsActionResult> {
  const staff = await requirePermission("security.ip");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_staff_sessions" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "security",
    action: "session_revoked",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { session: input.id },
  });
  return { ok: true, message: "Session revoked." };
}

export async function revokeOpsIp(input: { id: string }): Promise<OpsActionResult> {
  const staff = await requirePermission("security.ip");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_staff_ip_allowlist" as never)
    .delete()
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "security",
    action: "ip_revoked",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { id: input.id },
  });
  return { ok: true, message: "IP removed from allowlist." };
}

export async function forceAllowOpsIp(input: {
  staffUserId: string;
  ip: string;
  label?: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("security.ip");
  const ip = input.ip.trim();
  // Basic IPv4 / IPv6 sanity — reject junk that would pollute the allowlist.
  const ipv4Ok =
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split(".").every((o) => {
      const n = Number(o);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  const ipv6Ok = /^[0-9a-f:]+$/i.test(ip) && ip.includes(":");
  if ((!ipv4Ok && !ipv6Ok) || ip.length > 80) {
    return { ok: false, error: "Invalid IP address." };
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.staffUserId)) {
    return { ok: false, error: "Invalid staff id." };
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("ops_staff_ip_allowlist" as never).upsert(
    {
      staff_user_id: input.staffUserId,
      ip,
      label: input.label?.trim() || `manual by ${staff.username}`,
    } as never,
    { onConflict: "staff_user_id,ip" },
  );
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "security",
    action: "ip_manual_allow",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { ip, staff: input.staffUserId },
  });
  return { ok: true, message: "IP allowlisted." };
}

/** Approve or deny a pending IP challenge from the console (not email token). */
export async function resolveOpsIpChallengeById(input: {
  id: string;
  action: "allow" | "deny";
}): Promise<OpsActionResult> {
  const staff = await requirePermission("security.ip");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_ip_challenges" as never)
    .select("id, staff_user_id, ip, status, expires_at")
    .eq("id", input.id)
    .maybeSingle();

  const challenge = data as {
    id: string;
    staff_user_id: string;
    ip: string;
    status: string;
    expires_at: string;
  } | null;

  if (!challenge) return { ok: false, error: "Challenge not found." };
  if (challenge.status !== "pending") {
    return { ok: false, error: `Challenge already ${challenge.status}.` };
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await admin
      .from("ops_ip_challenges" as never)
      .update({ status: "expired", resolved_at: new Date().toISOString() } as never)
      .eq("id", challenge.id);
    return { ok: false, error: "Challenge expired." };
  }

  if (input.action === "deny") {
    await admin
      .from("ops_ip_challenges" as never)
      .update({ status: "denied", resolved_at: new Date().toISOString() } as never)
      .eq("id", challenge.id);
    await logOpsEvent({
      category: "security",
      action: "ip_challenge_denied",
      actorStaffId: staff.id,
      actorUsername: staff.username,
      meta: { challenge: challenge.id, ip: challenge.ip, staff: challenge.staff_user_id },
    });
    return { ok: true, message: "Challenge denied." };
  }

  const { error: allowErr } = await admin.from("ops_staff_ip_allowlist" as never).upsert(
    {
      staff_user_id: challenge.staff_user_id,
      ip: challenge.ip,
      label: `challenge-approved by ${staff.username}`,
    } as never,
    { onConflict: "staff_user_id,ip" },
  );
  if (allowErr) return { ok: false, error: allowErr.message };

  await admin
    .from("ops_ip_challenges" as never)
    .update({ status: "allowed", resolved_at: new Date().toISOString() } as never)
    .eq("id", challenge.id);

  await logOpsEvent({
    category: "security",
    action: "ip_challenge_allowed",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { challenge: challenge.id, ip: challenge.ip, staff: challenge.staff_user_id },
  });
  return { ok: true, message: "IP allowed. Staff can sign in from that address." };
}

/* -------------------------------------------------------------- anti-abuse */

export async function listOpsDeviceClusters(): Promise<OpsDeviceCluster[]> {
  await requirePermission("farm.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_device_links" as never)
    .select("fingerprint_hash, user_id, flagged, last_seen_at, ip")
    .order("last_seen_at", { ascending: false })
    .limit(600);
  const rows = (data ?? []) as Array<{
    fingerprint_hash: string;
    user_id: string;
    flagged: boolean;
    last_seen_at: string;
    ip: string | null;
  }>;

  const byFp = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byFp.get(r.fingerprint_hash) ?? [];
    list.push(r);
    byFp.set(r.fingerprint_hash, list);
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, display_name, banned").in("id", userIds)
    : { data: [] };
  const map = new Map(
    ((profiles ?? []) as { id: string; display_name: string; banned: boolean }[]).map((p) => [
      p.id,
      p,
    ]),
  );

  return [...byFp.entries()]
    .map(([fingerprint_hash, list]) => ({
      fingerprint_hash,
      account_count: list.length,
      flagged: list.some((x) => x.flagged),
      users: list.map((x) => ({
        user_id: x.user_id,
        display_name: map.get(x.user_id)?.display_name || "—",
        banned: Boolean(map.get(x.user_id)?.banned),
      })),
      last_seen_at: list[0]?.last_seen_at || "",
      ip: list[0]?.ip ?? null,
    }))
    .filter((c) => c.account_count >= 2 || c.flagged)
    .sort((a, b) => b.account_count - a.account_count)
    .slice(0, 60);
}

export async function flagOpsDevice(input: {
  fingerprintHash: string;
  flagged: boolean;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("farm.flag");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_device_links" as never)
    .update({ flagged: input.flagged } as never)
    .eq("fingerprint_hash", input.fingerprintHash);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "security",
    action: input.flagged ? "cluster_flagged" : "cluster_cleared",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { fingerprint: input.fingerprintHash.slice(0, 32) },
  });
  return { ok: true, message: input.flagged ? "Cluster flagged." : "Flag cleared." };
}

export async function punishOpsCluster(input: {
  fingerprintHash: string;
  action: "burn" | "ban";
}): Promise<OpsActionResult> {
  const staff = await requirePermission("farm.flag");
  if (input.action === "ban" && !can(staff, "users.ban")) {
    return { ok: false, error: "You cannot ban accounts." };
  }
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_device_links" as never)
    .select("user_id")
    .eq("fingerprint_hash", input.fingerprintHash);
  const ids = [...new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  if (!ids.length) return { ok: false, error: "No accounts in this cluster." };

  if (input.action === "burn") {
    await admin
      .from("energy_balance")
      .update({ balance: 0, unlimited: false, updated_at: new Date().toISOString() })
      .in("user_id", ids);
  } else {
    await admin
      .from("profiles")
      .update({
        banned: true,
        ban_reason: "Multi-account energy farm",
        banned_at: new Date().toISOString(),
        banned_by: staff.username,
      })
      .in("id", ids);
    for (const id of ids) {
      await admin.auth.admin.updateUserById(id, { ban_duration: PERMANENT_BAN });
    }
  }

  await logOpsEvent({
    category: "security",
    action: input.action === "burn" ? "cluster_burn" : "cluster_ban",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { accounts: ids.length },
  });
  return {
    ok: true,
    message: `${input.action === "burn" ? "Burned" : "Banned"} ${ids.length} accounts.`,
  };
}

/* --------------------------------------------------------------- analytics */

export async function fetchOpsAnalytics(): Promise<OpsAnalytics> {
  await requirePermission("analytics.view");
  const admin = getSupabaseAdminClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 13);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [
    { data: profiles },
    { data: readings },
    { data: langs },
    { data: subs },
    { data: streaks },
  ] = await Promise.all([
    admin.from("profiles").select("created_at").gte("created_at", sinceIso),
    admin.from("reading_history").select("kind, created_at").gte("created_at", sinceIso),
    admin.from("profiles").select("lang").limit(5000),
    admin.from("subscriptions").select("plan, status").eq("status", "active").limit(2000),
    admin
      .from("profiles")
      .select("id, display_name, streak")
      .order("streak", { ascending: false })
      .limit(10),
  ]);

  const emptyDays = () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      m.set(d.toISOString().slice(0, 10), 0);
    }
    return m;
  };

  const signupMap = emptyDays();
  for (const p of (profiles ?? []) as { created_at: string }[]) {
    const day = p.created_at.slice(0, 10);
    if (signupMap.has(day)) signupMap.set(day, (signupMap.get(day) || 0) + 1);
  }

  const readingDayMap = emptyDays();
  const kindMap = new Map<string, number>();
  for (const r of (readings ?? []) as { kind: string; created_at: string }[]) {
    const day = r.created_at.slice(0, 10);
    if (readingDayMap.has(day)) readingDayMap.set(day, (readingDayMap.get(day) || 0) + 1);
    kindMap.set(r.kind, (kindMap.get(r.kind) || 0) + 1);
  }

  const langMap = new Map<string, number>();
  for (const l of (langs ?? []) as { lang: string | null }[]) {
    const key = l.lang || "unset";
    langMap.set(key, (langMap.get(key) || 0) + 1);
  }

  const planMap = new Map<string, number>();
  for (const s of (subs ?? []) as { plan: string }[]) {
    planMap.set(s.plan || "none", (planMap.get(s.plan || "none") || 0) + 1);
  }

  const energyTop = await listOpsEnergyLeadersSafe();

  return {
    signupsByDay: [...signupMap.entries()].map(([day, count]) => ({ day, count })),
    readingsByDay: [...readingDayMap.entries()].map(([day, count]) => ({ day, count })),
    readingsByKind: [...kindMap.entries()].map(([kind, count]) => ({ kind, count })),
    langSplit: [...langMap.entries()].map(([lang, count]) => ({ lang, count })),
    planSplit: [...planMap.entries()].map(([plan, count]) => ({ plan, count })),
    energyTop: energyTop.slice(0, 10).map((e) => ({
      user_id: e.user_id,
      display_name: e.display_name,
      balance: e.balance,
    })),
    streakTop: ((streaks ?? []) as { id: string; display_name: string; streak: number }[]).map(
      (s) => ({ user_id: s.id, display_name: s.display_name, streak: s.streak ?? 0 }),
    ),
  };
}

/** Energy leaderboard without the energy.view gate (analytics already checked). */
async function listOpsEnergyLeadersSafe(): Promise<OpsEnergyRow[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("energy_balance")
    .select("user_id, balance, daily_cap, unlimited, next_free_refill_at, updated_at")
    .order("balance", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as Array<Omit<OpsEnergyRow, "display_name" | "banned">>;
  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, display_name, banned").in("id", ids)
    : { data: [] };
  const map = new Map(
    ((profiles ?? []) as { id: string; display_name: string; banned: boolean }[]).map((p) => [
      p.id,
      p,
    ]),
  );
  return rows.map((r) => ({
    ...r,
    display_name: map.get(r.user_id)?.display_name || "—",
    banned: Boolean(map.get(r.user_id)?.banned),
  }));
}

/* ------------------------------------------------------------------ system */

export async function fetchOpsDevHealth(): Promise<OpsDevHealth> {
  await requirePermission("system.health");
  const admin = getSupabaseAdminClient();

  const tables = [
    "profiles",
    "energy_balance",
    "subscriptions",
    "reading_history",
    "contact_messages",
    "ops_events",
    "ops_grants",
  ] as const;

  const [changelog, ...counts] = await Promise.all([
    admin
      .from("ops_changelog" as never)
      .select("id, title, body, author_username, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    ...tables.map((t) => admin.from(t as never).select("*", { count: "exact", head: true })),
  ]);

  const env: OpsDevHealth["env"] = [
    {
      key: "Database",
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      note: "Service role",
    },
    {
      key: "Console gate",
      ok: Boolean(process.env.OPS_CONSOLE_GATE?.trim()),
      note: "Unlock secret",
    },
    {
      key: "Discord alerts",
      ok: Boolean(process.env.DISCORD_ADMIN_WEBHOOK?.trim()),
      note: "IP + honeypot",
    },
    {
      key: "Outbound mail",
      ok: Boolean(process.env.RESEND_API_KEY?.trim()),
      note: process.env.RESEND_API_KEY?.trim() ? "Resend" : "Optional — Discord covers alerts",
    },
    {
      key: "Notify inbox",
      ok: Boolean(process.env.CONTACT_NOTIFY_TO?.trim()),
      note: "Support destination",
    },
    {
      key: "AI engine",
      ok: Boolean(
        process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
      ),
      note: "Gemini",
    },
    {
      key: "Whop billing",
      ok: Boolean(process.env.WHOP_API_KEY?.trim()),
      note: "Primary payments",
    },
    {
      key: "Stripe billing",
      ok: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      note: "Optional secondary",
    },
  ];

  const webhooks = await listOpsWebhooksInternal();

  return {
    env,
    siteUrl: SITE_URL,
    dbTables: tables.map((t, i) => ({ table: t, rows: counts[i]?.count ?? 0 })),
    changelog: (changelog.data ?? []) as OpsDevHealth["changelog"],
    webhooks,
  };
}

async function listOpsWebhooksInternal(): Promise<OpsWebhookRow[]> {
  const admin = getSupabaseAdminClient();
  const sources = [
    ["stripe", "stripe_webhook_events"],
    ["creem", "creem_webhook_events"],
    ["whop", "whop_webhook_events"],
    ["flitt", "flitt_webhook_events"],
  ] as const;

  const results = await Promise.all(
    sources.map(([, table]) =>
      admin
        .from(table as never)
        .select("id, type, processed_at")
        .order("processed_at", { ascending: false })
        .limit(10),
    ),
  );

  const out: OpsWebhookRow[] = [];
  results.forEach((res, i) => {
    const source = sources[i][0];
    for (const row of (res.data ?? []) as { id: string; type: string; processed_at: string }[]) {
      out.push({ source, id: row.id, type: row.type, processed_at: row.processed_at });
    }
  });
  return out.sort((a, b) => (a.processed_at < b.processed_at ? 1 : -1)).slice(0, 30);
}

export async function addOpsChangelog(input: {
  title: string;
  body: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("system.changelog");
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("ops_changelog" as never).insert({
    title: input.title.trim().slice(0, 200),
    body: input.body.trim().slice(0, 8000),
    author_username: staff.username,
  } as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Changelog entry added." };
}

export async function listOpsFlags(): Promise<OpsFlagRow[]> {
  await requirePermission("system.health");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_feature_flags" as never)
    .select("key, enabled, description, updated_by, updated_at")
    .order("key");
  return (data ?? []) as OpsFlagRow[];
}

export async function setOpsFlag(input: {
  key: string;
  enabled: boolean;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("system.flags");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_feature_flags" as never)
    .update({
      enabled: input.enabled,
      updated_by: staff.username,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("key", input.key);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "system",
    action: "flag_toggle",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { key: input.key, enabled: input.enabled },
  });
  return { ok: true, message: `${input.key} → ${input.enabled ? "on" : "off"}` };
}

export async function listOpsAnnouncements(): Promise<OpsAnnouncementRow[]> {
  await requirePermission("system.health");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_announcements" as never)
    .select("id, title, body, level, lang, active, starts_at, ends_at, created_by")
    .order("created_at", { ascending: false })
    .limit(40);
  return (data ?? []) as OpsAnnouncementRow[];
}

export async function createOpsAnnouncement(input: {
  title: string;
  body: string;
  level: "info" | "warn" | "critical";
  lang: string;
  days: number;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("system.announcements");
  const admin = getSupabaseAdminClient();
  const days = Math.max(0, Math.min(365, Math.floor(input.days)));
  const { error } = await admin.from("ops_announcements" as never).insert({
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 4000),
    level: input.level,
    lang: input.lang,
    active: true,
    ends_at: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null,
    created_by: staff.username,
  } as never);
  if (error) return { ok: false, error: error.message };
  await logOpsEvent({
    category: "system",
    action: "announcement_created",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { title: input.title.slice(0, 80) },
  });
  return { ok: true, message: "Announcement published." };
}

export async function setOpsAnnouncementActive(input: {
  id: number;
  active: boolean;
}): Promise<OpsActionResult> {
  await requirePermission("system.announcements");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ops_announcements" as never)
    .update({ active: input.active } as never)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: input.active ? "Announcement live." : "Announcement hidden." };
}

/* ------------------------------------------------------------------- staff */

export async function listOpsStaff(): Promise<OpsStaffRow[]> {
  await requirePermission("staff.view");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_staff_users" as never)
    .select(
      "id, username, role, display_name, disabled, last_login_at, last_login_ip, failed_logins, permissions, denied_permissions, note, created_by, created_at",
    )
    .order("username");
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    role: r.role as OpsStaffRole,
    display_name: String(r.display_name),
    disabled: Boolean(r.disabled),
    last_login_at: (r.last_login_at as string | null) ?? null,
    last_login_ip: (r.last_login_ip as string | null) ?? null,
    failed_logins: Number(r.failed_logins ?? 0),
    permissions: asPermissionList(r.permissions),
    denied_permissions: asPermissionList(r.denied_permissions),
    note: (r.note as string | null) ?? null,
    created_by: (r.created_by as string | null) ?? null,
    created_at: String(r.created_at ?? ""),
  }));
}

function assertRoleAssignable(actor: OpsStaffUser, role: OpsStaffRole): string | null {
  if (PROTECTED_ROLES.includes(role) && actor.role !== "owner") {
    return "Only the owner can assign owner-level roles.";
  }
  if (ROLE_RANK[role] >= ROLE_RANK[actor.role] && actor.role !== "owner") {
    return "Cannot assign a role at or above your own.";
  }
  return null;
}

/** Actor must outrank the target (owners exempt). Blocks demote/disable/reset of superiors. */
function assertCanManageTarget(actor: OpsStaffUser, targetRole: OpsStaffRole): string | null {
  if (PROTECTED_ROLES.includes(targetRole) && actor.role !== "owner") {
    return "Only the owner can manage owner-level staff.";
  }
  if (actor.role === "owner") return null;
  if (ROLE_RANK[actor.role] <= ROLE_RANK[targetRole]) {
    return "Cannot manage staff at or above your rank.";
  }
  return null;
}

/** Extra grants cannot exceed what the actor themselves can do (no privilege escalation). */
function sanitizeGrantedPerms(
  actor: OpsStaffUser,
  list: OpsPermission[] | undefined,
): OpsPermission[] {
  return [...new Set(list ?? [])].filter((p) => ALL_PERMISSIONS.includes(p) && can(actor, p));
}

function sanitizeDeniedPerms(list: OpsPermission[] | undefined): OpsPermission[] {
  return [...new Set(list ?? [])].filter((p) => ALL_PERMISSIONS.includes(p));
}

export async function createOpsStaff(input: {
  username: string;
  displayName: string;
  password: string;
  role: OpsStaffRole;
  note?: string;
  permissions?: OpsPermission[];
  denied?: OpsPermission[];
}): Promise<OpsActionResult> {
  const staff = await requirePermission("staff.create");
  const roleError = assertRoleAssignable(staff, input.role);
  if (roleError) return { ok: false, error: roleError };
  if (input.password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }

  const extras = sanitizeGrantedPerms(staff, input.permissions);
  const denied = sanitizeDeniedPerms(input.denied);

  const admin = getSupabaseAdminClient();
  const hash = await bcrypt.hash(input.password, 12);
  const { error } = await admin.from("ops_staff_users" as never).insert({
    username: input.username.trim().slice(0, 60),
    display_name: input.displayName.trim().slice(0, 80) || input.username.trim(),
    password_hash: hash,
    role: input.role,
    note: input.note?.slice(0, 500) ?? null,
    created_by: staff.username,
    permissions: extras,
    denied_permissions: denied,
  } as never);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("duplicate") ? "Username already exists." : error.message,
    };
  }

  await logOpsEvent({
    category: "staff",
    action: "create",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: {
      username: input.username,
      role: input.role,
      extras: extras.length,
      denied: denied.length,
    },
  });
  return { ok: true, message: `${input.username} provisioned.` };
}

export async function updateOpsStaff(input: {
  staffId: string;
  role?: OpsStaffRole;
  displayName?: string;
  note?: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("staff.edit");
  const admin = getSupabaseAdminClient();

  const { data: target } = await admin
    .from("ops_staff_users" as never)
    .select("id, role, username")
    .eq("id", input.staffId)
    .maybeSingle();
  const t = target as { id: string; role: OpsStaffRole; username: string } | null;
  if (!t) return { ok: false, error: "Staff member not found." };
  const rankError = assertCanManageTarget(staff, t.role);
  if (rankError) return { ok: false, error: rankError };
  if (input.role) {
    const roleError = assertRoleAssignable(staff, input.role);
    if (roleError) return { ok: false, error: roleError };
  }

  const { error } = await admin
    .from("ops_staff_users" as never)
    .update({
      ...(input.role ? { role: input.role } : {}),
      ...(input.displayName ? { display_name: input.displayName.slice(0, 80) } : {}),
      ...(input.note !== undefined ? { note: input.note.slice(0, 500) } : {}),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.staffId);
  if (error) return { ok: false, error: error.message };

  await logOpsEvent({
    category: "staff",
    action: "update",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { target: t.username, role: input.role ?? null },
  });
  return { ok: true, message: "Staff updated." };
}

export async function setOpsStaffPermissions(input: {
  staffId: string;
  permissions: OpsPermission[];
  denied: OpsPermission[];
}): Promise<OpsActionResult> {
  const staff = await requirePermission("staff.permissions");
  const admin = getSupabaseAdminClient();
  const extras = sanitizeGrantedPerms(staff, input.permissions);
  const denied = sanitizeDeniedPerms(input.denied);

  const { data: target } = await admin
    .from("ops_staff_users" as never)
    .select("id, role, username")
    .eq("id", input.staffId)
    .maybeSingle();
  const t = target as { role: OpsStaffRole; username: string } | null;
  if (!t) return { ok: false, error: "Staff member not found." };
  const rankError = assertCanManageTarget(staff, t.role);
  if (rankError) return { ok: false, error: rankError };

  const { error } = await admin
    .from("ops_staff_users" as never)
    .update({
      permissions: extras,
      denied_permissions: denied,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.staffId);
  if (error) return { ok: false, error: error.message };

  await logOpsEvent({
    category: "staff",
    action: "permissions",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { target: t.username, granted: extras.length },
  });
  return { ok: true, message: "Permissions saved." };
}

export async function resetOpsStaffPassword(input: {
  staffId: string;
  password: string;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("staff.reset_password");
  if (input.password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }
  const admin = getSupabaseAdminClient();
  const { data: target } = await admin
    .from("ops_staff_users" as never)
    .select("role, username")
    .eq("id", input.staffId)
    .maybeSingle();
  const t = target as { role: OpsStaffRole; username: string } | null;
  if (!t) return { ok: false, error: "Staff member not found." };
  const rankError = assertCanManageTarget(staff, t.role);
  if (rankError) return { ok: false, error: rankError };

  const hash = await bcrypt.hash(input.password, 12);
  const { error } = await admin
    .from("ops_staff_users" as never)
    .update({
      password_hash: hash,
      failed_logins: 0,
      locked_until: null,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.staffId);
  if (error) return { ok: false, error: error.message };

  await admin
    .from("ops_staff_sessions" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("staff_user_id", input.staffId)
    .is("revoked_at", null);

  await logOpsEvent({
    category: "staff",
    action: "password_reset",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { target: t.username },
  });
  return { ok: true, message: "Password reset and sessions revoked." };
}

export async function setOpsStaffDisabled(input: {
  staffId: string;
  disabled: boolean;
}): Promise<OpsActionResult> {
  const staff = await requirePermission("staff.disable");
  if (input.staffId === staff.id) return { ok: false, error: "Cannot disable yourself." };

  const admin = getSupabaseAdminClient();
  const { data: target } = await admin
    .from("ops_staff_users" as never)
    .select("role, username")
    .eq("id", input.staffId)
    .maybeSingle();
  const t = target as { role: OpsStaffRole; username: string } | null;
  if (!t) return { ok: false, error: "Staff member not found." };
  const rankError = assertCanManageTarget(staff, t.role);
  if (rankError) return { ok: false, error: rankError };

  const { error } = await admin
    .from("ops_staff_users" as never)
    .update({ disabled: input.disabled, updated_at: new Date().toISOString() } as never)
    .eq("id", input.staffId);
  if (error) return { ok: false, error: error.message };

  if (input.disabled) {
    await admin
      .from("ops_staff_sessions" as never)
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("staff_user_id", input.staffId)
      .is("revoked_at", null);
  }

  await logOpsEvent({
    category: "staff",
    action: input.disabled ? "disable" : "enable",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    meta: { target: t.username },
  });
  return { ok: true, message: input.disabled ? "Staff disabled." : "Staff enabled." };
}

export async function whoAmI(): Promise<OpsStaffUser | null> {
  return requireOpsStaff();
}
