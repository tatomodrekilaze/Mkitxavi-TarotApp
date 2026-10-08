import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  getRequestHeader,
  getRequestIP,
  getCookies,
  setCookie,
} from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/link-preview";
import {
  ALL_PERMISSIONS,
  OPS_GATE_COOKIE,
  OPS_SESSION_COOKIE,
  can,
  type OpsLoginResult,
  type OpsOverviewStats,
  type OpsPermission,
  type OpsStaffRole,
  type OpsStaffUser,
} from "@/lib/ops-console-shared";

export type { OpsLoginResult, OpsOverviewStats, OpsPermission, OpsStaffRole, OpsStaffUser };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function gateSecret(): string {
  return process.env.OPS_CONSOLE_GATE?.trim() || "";
}

function notifyTo(): string {
  return process.env.CONTACT_NOTIFY_TO?.trim() || "";
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function clientIp(): string {
  return (
    getRequestIP({ xForwardedFor: true }) ||
    getRequestHeader("x-real-ip") ||
    getRequestHeader("cf-connecting-ip") ||
    "unknown"
  );
}

export function clientUa(): string {
  return getRequestHeader("user-agent") || "unknown";
}

export function hasOpsGateAccess(): boolean {
  const secret = gateSecret();
  if (!secret) return false;
  const cookies = getCookies() ?? {};
  const cookie = cookies[OPS_GATE_COOKIE];
  if (!cookie) return false;
  return safeEqual(cookie, sha256(`gate:${secret}`));
}

export function unlockOpsGate(rawGate: string): boolean {
  const ip = clientIp();
  if (isRateLimited(`gate:${ip}`, 20, 15 * 60_000)) return false;
  const secret = gateSecret();
  if (!secret || !rawGate || !safeEqual(rawGate, secret)) return false;
  setCookie(OPS_GATE_COOKIE, sha256(`gate:${secret}`), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

const rateBuckets = new Map<string, { n: number; reset: number }>();

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = rateBuckets.get(key);
  if (!cur || cur.reset < now) {
    rateBuckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  cur.n += 1;
  return cur.n > max;
}

async function logEvent(input: {
  category: string;
  action: string;
  actorStaffId?: string | null;
  actorUsername?: string | null;
  targetUserId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const admin = getSupabaseAdminClient();
    await admin.from("ops_events" as never).insert({
      category: input.category,
      action: input.action,
      actor_staff_id: input.actorStaffId ?? null,
      actor_username: input.actorUsername ?? null,
      target_user_id: input.targetUserId ?? null,
      ip: input.ip ?? null,
      meta: input.meta ?? {},
    } as never);
  } catch (err) {
    console.error("ops_events insert", err);
  }
}

export async function logOpsEvent(input: {
  category: string;
  action: string;
  actorStaffId?: string | null;
  actorUsername?: string | null;
  targetUserId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
}) {
  return logEvent(input);
}

export async function requireOpsStaff(): Promise<OpsStaffUser | null> {
  if (!hasOpsGateAccess()) return null;
  return getSessionStaff();
}

function discordWebhook(): string {
  return process.env.DISCORD_ADMIN_WEBHOOK?.trim() || "";
}

function clipDiscord(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Best-effort Discord alert — never throws. */
async function notifyDiscordIpChallenge(input: {
  username: string;
  role: string;
  ip: string;
  ua: string;
  allowUrl: string;
  denyUrl: string;
  expiresIso: string;
}) {
  const url = discordWebhook();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Ops Console",
        embeds: [
          {
            title: "New IP login needs approval",
            description: [
              `**${clipDiscord(input.username, 80)}** (${clipDiscord(input.role, 40)}) signed in from a new IP.`,
              "",
              `[✅ Allow IP](${input.allowUrl})`,
              `[❌ Deny](${input.denyUrl})`,
            ].join("\n"),
            color: 0xf59e0b,
            fields: [
              { name: "IP", value: clipDiscord(input.ip, 256), inline: true },
              {
                name: "Expires",
                value: clipDiscord(input.expiresIso, 64),
                inline: true,
              },
              {
                name: "User-Agent",
                value: clipDiscord(input.ua || "unknown", 1024),
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("ops discord notify", err);
  }
}

/** Send security alerts when an inbox is configured. Delivery failures are logged. */
async function sendSecurityEmail(subject: string, html: string, text: string) {
  const to = notifyTo();
  if (!to) return;
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const from = process.env.CONTACT_FROM?.trim() || "Mkitxavi Security <onboarding@resend.dev>";
      const { error } = await resend.emails.send({ from, to: [to], subject, html, text });
      if (error) console.error("ops security email resend", error);
      return;
    }

    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: subject,
        message: text,
        html,
        _template: "box",
        _captcha: "false",
      }),
    });
    if (!res.ok) {
      console.error("ops security email formsubmit HTTP", res.status, await res.text());
    }
  } catch (err) {
    console.error("ops security email", err);
  }
}

export async function getSessionStaff(): Promise<OpsStaffUser | null> {
  const cookies = getCookies() ?? {};
  const raw = cookies[OPS_SESSION_COOKIE];
  if (!raw) return null;

  const admin = getSupabaseAdminClient();
  const tokenHash = sha256(raw);
  const { data: session } = await admin
    .from("ops_staff_sessions" as never)
    .select("id, staff_user_id, expires_at, revoked_at, ip")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const s = session as {
    id: string;
    staff_user_id: string;
    expires_at: string;
    revoked_at: string | null;
    ip: string;
  } | null;

  if (!s || s.revoked_at || new Date(s.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Re-validate allowlist on every request — revoked IPs kill live sessions.
  // Fail closed when IP cannot be resolved (do not skip allowlist).
  const ip = clientIp();
  const allowed = await isIpAllowed(s.staff_user_id, ip);
  if (!allowed) {
    await admin
      .from("ops_staff_sessions" as never)
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("id", s.id);
    return null;
  }

  const { data: user } = await admin
    .from("ops_staff_users" as never)
    .select("id, username, role, display_name, disabled, permissions, denied_permissions")
    .eq("id", s.staff_user_id)
    .maybeSingle();

  const u = user as {
    id: string;
    username: string;
    role: OpsStaffRole;
    display_name: string;
    disabled: boolean;
    permissions: unknown;
    denied_permissions: unknown;
  } | null;

  if (!u || u.disabled) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    display_name: u.display_name,
    permissions: asPermissionList(u.permissions),
    denied: asPermissionList(u.denied_permissions),
  };
}

export function asPermissionList(value: unknown): OpsPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is OpsPermission =>
      typeof v === "string" && (ALL_PERMISSIONS as readonly string[]).includes(v),
  );
}

async function createSession(staffId: string, ip: string, ua: string): Promise<string> {
  const admin = getSupabaseAdminClient();
  const raw = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12h
  await admin.from("ops_staff_sessions" as never).insert({
    staff_user_id: staffId,
    token_hash: sha256(raw),
    ip,
    user_agent: ua.slice(0, 500),
    expires_at: expires.toISOString(),
  } as never);

  setCookie(OPS_SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return raw;
}

async function isIpAllowed(staffId: string, ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ops_staff_ip_allowlist" as never)
    .select("id")
    .eq("staff_user_id", staffId)
    .eq("ip", ip)
    .maybeSingle();
  return Boolean(data);
}

async function allowlistIp(staffId: string, ip: string, label: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("ops_staff_ip_allowlist" as never).upsert(
    {
      staff_user_id: staffId,
      ip,
      label,
    } as never,
    { onConflict: "staff_user_id,ip" },
  );
}

async function createIpChallenge(
  staff: {
    id: string;
    username: string;
    role: string;
  },
  ip: string,
  ua: string,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const raw = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 1000 * 60 * 30);
  const expiresIso = expires.toISOString();

  await admin.from("ops_ip_challenges" as never).insert({
    staff_user_id: staff.id,
    ip,
    user_agent: ua.slice(0, 500),
    token_hash: sha256(raw),
    status: "pending",
    expires_at: expiresIso,
  } as never);

  const allowUrl = `${SITE_URL}/api/ops/ip-challenge?token=${encodeURIComponent(raw)}&action=allow`;
  const denyUrl = `${SITE_URL}/api/ops/ip-challenge?token=${encodeURIComponent(raw)}&action=deny`;

  const subject = `[Mkitxavi Ops] New IP login for ${staff.username}`;
  const text = [
    `Staff login from a new IP needs approval.`,
    ``,
    `User: ${staff.username} (${staff.role})`,
    `IP: ${ip}`,
    `UA: ${ua}`,
    `Expires: ${expiresIso}`,
    ``,
    `ALLOW: ${allowUrl}`,
    `DENY:  ${denyUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <h2>New IP login approval</h2>
      <p><strong>${staff.username}</strong> (${staff.role}) tried to sign in from a new IP.</p>
      <p><strong>IP:</strong> ${ip}<br/><strong>UA:</strong> ${ua}</p>
      <p>
        <a href="${allowUrl}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">Allow IP</a>
        <a href="${denyUrl}" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px">Deny</a>
      </p>
      <p style="color:#666;font-size:12px">Link expires in 30 minutes.</p>
    </div>
  `;

  // Discord is the reliable path (RESEND not configured; FormSubmit often needs activation).
  await notifyDiscordIpChallenge({
    username: staff.username,
    role: staff.role,
    ip,
    ua,
    allowUrl,
    denyUrl,
    expiresIso,
  });
  await sendSecurityEmail(subject, html, text);
  await logEvent({
    category: "security",
    action: "ip_challenge_created",
    actorStaffId: staff.id,
    actorUsername: staff.username,
    ip,
    meta: { ua },
  });
}

export async function attemptOpsLogin(username: string, password: string): Promise<OpsLoginResult> {
  if (!hasOpsGateAccess()) {
    return { ok: false, error: "Not found." };
  }

  const ip = clientIp();
  if (isRateLimited(`login:${ip}`, 30, 15 * 60_000)) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }
  const ua = clientUa();
  const admin = getSupabaseAdminClient();

  const { data: row } = await admin
    .from("ops_staff_users" as never)
    .select("*")
    .ilike("username", username.trim())
    .maybeSingle();

  const user = row as {
    id: string;
    username: string;
    password_hash: string;
    role: OpsStaffRole;
    display_name: string;
    disabled: boolean;
    failed_logins: number;
    locked_until: string | null;
    permissions: unknown;
    denied_permissions: unknown;
  } | null;

  if (!user || user.disabled) {
    await logEvent({ category: "security", action: "login_failed", ip, meta: { username } });
    return { ok: false, error: "Invalid credentials." };
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { ok: false, error: "Account temporarily locked. Try again later." };
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const fails = (user.failed_logins || 0) + 1;
    const patch: Record<string, unknown> = {
      failed_logins: fails,
      updated_at: new Date().toISOString(),
    };
    if (fails >= 5) {
      patch.locked_until = new Date(Date.now() + 1000 * 60 * 15).toISOString();
      patch.failed_logins = 0;
    }
    await admin
      .from("ops_staff_users" as never)
      .update(patch as never)
      .eq("id", user.id);
    await logEvent({
      category: "security",
      action: "login_failed",
      actorStaffId: user.id,
      actorUsername: user.username,
      ip,
    });
    return { ok: false, error: "Invalid credentials." };
  }

  const allowed = await isIpAllowed(user.id, ip);
  // Never auto-allowlist on first login — cracked/leaked staff passwords must
  // still pass Discord/email IP challenge before console access.

  if (!allowed) {
    await createIpChallenge({ id: user.id, username: user.username, role: user.role }, ip, ua);
    return {
      ok: true,
      status: "pending_ip",
      message:
        "New IP detected. Approve via Discord (Ops Console alert) or email Allow link, then sign in again.",
    };
  }

  await createSession(user.id, ip, ua);
  await admin
    .from("ops_staff_users" as never)
    .update({
      failed_logins: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_ip: ip,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", user.id);

  await logEvent({
    category: "security",
    action: "login_ok",
    actorStaffId: user.id,
    actorUsername: user.username,
    ip,
  });

  return {
    ok: true,
    status: "authenticated",
    staff: {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
      permissions: asPermissionList(user.permissions),
      denied: asPermissionList(user.denied_permissions),
    },
  };
}

/**
 * Gate every console mutation: valid gate cookie, live session, and the
 * specific permission. Throwing keeps callers from forgetting the check.
 */
export async function requirePermission(permission: OpsPermission): Promise<OpsStaffUser> {
  const staff = await requireOpsStaff();
  if (!staff) throw new Error("unauthorized");
  if (!can(staff, permission)) throw new Error(`forbidden:${permission}`);
  return staff;
}

export async function resolveIpChallenge(
  rawToken: string,
  action: "allow" | "deny",
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdminClient();
  const tokenHash = sha256(rawToken);
  const { data } = await admin
    .from("ops_ip_challenges" as never)
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const challenge = data as {
    id: string;
    staff_user_id: string;
    ip: string;
    status: string;
    expires_at: string;
  } | null;

  if (!challenge) return { ok: false, message: "Invalid or expired link." };
  if (challenge.status !== "pending") {
    return { ok: false, message: `Challenge already ${challenge.status}.` };
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await admin
      .from("ops_ip_challenges" as never)
      .update({ status: "expired", resolved_at: new Date().toISOString() } as never)
      .eq("id", challenge.id);
    return { ok: false, message: "This link has expired." };
  }

  if (action === "deny") {
    await admin
      .from("ops_ip_challenges" as never)
      .update({ status: "denied", resolved_at: new Date().toISOString() } as never)
      .eq("id", challenge.id);
    await logEvent({
      category: "security",
      action: "ip_denied",
      actorStaffId: challenge.staff_user_id,
      ip: challenge.ip,
    });
    return { ok: true, message: "Login denied. IP was not allowlisted." };
  }

  await allowlistIp(challenge.staff_user_id, challenge.ip, "challenge-approved");

  await admin
    .from("ops_ip_challenges" as never)
    .update({ status: "allowed", resolved_at: new Date().toISOString() } as never)
    .eq("id", challenge.id);

  await logEvent({
    category: "security",
    action: "ip_allowed",
    actorStaffId: challenge.staff_user_id,
    ip: challenge.ip,
  });

  return {
    ok: true,
    message: "IP allowed. The staff member can sign in again from that IP.",
  };
}

export async function opsLogout(): Promise<void> {
  const cookies = getCookies() ?? {};
  const raw = cookies[OPS_SESSION_COOKIE];
  if (raw) {
    const admin = getSupabaseAdminClient();
    await admin
      .from("ops_staff_sessions" as never)
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("token_hash", sha256(raw));
  }
  setCookie(OPS_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function fetchOpsOverview(): Promise<OpsOverviewStats> {
  const admin = getSupabaseAdminClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dayIso = startOfDay.toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const [
    usersTotal,
    usersToday,
    usersWeek,
    premium,
    mystic,
    ascended,
    comp,
    contactsOpen,
    contactsTotal,
    events,
    banned,
    restricted,
    watchlist,
    unlimited,
    readingsToday,
    readingsTotal,
    pendingChallenges,
    flaggedDevices,
    energyRows,
    flagsOff,
    announcements,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayIso),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("plan", "mystic"),
    admin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("plan", "ascended"),
    admin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_comp", true),
    admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "pending"]),
    admin.from("contact_messages").select("id", { count: "exact", head: true }),
    admin
      .from("ops_events" as never)
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayIso),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("banned", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("chat_restricted", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("watchlist", true),
    admin
      .from("energy_balance")
      .select("user_id", { count: "exact", head: true })
      .eq("unlimited", true),
    admin
      .from("reading_history")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayIso),
    admin.from("reading_history").select("id", { count: "exact", head: true }),
    admin
      .from("ops_ip_challenges" as never)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("ops_device_links" as never)
      .select("id", { count: "exact", head: true })
      .eq("flagged", true),
    admin.from("energy_balance").select("balance"),
    admin
      .from("ops_feature_flags" as never)
      .select("key", { count: "exact", head: true })
      .eq("enabled", false),
    admin
      .from("ops_announcements" as never)
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .lte("starts_at", nowIso),
  ]);

  const energyRowsList = (energyRows.data as { balance: number }[] | null) ?? [];
  const energySum = energyRowsList.reduce((sum, row) => sum + (row.balance || 0), 0);
  const usersTotalN = usersTotal.count ?? 0;
  const premiumN = premium.count ?? 0;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 13);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [{ data: signupRows }, { data: readingRows }, { data: planRows }] = await Promise.all([
    admin.from("profiles").select("created_at").gte("created_at", sinceIso),
    admin.from("reading_history").select("created_at").gte("created_at", sinceIso),
    admin.from("subscriptions").select("plan").eq("status", "active").limit(3000),
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
  const readingMap = emptyDays();
  for (const p of (signupRows ?? []) as { created_at: string }[]) {
    const day = p.created_at.slice(0, 10);
    if (signupMap.has(day)) signupMap.set(day, (signupMap.get(day) || 0) + 1);
  }
  for (const r of (readingRows ?? []) as { created_at: string }[]) {
    const day = r.created_at.slice(0, 10);
    if (readingMap.has(day)) readingMap.set(day, (readingMap.get(day) || 0) + 1);
  }
  const planMap = new Map<string, number>();
  for (const s of (planRows ?? []) as { plan: string }[]) {
    planMap.set(s.plan || "none", (planMap.get(s.plan || "none") || 0) + 1);
  }

  return {
    usersTotal: usersTotalN,
    usersToday: usersToday.count ?? 0,
    usersWeek: usersWeek.count ?? 0,
    premiumActive: premiumN,
    mysticActive: mystic.count ?? 0,
    ascendedActive: ascended.count ?? 0,
    compActive: comp.count ?? 0,
    contactOpen: contactsOpen.count ?? 0,
    contactTotal: contactsTotal.count ?? 0,
    eventsToday: events.count ?? 0,
    bannedCount: banned.count ?? 0,
    restrictedCount: restricted.count ?? 0,
    watchlistCount: watchlist.count ?? 0,
    unlimitedCount: unlimited.count ?? 0,
    energySum,
    readingsToday: readingsToday.count ?? 0,
    readingsTotal: readingsTotal.count ?? 0,
    pendingIpChallenges: pendingChallenges.count ?? 0,
    flaggedDevices: flaggedDevices.count ?? 0,
    killSwitchesOff: flagsOff.count ?? 0,
    liveAnnouncements: announcements.count ?? 0,
    conversionPct: usersTotalN ? Math.round((premiumN / usersTotalN) * 1000) / 10 : 0,
    avgEnergy: energyRowsList.length ? Math.round(energySum / energyRowsList.length) : 0,
    signupsByDay: [...signupMap.entries()].map(([day, count]) => ({ day, count })),
    readingsByDay: [...readingMap.entries()].map(([day, count]) => ({ day, count })),
    planSplit: [...planMap.entries()].map(([plan, count]) => ({ plan, count })),
  };
}
