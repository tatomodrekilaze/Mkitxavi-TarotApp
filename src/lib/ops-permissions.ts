/** Ops console RBAC. Safe for client + server (pure data). */

export type OpsStaffRole =
  | "owner"
  | "co_owner"
  | "superadmin"
  | "admin"
  | "developer"
  | "manager"
  | "moderator"
  | "support"
  | "staff";

export type OpsPermission =
  // People
  | "users.view"
  | "users.ban"
  | "users.restrict"
  | "users.watchlist"
  | "users.notes"
  | "users.delete"
  | "users.reset_password"
  | "users.verify_email"
  | "users.export"
  | "users.conversations"
  | "users.force_logout"
  // Energy
  | "energy.view"
  | "energy.grant"
  | "energy.set"
  | "energy.cap"
  | "energy.unlimited"
  // Farm / anti-abuse
  | "farm.view"
  | "farm.flag"
  // Billing
  | "billing.view"
  | "billing.grant"
  | "billing.revoke"
  // Support
  | "support.view"
  | "support.reply"
  | "support.close"
  | "support.macros"
  // Security
  | "security.view"
  | "security.events"
  | "security.ip"
  // Analytics
  | "analytics.view"
  // System / developer
  | "system.health"
  | "system.flags"
  | "system.announcements"
  | "system.changelog"
  | "system.webhooks"
  // Staff administration
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.disable"
  | "staff.reset_password"
  | "staff.permissions";

export const ALL_PERMISSIONS: OpsPermission[] = [
  "users.view",
  "users.ban",
  "users.restrict",
  "users.watchlist",
  "users.notes",
  "users.delete",
  "users.reset_password",
  "users.verify_email",
  "users.export",
  "users.conversations",
  "users.force_logout",
  "energy.view",
  "energy.grant",
  "energy.set",
  "energy.cap",
  "energy.unlimited",
  "farm.view",
  "farm.flag",
  "billing.view",
  "billing.grant",
  "billing.revoke",
  "support.view",
  "support.reply",
  "support.close",
  "support.macros",
  "security.view",
  "security.events",
  "security.ip",
  "analytics.view",
  "system.health",
  "system.flags",
  "system.announcements",
  "system.changelog",
  "system.webhooks",
  "staff.view",
  "staff.create",
  "staff.edit",
  "staff.disable",
  "staff.reset_password",
  "staff.permissions",
];

export const PERMISSION_GROUPS: Array<{ label: string; keys: OpsPermission[] }> = [
  {
    label: "People",
    keys: [
      "users.view",
      "users.ban",
      "users.restrict",
      "users.watchlist",
      "users.notes",
      "users.delete",
      "users.reset_password",
      "users.verify_email",
      "users.export",
      "users.conversations",
      "users.force_logout",
    ],
  },
  {
    label: "Energy",
    keys: ["energy.view", "energy.grant", "energy.set", "energy.cap", "energy.unlimited"],
  },
  { label: "Anti-abuse", keys: ["farm.view", "farm.flag"] },
  { label: "Billing", keys: ["billing.view", "billing.grant", "billing.revoke"] },
  { label: "Support", keys: ["support.view", "support.reply", "support.close", "support.macros"] },
  { label: "Security", keys: ["security.view", "security.events", "security.ip"] },
  { label: "Analytics", keys: ["analytics.view"] },
  {
    label: "System",
    keys: [
      "system.health",
      "system.flags",
      "system.announcements",
      "system.changelog",
      "system.webhooks",
    ],
  },
  {
    label: "Staff",
    keys: [
      "staff.view",
      "staff.create",
      "staff.edit",
      "staff.disable",
      "staff.reset_password",
      "staff.permissions",
    ],
  },
];

const OWNER_SET = ALL_PERMISSIONS;

const SUPERADMIN_SET: OpsPermission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "staff.create" && p !== "staff.permissions",
);

const DEVELOPER_SET: OpsPermission[] = [
  "users.view",
  "users.export",
  "users.conversations",
  "energy.view",
  "energy.grant",
  "energy.set",
  "energy.cap",
  "energy.unlimited",
  "farm.view",
  "farm.flag",
  "billing.view",
  "security.view",
  "security.events",
  "analytics.view",
  "system.health",
  "system.flags",
  "system.announcements",
  "system.changelog",
  "system.webhooks",
  "staff.view",
];

const MANAGER_SET: OpsPermission[] = [
  "users.view",
  "users.ban",
  "users.restrict",
  "users.watchlist",
  "users.notes",
  "users.verify_email",
  "users.export",
  "users.conversations",
  "users.force_logout",
  "energy.view",
  "energy.grant",
  "energy.set",
  "energy.cap",
  "farm.view",
  "billing.view",
  "billing.grant",
  "billing.revoke",
  "support.view",
  "support.reply",
  "support.close",
  "support.macros",
  "security.view",
  "analytics.view",
  "system.announcements",
  "staff.view",
];

const MODERATOR_SET: OpsPermission[] = [
  "users.view",
  "users.ban",
  "users.restrict",
  "users.watchlist",
  "users.notes",
  "users.conversations",
  "users.force_logout",
  "energy.view",
  "energy.set",
  "farm.view",
  "farm.flag",
  "support.view",
  "support.reply",
  "support.close",
  "security.view",
  "security.events",
];

const SUPPORT_SET: OpsPermission[] = [
  "users.view",
  "users.notes",
  "users.verify_email",
  "users.conversations",
  "energy.view",
  "energy.grant",
  "billing.view",
  "support.view",
  "support.reply",
  "support.close",
  "support.macros",
];

const STAFF_SET: OpsPermission[] = ["users.view", "energy.view", "support.view", "support.reply"];

export const ROLE_PERMISSIONS: Record<OpsStaffRole, OpsPermission[]> = {
  owner: OWNER_SET,
  co_owner: OWNER_SET,
  superadmin: SUPERADMIN_SET,
  admin: SUPERADMIN_SET,
  developer: DEVELOPER_SET,
  manager: MANAGER_SET,
  moderator: MODERATOR_SET,
  support: SUPPORT_SET,
  staff: STAFF_SET,
};

export const ROLE_LABELS: Record<OpsStaffRole, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  superadmin: "Superadmin",
  admin: "Admin",
  developer: "Developer",
  manager: "Manager",
  moderator: "Moderator",
  support: "Support",
  staff: "Staff",
};

export const ROLE_RANK: Record<OpsStaffRole, number> = {
  owner: 100,
  co_owner: 90,
  superadmin: 80,
  admin: 70,
  developer: 60,
  manager: 60,
  moderator: 40,
  support: 30,
  staff: 20,
};

/** Roles that can never be edited or disabled by a non-owner. */
export const PROTECTED_ROLES: OpsStaffRole[] = ["owner", "co_owner"];

export function assignableRoles(actorRole: OpsStaffRole): OpsStaffRole[] {
  const ranks = Object.keys(ROLE_RANK) as OpsStaffRole[];
  if (actorRole === "owner") return ranks;
  return ranks.filter((r) => !PROTECTED_ROLES.includes(r) && ROLE_RANK[r] < ROLE_RANK[actorRole]);
}

export type OpsStaffIdentity = {
  id: string;
  username: string;
  display_name: string;
  role: OpsStaffRole;
  /** Extra permissions granted on top of the role. */
  permissions: OpsPermission[];
  /** Permissions revoked from the role for this individual. */
  denied: OpsPermission[];
};

export function effectivePermissions(staff: {
  role: OpsStaffRole;
  permissions?: OpsPermission[] | null;
  denied?: OpsPermission[] | null;
}): OpsPermission[] {
  const base = new Set<OpsPermission>(ROLE_PERMISSIONS[staff.role] ?? []);
  for (const extra of staff.permissions ?? []) base.add(extra);
  for (const gone of staff.denied ?? []) base.delete(gone);
  return [...base];
}

export function can(
  staff: {
    role: OpsStaffRole;
    permissions?: OpsPermission[] | null;
    denied?: OpsPermission[] | null;
  },
  permission: OpsPermission,
): boolean {
  if (staff.role === "owner" || staff.role === "co_owner") {
    return !(staff.denied ?? []).includes(permission);
  }
  return effectivePermissions(staff).includes(permission);
}

export type OpsNavId =
  | "overview"
  | "users"
  | "moderation"
  | "support"
  | "billing"
  | "energy"
  | "farm"
  | "security"
  | "audit"
  | "analytics"
  | "system"
  | "staff";

export const OPS_NAV: Array<{
  id: OpsNavId;
  label: string;
  blurb: string;
  icon: string;
  requires: OpsPermission | null;
}> = [
  { id: "overview", label: "Overview", blurb: "Command pulse", icon: "grid", requires: null },
  {
    id: "users",
    label: "People",
    blurb: "Dossier · god actions",
    icon: "users",
    requires: "users.view",
  },
  {
    id: "moderation",
    label: "Moderation",
    blurb: "Bans · watchlist",
    icon: "shield",
    requires: "users.ban",
  },
  {
    id: "support",
    label: "Support",
    blurb: "Inbox · macros",
    icon: "inbox",
    requires: "support.view",
  },
  {
    id: "billing",
    label: "Billing",
    blurb: "Plans · comps",
    icon: "card",
    requires: "billing.view",
  },
  { id: "energy", label: "Energy", blurb: "Grants · caps", icon: "bolt", requires: "energy.view" },
  {
    id: "farm",
    label: "Anti-abuse",
    blurb: "Device clusters",
    icon: "radar",
    requires: "farm.view",
  },
  {
    id: "security",
    label: "Security",
    blurb: "IPs · challenges",
    icon: "lock",
    requires: "security.view",
  },
  {
    id: "audit",
    label: "Audit log",
    blurb: "Every action",
    icon: "list",
    requires: "security.events",
  },
  {
    id: "analytics",
    label: "Analytics",
    blurb: "Growth · usage",
    icon: "chart",
    requires: "analytics.view",
  },
  {
    id: "system",
    label: "System",
    blurb: "Flags · health",
    icon: "cpu",
    requires: "system.health",
  },
  { id: "staff", label: "Staff", blurb: "Operators · RBAC", icon: "badge", requires: "staff.view" },
];

export function navForStaff(staff: {
  role: OpsStaffRole;
  permissions?: OpsPermission[] | null;
  denied?: OpsPermission[] | null;
}): OpsNavId[] {
  return OPS_NAV.filter((n) => !n.requires || can(staff, n.requires)).map((n) => n.id);
}
