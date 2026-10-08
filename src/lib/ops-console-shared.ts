/** Shared ops console constants + wire types (safe for client + server). */
export const OPS_CONSOLE_PATH = "/console-k9r4vxm2qh7n";
export const OPS_GATE_COOKIE = "ops_gate";
export const OPS_SESSION_COOKIE = "ops_sess";

export {
  ALL_PERMISSIONS,
  OPS_NAV,
  PERMISSION_GROUPS,
  PROTECTED_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  can,
  effectivePermissions,
  navForStaff,
} from "./ops-permissions";
export type { OpsNavId, OpsPermission, OpsStaffRole } from "./ops-permissions";

export { assignableRoles, ROLE_RANK } from "./ops-permissions";
import type { OpsPermission, OpsStaffRole } from "./ops-permissions";

export type OpsStaffUser = {
  id: string;
  username: string;
  role: OpsStaffRole;
  display_name: string;
  permissions: OpsPermission[];
  denied: OpsPermission[];
};

export type OpsOverviewStats = {
  usersTotal: number;
  usersToday: number;
  usersWeek: number;
  premiumActive: number;
  mysticActive: number;
  ascendedActive: number;
  compActive: number;
  contactOpen: number;
  contactTotal: number;
  eventsToday: number;
  bannedCount: number;
  restrictedCount: number;
  watchlistCount: number;
  unlimitedCount: number;
  energySum: number;
  readingsToday: number;
  readingsTotal: number;
  pendingIpChallenges: number;
  flaggedDevices: number;
  killSwitchesOff: number;
  liveAnnouncements: number;
  conversionPct: number;
  avgEnergy: number;
  signupsByDay: Array<{ day: string; count: number }>;
  readingsByDay: Array<{ day: string; count: number }>;
  planSplit: Array<{ plan: string; count: number }>;
};

export type OpsLoginResult =
  | { ok: true; status: "authenticated"; staff: OpsStaffUser }
  | { ok: true; status: "pending_ip"; message: string }
  | { ok: false; error: string };

export type OpsActionResult = { ok: boolean; message?: string; error?: string; detail?: string };

export type OpsUserRow = {
  id: string;
  display_name: string;
  /** Auth mailbox — used as list label when display_name is unset. */
  authEmail: string | null;
  /**
   * Admin-panel-only label: real display_name, else email.
   * Never written back to profiles — UI display only.
   */
  label: string;
  lang: string | null;
  banned: boolean;
  chat_restricted: boolean;
  watchlist: boolean;
  ban_reason: string | null;
  email_verified: boolean;
  streak: number;
  created_at: string;
  energy: number | null;
  unlimited: boolean;
  plan: string | null;
  sub_status: string | null;
  is_comp: boolean;
};

/** Prefer display name; fall back to email when name is empty / placeholder. */
export function opsUserLabel(
  displayName: string | null | undefined,
  email?: string | null,
): string {
  const name = (displayName ?? "").trim();
  if (name && name !== "-" && name !== "—" && name !== "–") return name;
  const mail = (email ?? "").trim();
  return mail || "—";
}

export type OpsGrantRow = {
  id: number;
  user_id: string;
  kind: string;
  amount: number | null;
  plan: string | null;
  days: number | null;
  expires_at: string | null;
  note: string | null;
  actor_username: string | null;
  created_at: string;
};

export type OpsUserDossier = OpsUserRow & {
  birth_date: string | null;
  interests: string[];
  hobbies: string[];
  cosmic_vibe: string | null;
  onboarding_complete: boolean;
  best_streak: number;
  last_visit: string | null;
  marketing_opt_in: boolean;
  mod_notes: string | null;
  banned_at: string | null;
  banned_by: string | null;
  daily_cap: number | null;
  next_free_refill_at: string | null;
  granted_by: string | null;
  grant_note: string | null;
  period_end: string | null;
  provider: string;
  authBannedUntil: string | null;
  lastSignInAt: string | null;
  readingsCount: number;
  recentReadings: Array<{
    id: string;
    kind: string;
    energy_spent: number;
    created_at: string;
    result_text: string;
  }>;
  grants: OpsGrantRow[];
};

export type OpsChatMessage = {
  id: number;
  role: "user" | "nina" | "unknown";
  text: string;
  createdAt: string | null;
  hasCards: boolean;
  hasImage: boolean;
  /** Coffee / photo payloads (data URLs or https). */
  imageUrl: string | null;
  /** Card names drawn in this turn, if any. */
  cards: string[];
};

/** Compact ops timestamp for lists and chat bubbles. */
export function formatOpsTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type OpsUserConversation = {
  userId: string;
  service: string | null;
  updatedAt: string | null;
  messageCount: number;
  messages: OpsChatMessage[];
};

export type OpsReadingFull = {
  id: string;
  kind: string;
  lang: string | null;
  cards: string[];
  input: Record<string, string>;
  result_text: string;
  energy_spent: number;
  created_at: string;
};

export type OpsContactRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  message: string;
  user_id: string | null;
  status: string;
  staff_reply: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type OpsMacroRow = {
  id: number;
  title: string;
  body: string;
  lang: string;
};

export type OpsEventRow = {
  id: number;
  category: string;
  action: string;
  actor_username: string | null;
  target_user_id: string | null;
  ip: string | null;
  meta: Record<string, string | number | boolean | null>;
  created_at: string;
};

export type OpsIpAllowRow = {
  id: string;
  staff_user_id: string;
  username: string;
  ip: string;
  label: string | null;
  created_at: string;
};

export type OpsChallengeRow = {
  id: string;
  staff_user_id: string;
  username: string;
  ip: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type OpsSessionRow = {
  id: string;
  username: string;
  ip: string;
  user_agent: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type OpsSubRow = {
  user_id: string;
  display_name: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
  provider: string;
  is_comp: boolean;
  granted_by: string | null;
};

export type OpsEnergyRow = {
  user_id: string;
  display_name: string;
  balance: number;
  daily_cap: number;
  unlimited: boolean;
  next_free_refill_at: string | null;
  updated_at: string;
  banned: boolean;
};

export type OpsDeviceCluster = {
  fingerprint_hash: string;
  account_count: number;
  flagged: boolean;
  users: Array<{ user_id: string; display_name: string; banned: boolean }>;
  last_seen_at: string;
  ip: string | null;
};

export type OpsAnalytics = {
  signupsByDay: Array<{ day: string; count: number }>;
  readingsByDay: Array<{ day: string; count: number }>;
  readingsByKind: Array<{ kind: string; count: number }>;
  langSplit: Array<{ lang: string; count: number }>;
  planSplit: Array<{ plan: string; count: number }>;
  energyTop: Array<{ user_id: string; display_name: string; balance: number }>;
  streakTop: Array<{ user_id: string; display_name: string; streak: number }>;
};

export type OpsFlagRow = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type OpsAnnouncementRow = {
  id: number;
  title: string;
  body: string;
  level: string;
  lang: string;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
};

export type OpsWebhookRow = {
  source: string;
  id: string;
  type: string;
  processed_at: string;
};

export type OpsDevHealth = {
  env: Array<{ key: string; ok: boolean; note: string }>;
  siteUrl: string;
  dbTables: Array<{ table: string; rows: number }>;
  changelog: Array<{
    id: number;
    title: string;
    body: string;
    author_username: string | null;
    created_at: string;
  }>;
  webhooks: OpsWebhookRow[];
};

export type OpsStaffRow = {
  id: string;
  username: string;
  role: OpsStaffRole;
  display_name: string;
  disabled: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  failed_logins: number;
  permissions: OpsPermission[];
  denied_permissions: OpsPermission[];
  note: string | null;
  created_by: string | null;
  created_at: string;
};
