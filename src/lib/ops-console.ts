import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  attemptOpsLogin,
  fetchOpsOverview,
  getSessionStaff,
  hasOpsGateAccess,
  opsLogout,
  unlockOpsGate,
} from "./ops-console.server";
import {
  addOpsChangelog,
  addOpsMacro,
  banOpsUser,
  clearOpsUserConversation,
  createOpsAnnouncement,
  createOpsStaff,
  deleteOpsMacro,
  deleteOpsUser,
  exportOpsUsersCsv,
  fetchOpsAnalytics,
  fetchOpsDevHealth,
  fetchOpsUserConversation,
  fetchOpsUserDossier,
  fetchOpsUserReadingsFull,
  flagOpsDevice,
  forceAllowOpsIp,
  resolveOpsIpChallengeById,
  forceOpsUserLogout,
  grantOpsEnergy,
  resetOpsUserStreak,
  grantOpsSubscription,
  listModerationQueue,
  listOpsAnnouncements,
  listOpsChallenges,
  listOpsContacts,
  listOpsDeviceClusters,
  listOpsEnergyLeaders,
  listOpsEvents,
  listOpsFlags,
  listOpsGrants,
  listOpsIpAllowlist,
  listOpsMacros,
  listOpsSessions,
  listOpsStaff,
  listOpsSubscriptions,
  punishOpsCluster,
  resetOpsStaffPassword,
  resetOpsUserPassword,
  restrictOpsUser,
  revokeOpsIp,
  revokeOpsSession,
  revokeOpsSubscription,
  searchOpsUsers,
  setOpsAnnouncementActive,
  setOpsDailyCap,
  setOpsFlag,
  setOpsStaffDisabled,
  setOpsStaffPermissions,
  setOpsUnlimitedEnergy,
  setOpsUserEnergy,
  setOpsUserNotes,
  setOpsUserPlan,
  updateOpsContact,
  updateOpsStaff,
  verifyOpsUserEmail,
  watchlistOpsUser,
} from "./ops-console-data.server";
import { ALL_PERMISSIONS } from "./ops-permissions";
import type {
  OpsActionResult,
  OpsLoginResult,
  OpsOverviewStats,
  OpsStaffUser,
} from "./ops-console-shared";

/** Turn thrown auth/permission errors into a result the UI can render. */
async function guarded<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "unauthorized" || message.startsWith("forbidden")) {
      return fallback;
    }
    console.error("ops action failed", err);
    return fallback;
  }
}

async function action(run: () => Promise<OpsActionResult>): Promise<OpsActionResult> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    if (message.startsWith("forbidden")) {
      return { ok: false, error: `Missing permission: ${message.split(":")[1] ?? "unknown"}` };
    }
    if (message === "unauthorized") return { ok: false, error: "Session expired. Sign in again." };
    console.error("ops action failed", err);
    return { ok: false, error: "Action failed." };
  }
}

const roleEnum = z.enum([
  "owner",
  "co_owner",
  "superadmin",
  "admin",
  "developer",
  "manager",
  "moderator",
  "support",
  "staff",
]);

const permissionEnum = z.enum(ALL_PERMISSIONS as [string, ...string[]]);

/* ------------------------------------------------------------------- auth */

export const opsCheckGate = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ open: boolean }> => ({ open: hasOpsGateAccess() }),
);

export const opsUnlockGate = createServerFn({ method: "POST" })
  .validator(z.object({ gate: z.string().min(16).max(200) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => ({ ok: unlockOpsGate(data.gate) }));

export const opsGetSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ staff: OpsStaffUser | null }> => {
    if (!hasOpsGateAccess()) return { staff: null };
    return { staff: await getSessionStaff() };
  },
);

export const opsLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().trim().min(1).max(80),
      password: z.string().min(1).max(200),
    }),
  )
  .handler(
    async ({ data }): Promise<OpsLoginResult> => attemptOpsLogin(data.username, data.password),
  );

export const opsLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await opsLogout();
  return { ok: true as const };
});

export const opsOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpsOverviewStats | { error: string }> => {
    if (!hasOpsGateAccess()) return { error: "forbidden" };
    const staff = await getSessionStaff();
    if (!staff) return { error: "unauthorized" };
    return fetchOpsOverview();
  },
);

/* ----------------------------------------------------------------- people */

export const opsSearchUsers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().max(120).optional(),
      filter: z
        .enum([
          "all",
          "banned",
          "restricted",
          "watchlist",
          "premium",
          "comp",
          "unlimited",
          "unverified",
        ])
        .optional(),
    }),
  )
  .handler(async ({ data }) =>
    guarded(() => searchOpsUsers(data.q || "", data.filter || "all"), []),
  );

export const opsUserDossier = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => guarded(() => fetchOpsUserDossier(data.userId), null));

export const opsModerationQueue = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listModerationQueue(), []),
);

const notifyFields = {
  notify: z.boolean().optional(),
  notifyLang: z.enum(["en", "ka"]).optional(),
};

export const opsBanUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      ban: z.boolean(),
      reason: z.string().max(500).optional(),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => banOpsUser(data)));

export const opsRestrictUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), restrict: z.boolean(), ...notifyFields }))
  .handler(async ({ data }) => action(() => restrictOpsUser(data)));

export const opsWatchlistUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), watch: z.boolean() }))
  .handler(async ({ data }) => action(() => watchlistOpsUser(data)));

export const opsSetNotes = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), notes: z.string().max(4000) }))
  .handler(async ({ data }) => action(() => setOpsUserNotes(data)));

export const opsVerifyEmail = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), verified: z.boolean(), ...notifyFields }))
  .handler(async ({ data }) => action(() => verifyOpsUserEmail(data)));

export const opsResetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => action(() => resetOpsUserPassword(data)));

export const opsDeleteUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      confirm: z.string().max(20),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => deleteOpsUser(data)));

export const opsExportUsers = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => exportOpsUsersCsv(), { csv: "", rows: 0 }),
);

export const opsUserConversation = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => guarded(() => fetchOpsUserConversation(data.userId), null));

export const opsClearConversation = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), ...notifyFields }))
  .handler(async ({ data }) => action(() => clearOpsUserConversation(data)));

export const opsUserReadings = createServerFn({ method: "GET" })
  .validator(
    z.object({ userId: z.string().uuid(), limit: z.number().int().min(1).max(100).optional() }),
  )
  .handler(async ({ data }) =>
    guarded(() => fetchOpsUserReadingsFull(data.userId, data.limit ?? 40), []),
  );

export const opsForceLogout = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), ...notifyFields }))
  .handler(async ({ data }) => action(() => forceOpsUserLogout(data)));

export const opsResetUserStreak = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), ...notifyFields }))
  .handler(async ({ data }) => action(() => resetOpsUserStreak(data)));

/* ----------------------------------------------------------------- energy */

export const opsGrantEnergy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      delta: z.number().int().min(-100000).max(100000),
      note: z.string().max(300).optional(),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => grantOpsEnergy(data)));

export const opsSetEnergy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      balance: z.number().int().min(0).max(1000000),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => setOpsUserEnergy(data)));

export const opsSetDailyCap = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      cap: z.number().int().min(0).max(10000),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => setOpsDailyCap(data)));

export const opsSetUnlimited = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      unlimited: z.boolean(),
      note: z.string().max(300).optional(),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => setOpsUnlimitedEnergy(data)));

export const opsListEnergy = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsEnergyLeaders(), []),
);

export const opsListGrants = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsGrants(), []),
);

/* ---------------------------------------------------------------- billing */

export const opsListSubs = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsSubscriptions(), []),
);

export const opsGrantSub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      plan: z.enum(["mystic", "ascended"]),
      days: z.number().int().min(1).max(3650),
      note: z.string().max(300).optional(),
      withUnlimited: z.boolean().optional(),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => grantOpsSubscription(data)));

export const opsRevokeSub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      alsoEnergy: z.boolean().optional(),
      ...notifyFields,
    }),
  )
  .handler(async ({ data }) => action(() => revokeOpsSubscription(data)));

export const opsSetPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      plan: z.enum(["none", "mystic", "ascended"]),
      status: z.enum(["none", "active", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => action(() => setOpsUserPlan(data)));

/* ---------------------------------------------------------------- support */

export const opsListContacts = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().max(20).optional() }))
  .handler(async ({ data }) => guarded(() => listOpsContacts(data.status), []));

export const opsUpdateContact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["open", "pending", "resolved", "spam"]),
      reply: z.string().max(8000).optional(),
    }),
  )
  .handler(async ({ data }) => action(() => updateOpsContact(data)));

export const opsListMacros = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsMacros(), []),
);

export const opsAddMacro = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(8000),
      lang: z.string().max(10).default("all"),
    }),
  )
  .handler(async ({ data }) => action(() => addOpsMacro(data)));

export const opsDeleteMacro = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => action(() => deleteOpsMacro(data)));

/* --------------------------------------------------------------- security */

export const opsListEvents = createServerFn({ method: "GET" })
  .validator(z.object({ category: z.string().max(40).optional() }))
  .handler(async ({ data }) => guarded(() => listOpsEvents({ category: data.category }), []));

export const opsListIpAllow = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsIpAllowlist(), []),
);

export const opsListChallenges = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsChallenges(), []),
);

export const opsListSessions = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsSessions(), []),
);

export const opsRevokeSession = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => action(() => revokeOpsSession(data)));

export const opsRevokeIp = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => action(() => revokeOpsIp(data)));

export const opsForceAllowIp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      staffUserId: z.string().uuid(),
      ip: z.string().min(3).max(80),
      label: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }) => action(() => forceAllowOpsIp(data)));

export const opsResolveIpChallenge = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      action: z.enum(["allow", "deny"]),
    }),
  )
  .handler(async ({ data }) => action(() => resolveOpsIpChallengeById(data)));

/* ------------------------------------------------------------- anti-abuse */

export const opsListDevices = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsDeviceClusters(), []),
);

export const opsFlagDevice = createServerFn({ method: "POST" })
  .validator(z.object({ fingerprintHash: z.string().min(8).max(128), flagged: z.boolean() }))
  .handler(async ({ data }) => action(() => flagOpsDevice(data)));

export const opsPunishCluster = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fingerprintHash: z.string().min(8).max(128),
      action: z.enum(["burn", "ban"]),
    }),
  )
  .handler(async ({ data }) => action(() => punishOpsCluster(data)));

/* -------------------------------------------------------------- analytics */

export const opsAnalytics = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => fetchOpsAnalytics(), null),
);

/* ----------------------------------------------------------------- system */

export const opsDevHealth = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => fetchOpsDevHealth(), null),
);

export const opsAddChangelog = createServerFn({ method: "POST" })
  .validator(z.object({ title: z.string().min(1).max(200), body: z.string().max(8000) }))
  .handler(async ({ data }) => action(() => addOpsChangelog(data)));

export const opsListFlags = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsFlags(), []),
);

export const opsSetFlag = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().min(1).max(80), enabled: z.boolean() }))
  .handler(async ({ data }) => action(() => setOpsFlag(data)));

export const opsListAnnouncements = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsAnnouncements(), []),
);

export const opsCreateAnnouncement = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().max(4000),
      level: z.enum(["info", "warn", "critical"]),
      lang: z.string().max(10).default("all"),
      days: z.number().int().min(0).max(365),
    }),
  )
  .handler(async ({ data }) => action(() => createOpsAnnouncement(data)));

export const opsSetAnnouncementActive = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int(), active: z.boolean() }))
  .handler(async ({ data }) => action(() => setOpsAnnouncementActive(data)));

/* ------------------------------------------------------------------ staff */

export const opsListStaff = createServerFn({ method: "GET" }).handler(async () =>
  guarded(() => listOpsStaff(), []),
);

export const opsCreateStaff = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().trim().min(2).max(60),
      displayName: z.string().trim().max(80),
      password: z.string().min(10).max(200),
      role: roleEnum,
      note: z.string().max(500).optional(),
      permissions: z.array(permissionEnum).max(60).optional(),
      denied: z.array(permissionEnum).max(60).optional(),
    }),
  )
  .handler(async ({ data }) =>
    action(() =>
      createOpsStaff({
        username: data.username,
        displayName: data.displayName,
        password: data.password,
        role: data.role,
        note: data.note,
        permissions: data.permissions as never,
        denied: data.denied as never,
      }),
    ),
  );

export const opsUpdateStaff = createServerFn({ method: "POST" })
  .validator(
    z.object({
      staffId: z.string().uuid(),
      role: roleEnum.optional(),
      displayName: z.string().max(80).optional(),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => action(() => updateOpsStaff(data)));

export const opsSetStaffPermissions = createServerFn({ method: "POST" })
  .validator(
    z.object({
      staffId: z.string().uuid(),
      permissions: z.array(permissionEnum).max(60),
      denied: z.array(permissionEnum).max(60),
    }),
  )
  .handler(async ({ data }) =>
    action(() =>
      setOpsStaffPermissions({
        staffId: data.staffId,
        permissions: data.permissions as never,
        denied: data.denied as never,
      }),
    ),
  );

export const opsResetStaffPassword = createServerFn({ method: "POST" })
  .validator(z.object({ staffId: z.string().uuid(), password: z.string().min(10).max(200) }))
  .handler(async ({ data }) => action(() => resetOpsStaffPassword(data)));

export const opsSetStaffDisabled = createServerFn({ method: "POST" })
  .validator(z.object({ staffId: z.string().uuid(), disabled: z.boolean() }))
  .handler(async ({ data }) => action(() => setOpsStaffDisabled(data)));
