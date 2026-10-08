import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Badge,
  Btn,
  Chip,
  EmptyState,
  FadeIn,
  Field,
  Kpi,
  Meta,
  Panel,
  Spark,
} from "@/components/ops/ops-chrome";
import { OpsUserWorkspace } from "@/components/ops/OpsUserWorkspace";
import {
  opsAddChangelog,
  opsAddMacro,
  opsAnalytics,
  opsBanUser,
  opsCreateAnnouncement,
  opsCreateStaff,
  opsDeleteMacro,
  opsDevHealth,
  opsExportUsers,
  opsFlagDevice,
  opsForceAllowIp,
  opsGrantEnergy,
  opsGrantSub,
  opsResolveIpChallenge,
  opsSetDailyCap,
  opsListAnnouncements,
  opsListChallenges,
  opsListContacts,
  opsListDevices,
  opsListEnergy,
  opsListEvents,
  opsListFlags,
  opsListGrants,
  opsListIpAllow,
  opsListMacros,
  opsListSessions,
  opsListStaff,
  opsListSubs,
  opsModerationQueue,
  opsOverview,
  opsPunishCluster,
  opsResetStaffPassword,
  opsRestrictUser,
  opsRevokeIp,
  opsRevokeSession,
  opsRevokeSub,
  opsSearchUsers,
  opsSetAnnouncementActive,
  opsSetEnergy,
  opsSetFlag,
  opsSetStaffDisabled,
  opsSetStaffPermissions,
  opsSetUnlimited,
  opsUpdateContact,
  opsUpdateStaff,
  opsUserDossier,
  opsWatchlistUser,
} from "@/lib/ops-console";
import {
  ALL_PERMISSIONS,
  OPS_NAV,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  assignableRoles,
  can,
  navForStaff,
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
  type OpsNavId,
  type OpsOverviewStats,
  type OpsPermission,
  type OpsSessionRow,
  type OpsStaffRole,
  type OpsStaffRow,
  type OpsStaffUser,
  type OpsSubRow,
  type OpsUserDossier,
  type OpsUserRow,
  opsUserLabel,
} from "@/lib/ops-console-shared";

type Props = { staff: OpsStaffUser; onLogout: () => void };
type Filter =
  | "all"
  | "banned"
  | "restricted"
  | "watchlist"
  | "premium"
  | "comp"
  | "unlimited"
  | "unverified";

export function OpsUltraDashboard({ staff, onLogout }: Props) {
  const nav = useMemo(() => navForStaff(staff), [staff]);
  const [tab, setTab] = useState<OpsNavId>("overview");
  const [focusUserId, setFocusUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<OpsOverviewStats | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openUser = (userId: string) => {
    setFocusUserId(userId);
    setTab("users");
  };

  useEffect(() => {
    if (!nav.includes(tab)) setTab(nav[0] || "overview");
  }, [nav, tab]);

  useEffect(() => {
    void opsOverview().then((ov) => {
      if (ov && !("error" in ov)) setStats(ov);
    });
  }, [tab]);

  const toast = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 4000);
  };

  const run = async (
    fn: () => Promise<{ ok: boolean; message?: string; error?: string; detail?: string }>,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      const base = res.ok ? res.message || "Done." : res.error || "Failed.";
      toast(res.detail ? `${base} ${res.detail}` : base);
      return res;
    } finally {
      setBusy(false);
    }
  };

  const meta = (id: OpsNavId) => OPS_NAV.find((n) => n.id === id)!;

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#05070c] text-[#e8eaed]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(24,119,242,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_38%),radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.06),transparent_32%)]"
      />
      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#080b12]/95 backdrop-blur-xl lg:flex">
        <div className="border-b border-white/[0.06] px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#1877f2]">
            Mkitxavi
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Executive Ops</p>
          <p className="mt-0.5 text-[10px] text-[#667085]">Full-spectrum control</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {nav.map((id) => {
            const m = meta(id);
            const active = tab === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                whileHover={{ x: active ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full rounded-xl px-3 py-2.5 text-left transition ${
                  active ? "text-white" : "text-[#8b93a7] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="ops-nav-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#1877f2]/30 to-[#1877f2]/10 shadow-[inset_0_0_0_1px_rgba(24,119,242,0.5),0_10px_30px_-16px_rgba(24,119,242,0.85)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 block text-sm font-medium">{m.label}</span>
                <span className="relative z-10 mt-0.5 block text-[10px] text-[#667085]">
                  {m.blurb}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#080b12]/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="lg:hidden">
                <select
                  value={tab}
                  onChange={(e) => setTab(e.target.value as OpsNavId)}
                  className="rounded-lg border border-white/10 bg-[#0c111a] px-2 py-1.5 text-sm text-white"
                >
                  {nav.map((id) => (
                    <option key={id} value={id}>
                      {meta(id).label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hidden text-sm font-semibold text-white lg:block">{meta(tab).label}</p>
              <p className="truncate text-[11px] text-[#7d8799]">
                {meta(tab).blurb} · {staff.display_name} · {ROLE_LABELS[staff.role] || staff.role}
              </p>
            </div>
            <Btn tone="ghost" onClick={onLogout}>
              Sign out
            </Btn>
          </div>
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-[#1877f2]/35 bg-[#1877f2]/12 px-4 py-2 text-xs text-[#cfe0ff]"
              >
                {flash}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <FadeIn key={tab}>
              {tab === "overview" && <OverviewPanel stats={stats} />}
              {tab === "users" && (
                <UsersPanel
                  staff={staff}
                  busy={busy}
                  run={run}
                  toast={toast}
                  focusUserId={focusUserId}
                  onFocusConsumed={() => setFocusUserId(null)}
                />
              )}
              {tab === "moderation" && (
                <ModerationPanel staff={staff} busy={busy} run={run} onOpenUser={openUser} />
              )}
              {tab === "support" && (
                <SupportPanel staff={staff} busy={busy} run={run} onOpenUser={openUser} />
              )}
              {tab === "billing" && <BillingPanel staff={staff} busy={busy} run={run} />}
              {tab === "energy" && (
                <EnergyPanel staff={staff} busy={busy} run={run} onOpenUser={openUser} />
              )}
              {tab === "farm" && (
                <FarmPanel staff={staff} busy={busy} run={run} onOpenUser={openUser} />
              )}
              {tab === "security" && <SecurityPanel staff={staff} busy={busy} run={run} />}
              {tab === "audit" && <AuditPanel />}
              {tab === "analytics" && <AnalyticsPanel />}
              {tab === "system" && <SystemPanel staff={staff} busy={busy} run={run} />}
              {tab === "staff" && <StaffPanel staff={staff} busy={busy} run={run} />}
            </FadeIn>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

type RunFn = (
  fn: () => Promise<{ ok: boolean; message?: string; error?: string; detail?: string }>,
) => Promise<{ ok: boolean; message?: string; error?: string; detail?: string } | undefined>;

function OverviewPanel({ stats }: { stats: OpsOverviewStats | null }) {
  const maxPlan = Math.max(1, ...(stats?.planSplit.map((p) => p.count) || [1]));
  const signupTotal = (stats?.signupsByDay || []).reduce((a, d) => a + d.count, 0);
  const readingTotal14 = (stats?.readingsByDay || []).reduce((a, d) => a + d.count, 0);
  const risk =
    (stats?.bannedCount ?? 0) +
    (stats?.restrictedCount ?? 0) +
    (stats?.watchlistCount ?? 0) +
    (stats?.flaggedDevices ?? 0);
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0d1524] via-[#0a101c] to-[#05070c] p-5 md:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#1877f2]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1877f2]">
              Command center
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {stats?.usersTotal?.toLocaleString() ?? "—"}
              <span className="ml-2 text-lg font-medium text-[#7d8799]">users</span>
            </p>
            <p className="mt-2 text-sm text-[#8b93a7]">
              +{stats?.usersToday ?? 0} today · {stats?.usersWeek ?? 0} / 7d ·{" "}
              {stats?.conversionPct ?? 0}% paid conversion
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#667085]">Premium</p>
                <p className="text-2xl font-semibold tabular-nums text-emerald-300">
                  {stats?.premiumActive ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#667085]">Readings 24h</p>
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {stats?.readingsToday ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#667085]">Risk queue</p>
                <p className="text-2xl font-semibold tabular-nums text-amber-300">{risk}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label="Energy pool"
              value={stats?.energySum ?? "—"}
              hint={`avg ${stats?.avgEnergy ?? 0} · ∞ ${stats?.unlimitedCount ?? 0}`}
              accent="amber"
            />
            <Kpi
              label="Open tickets"
              value={stats?.contactOpen ?? "—"}
              hint={`${stats?.contactTotal ?? 0} total`}
              accent="blue"
            />
            <Kpi
              label="14d signups"
              value={signupTotal}
              hint={`${readingTotal14} readings`}
              accent="green"
            />
            <Kpi
              label="IP pending"
              value={stats?.pendingIpChallenges ?? "—"}
              hint={`${stats?.eventsToday ?? 0} events today`}
              accent={stats?.pendingIpChallenges ? "red" : "blue"}
            />
          </div>
        </div>
      </motion.div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-5 xl:grid-cols-10">
        {(
          [
            ["Mystic", stats?.mysticActive],
            ["Ascended", stats?.ascendedActive],
            ["Comp", stats?.compActive],
            ["Banned", stats?.bannedCount],
            ["Restricted", stats?.restrictedCount],
            ["Watch", stats?.watchlistCount],
            ["Farm", stats?.flaggedDevices],
            ["∞ energy", stats?.unlimitedCount],
            ["Banners", stats?.liveAnnouncements],
            ["Flags off", stats?.killSwitchesOff],
          ] as const
        ).map(([label, value], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i }}
            className="rounded-xl border border-white/[0.06] bg-[#0c111a] px-3 py-2.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-[#667085]">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value ?? "—"}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signups · 14d">
          <Spark data={stats?.signupsByDay || []} />
        </Panel>
        <Panel title="Readings · 14d">
          <Spark data={stats?.readingsByDay || []} color="#34d399" />
        </Panel>
      </div>

      <Panel title="Plan mix">
        <div className="space-y-2">
          {(stats?.planSplit || []).map((p) => (
            <div key={p.plan} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-[#8b93a7]">{p.plan}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(p.count / maxPlan) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full bg-[#1877f2]"
                />
              </div>
              <span className="w-10 text-right tabular-nums text-white">{p.count}</span>
            </div>
          ))}
          {!stats?.planSplit?.length && <p className="text-sm text-[#667085]">No active plans.</p>}
        </div>
      </Panel>
    </div>
  );
}

function UsersPanel({
  staff,
  busy,
  run,
  toast,
  focusUserId,
  onFocusConsumed,
}: {
  staff: OpsStaffUser;
  busy: boolean;
  run: RunFn;
  toast: (m: string) => void;
  focusUserId?: string | null;
  onFocusConsumed?: () => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<OpsUserRow[]>([]);
  const [selected, setSelected] = useState<OpsUserDossier | null>(null);

  const load = async (query = q, f = filter) => {
    setRows(await opsSearchUsers({ data: { q: query, filter: f } }));
  };

  useEffect(() => {
    void load("", "all");
  }, []);

  const open = async (id: string) => {
    const d = (await opsUserDossier({ data: { userId: id } })) as OpsUserDossier | null;
    setSelected(d);
  };

  useEffect(() => {
    if (!focusUserId) return;
    void open(focusUserId).finally(() => onFocusConsumed?.());
  }, [focusUserId]);

  const refresh = async () => {
    if (selected) await open(selected.id);
    await load();
  };

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email, or UUID…"
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#0a0e16] px-3 py-2 text-sm outline-none focus:border-[#1877f2]/60"
        />
        <Btn type="submit">Search</Btn>
        {can(staff, "users.export") && (
          <ActionBtn
            disabled={busy}
            onClick={() => {
              void opsExportUsers().then((res) => {
                if (!res.csv) {
                  toast("Export failed or empty.");
                  return;
                }
                const blob = new Blob([res.csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mkitxavi-users.csv";
                a.click();
                URL.revokeObjectURL(url);
                toast(`Exported ${res.rows} users.`);
              });
            }}
          >
            Export CSV
          </ActionBtn>
        )}
      </form>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            "all",
            "banned",
            "restricted",
            "watchlist",
            "premium",
            "comp",
            "unlimited",
            "unverified",
          ] as Filter[]
        ).map((f) => (
          <Chip
            key={f}
            active={filter === f}
            onClick={() => {
              setFilter(f);
              void load(q, f);
            }}
          >
            {f}
          </Chip>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel title={`Directory (${rows.length})`}>
          <div className="max-h-[72vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0c111a] text-[#6d7689]">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Energy</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const active = selected?.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => void open(r.id)}
                      className={`cursor-pointer border-t border-white/[0.04] transition ${
                        active ? "bg-[#1877f2]/15" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="px-2 py-2.5">
                        <div className="font-medium text-white">
                          {r.label || opsUserLabel(r.display_name, r.authEmail)}
                        </div>
                        <div className="font-mono text-[10px] text-[#667085]">
                          {r.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">
                        {r.unlimited ? "∞" : (r.energy ?? "—")}
                      </td>
                      <td className="px-2 py-2.5">
                        {r.plan || "none"}
                        {r.is_comp ? " ·comp" : ""}
                      </td>
                      <td className="px-2 py-2.5 space-x-1">
                        {r.banned && <Badge tone="red">ban</Badge>}
                        {r.chat_restricted && <Badge tone="amber">restrict</Badge>}
                        {r.watchlist && <Badge tone="amber">watch</Badge>}
                        {r.unlimited && <Badge tone="green">∞</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {!selected ? (
          <Panel title="Workspace">
            <EmptyState
              title="Select a person"
              hint="Open dossier, chat history with timestamps & photos, readings, bans, energy, and plan controls."
            />
          </Panel>
        ) : (
          <OpsUserWorkspace
            key={selected.id}
            staff={staff}
            selected={selected}
            busy={busy}
            run={run}
            onRefresh={async () => {
              await refresh();
            }}
            onDeleted={() => {
              setSelected(null);
              void load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ModerationPanel({
  staff,
  busy,
  run,
  onOpenUser,
}: {
  staff: OpsStaffUser;
  busy: boolean;
  run: RunFn;
  onOpenUser: (id: string) => void;
}) {
  const [rows, setRows] = useState<OpsUserRow[]>([]);
  const load = async () => setRows(await opsModerationQueue());
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <Panel title={`${rows.length} flagged`}>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#6d7689]">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Flags</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#1a2230]">
                  <td className="px-2 py-2 text-white">
                    <button
                      type="button"
                      className="text-left font-medium text-white hover:text-[#9ec1ff]"
                      onClick={() => onOpenUser(r.id)}
                    >
                      {r.label || opsUserLabel(r.display_name, r.authEmail)}
                    </button>
                  </td>
                  <td className="px-2 py-2">{r.ban_reason || "—"}</td>
                  <td className="px-2 py-2 space-x-1">
                    {r.banned && <Badge tone="red">ban</Badge>}
                    {r.chat_restricted && <Badge tone="amber">restrict</Badge>}
                    {r.watchlist && <Badge tone="amber">watch</Badge>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <ActionBtn disabled={busy} onClick={() => onOpenUser(r.id)}>
                        Dossier
                      </ActionBtn>
                      {r.banned && can(staff, "users.ban") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsBanUser({
                                data: {
                                  userId: r.id,
                                  ban: false,
                                  notify: true,
                                  notifyLang: r.lang?.startsWith("ka") ? "ka" : "en",
                                },
                              }),
                            ).then(load)
                          }
                        >
                          Unban
                        </ActionBtn>
                      )}
                      {r.chat_restricted && can(staff, "users.restrict") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsRestrictUser({
                                data: {
                                  userId: r.id,
                                  restrict: false,
                                  notify: true,
                                  notifyLang: r.lang?.startsWith("ka") ? "ka" : "en",
                                },
                              }),
                            ).then(load)
                          }
                        >
                          Unrestrict
                        </ActionBtn>
                      )}
                      {r.watchlist && can(staff, "users.watchlist") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsWatchlistUser({ data: { userId: r.id, watch: false } }),
                            ).then(load)
                          }
                        >
                          Unwatch
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState
              title="Queue clear"
              hint="No banned, restricted, or watchlisted accounts."
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function SupportPanel({
  staff,
  busy,
  run,
  onOpenUser,
}: {
  staff: OpsStaffUser;
  busy: boolean;
  run: RunFn;
  onOpenUser: (id: string) => void;
}) {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState<OpsContactRow[]>([]);
  const [macros, setMacros] = useState<OpsMacroRow[]>([]);
  const [active, setActive] = useState<OpsContactRow | null>(null);
  const [reply, setReply] = useState("");
  const [macroTitle, setMacroTitle] = useState("");
  const [macroBody, setMacroBody] = useState("");

  const load = async () => {
    const [c, m] = await Promise.all([opsListContacts({ data: { status } }), opsListMacros()]);
    setRows(c);
    setMacros(m);
  };

  useEffect(() => {
    void load();
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["open", "pending", "resolved", "spam", "all"].map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s}
          </Chip>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`${rows.length} messages`}>
          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setActive(r);
                  setReply(r.staff_reply || "");
                }}
                className="w-full rounded-md border border-[#1a2230] px-3 py-2 text-left hover:bg-[#141b28]"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    {r.name} · {r.kind}
                  </span>
                  <Badge tone={r.status === "open" ? "amber" : "neutral"}>{r.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[#7d8799]">{r.message}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={active ? `Thread · ${active.name}` : "Thread"}>
          {!active ? (
            <EmptyState
              title="Pick a message"
              hint="Open a contact thread to reply or jump to the linked account."
            />
          ) : (
            <div className="space-y-3 text-sm">
              <Meta
                rows={[
                  ["Email", active.email],
                  ["Kind", active.kind],
                  ["Status", active.status],
                  ["Created", active.created_at],
                  ["User", active.user_id ? active.user_id.slice(0, 8) + "…" : "guest"],
                ]}
              />
              {active.user_id && (
                <ActionBtn disabled={busy} onClick={() => onOpenUser(active.user_id!)}>
                  Open user dossier
                </ActionBtn>
              )}
              <p className="whitespace-pre-wrap rounded-md border border-[#1a2230] bg-[#0b0e14] p-3 text-xs">
                {active.message}
              </p>
              {macros.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {macros.map((m) => (
                    <Chip key={m.id} onClick={() => setReply(m.body)}>
                      {m.title}
                    </Chip>
                  ))}
                </div>
              )}
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-[#2a3448] bg-[#0b0e14] px-3 py-2 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["pending", "Pending"],
                    ["resolved", "Resolve + send"],
                    ["spam", "Spam"],
                    ["open", "Reopen"],
                  ] as const
                ).map(([st, label]) => (
                  <ActionBtn
                    key={st}
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        opsUpdateContact({
                          data: {
                            id: active.id,
                            status: st,
                            reply: reply || undefined,
                          },
                        }),
                      ).then(load)
                    }
                  >
                    {label}
                  </ActionBtn>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {can(staff, "support.macros") && (
        <Panel title="Macros">
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                opsAddMacro({ data: { title: macroTitle, body: macroBody, lang: "all" } }),
              ).then(() => {
                setMacroTitle("");
                setMacroBody("");
                return load();
              });
            }}
          >
            <input
              value={macroTitle}
              onChange={(e) => setMacroTitle(e.target.value)}
              placeholder="Title"
              required
              className="rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
            />
            <input
              value={macroBody}
              onChange={(e) => setMacroBody(e.target.value)}
              placeholder="Body"
              required
              className="min-w-[240px] flex-1 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
            />
            <ActionBtn disabled={busy}>Add</ActionBtn>
          </form>
          <ul className="space-y-2 text-xs">
            {macros.map((m) => (
              <li key={m.id} className="flex justify-between gap-2 border-b border-[#1a2230] py-2">
                <div>
                  <p className="font-medium text-white">{m.title}</p>
                  <p className="text-[#7d8799]">{m.body}</p>
                </div>
                <ActionBtn
                  tone="danger"
                  disabled={busy}
                  onClick={() => void run(() => opsDeleteMacro({ data: { id: m.id } })).then(load)}
                >
                  Delete
                </ActionBtn>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function BillingPanel({ staff, busy, run }: { staff: OpsStaffUser; busy: boolean; run: RunFn }) {
  const [rows, setRows] = useState<OpsSubRow[]>([]);
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState("30");
  const load = async () => setRows(await opsListSubs());
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      {can(staff, "billing.grant") && (
        <Panel title="Quick complimentary grant">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                opsGrantSub({
                  data: {
                    userId,
                    plan: "mystic",
                    days: Number(days) || 30,
                  },
                }),
              ).then(load);
            }}
          >
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User UUID"
              required
              className="min-w-[260px] flex-1 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs font-mono"
            />
            <input
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-16 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
            />
            <ActionBtn disabled={busy}>Free mystic</ActionBtn>
            <ActionBtn
              disabled={busy}
              onClick={() =>
                void run(() =>
                  opsGrantSub({
                    data: {
                      userId,
                      plan: "ascended",
                      days: Number(days) || 30,
                      withUnlimited: true,
                    },
                  }),
                ).then(load)
              }
            >
              Free ascended + ∞
            </ActionBtn>
          </form>
        </Panel>
      )}
      <Panel title={`${rows.length} subscriptions`}>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#6d7689]">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Provider</th>
                <th className="px-2 py-2">Ends</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-[#1a2230]">
                  <td className="px-2 py-2">
                    <div className="text-white">{r.display_name}</div>
                    <div className="font-mono text-[10px] text-[#667085]">
                      {r.user_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {r.plan} {r.is_comp && <Badge tone="green">comp</Badge>}
                  </td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className="px-2 py-2">{r.provider}</td>
                  <td className="px-2 py-2">{r.current_period_end || "—"}</td>
                  <td className="px-2 py-2">
                    {can(staff, "billing.revoke") && (
                      <ActionBtn
                        disabled={busy}
                        tone="danger"
                        onClick={() =>
                          void run(() =>
                            opsRevokeSub({ data: { userId: r.user_id, alsoEnergy: true } }),
                          ).then(load)
                        }
                      >
                        Kill
                      </ActionBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function EnergyPanel({
  staff,
  busy,
  run,
  onOpenUser,
}: {
  staff: OpsStaffUser;
  busy: boolean;
  run: RunFn;
  onOpenUser: (id: string) => void;
}) {
  const [rows, setRows] = useState<OpsEnergyRow[]>([]);
  const [grants, setGrants] = useState<OpsGrantRow[]>([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("10");
  const [setUserId, setSetUserId] = useState("");
  const [setBalance, setSetBalance] = useState("5");
  const [capUserId, setCapUserId] = useState("");
  const [capValue, setCapValue] = useState("5");
  const load = async () => {
    const [e, g] = await Promise.all([opsListEnergy(), opsListGrants()]);
    setRows(e);
    setGrants(g);
  };
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      {(can(staff, "energy.grant") || can(staff, "energy.set") || can(staff, "energy.cap")) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {can(staff, "energy.grant") && (
            <Panel title="Quick grant">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() =>
                    opsGrantEnergy({
                      data: {
                        userId: grantUserId.trim(),
                        delta: Number(grantAmount) || 0,
                      },
                    }),
                  ).then(load);
                }}
              >
                <Field
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  placeholder="User UUID"
                  required
                />
                <Field
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  type="number"
                  min={1}
                  max={500}
                />
                <Btn type="submit" disabled={busy}>
                  Grant
                </Btn>
              </form>
            </Panel>
          )}
          {can(staff, "energy.set") && (
            <Panel title="Set balance">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() =>
                    opsSetEnergy({
                      data: {
                        userId: setUserId.trim(),
                        balance: Number(setBalance) || 0,
                      },
                    }),
                  ).then(load);
                }}
              >
                <Field
                  value={setUserId}
                  onChange={(e) => setSetUserId(e.target.value)}
                  placeholder="User UUID"
                  required
                />
                <Field
                  value={setBalance}
                  onChange={(e) => setSetBalance(e.target.value)}
                  type="number"
                  min={0}
                />
                <Btn type="submit" disabled={busy}>
                  Set
                </Btn>
              </form>
            </Panel>
          )}
          {can(staff, "energy.cap") && (
            <Panel title="Daily cap">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() =>
                    opsSetDailyCap({
                      data: {
                        userId: capUserId.trim(),
                        cap: Number(capValue) || 0,
                      },
                    }),
                  ).then(load);
                }}
              >
                <Field
                  value={capUserId}
                  onChange={(e) => setCapUserId(e.target.value)}
                  placeholder="User UUID"
                  required
                />
                <Field
                  value={capValue}
                  onChange={(e) => setCapValue(e.target.value)}
                  type="number"
                  min={0}
                />
                <Btn type="submit" disabled={busy}>
                  Apply cap
                </Btn>
              </form>
            </Panel>
          )}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Leaders">
          <div className="max-h-[60vh] overflow-auto text-xs">
            {rows.length === 0 && (
              <EmptyState title="No energy rows" hint="Leaders appear once wallets exist." />
            )}
            {rows.map((r) => (
              <div
                key={r.user_id}
                className="flex items-center justify-between gap-2 border-b border-[#1a2230] py-2"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => onOpenUser(r.user_id)}
                >
                  <div className="text-white hover:text-[#9ec1ff]">
                    {r.display_name} {r.unlimited && <Badge tone="green">∞</Badge>}{" "}
                    {r.banned && <Badge tone="red">ban</Badge>}
                  </div>
                  <div className="text-[#667085]">
                    bal {r.balance} · cap {r.daily_cap}
                  </div>
                </button>
                <div className="flex gap-1">
                  {can(staff, "energy.set") && (
                    <ActionBtn
                      disabled={busy}
                      tone="danger"
                      onClick={() =>
                        void run(() =>
                          opsSetEnergy({ data: { userId: r.user_id, balance: 0 } }),
                        ).then(load)
                      }
                    >
                      Burn
                    </ActionBtn>
                  )}
                  {can(staff, "energy.unlimited") && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          opsSetUnlimited({
                            data: { userId: r.user_id, unlimited: !r.unlimited },
                          }),
                        ).then(load)
                      }
                    >
                      {r.unlimited ? "∞ off" : "∞ on"}
                    </ActionBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Grant ledger">
          <div className="max-h-[60vh] overflow-auto text-xs">
            {grants.length === 0 && (
              <EmptyState
                title="No grants yet"
                hint="Manual energy and plan grants show up here."
              />
            )}
            {grants.map((g) => (
              <button
                key={g.id}
                type="button"
                className="w-full border-b border-[#1a2230] py-2 text-left hover:bg-white/[0.03]"
                onClick={() => onOpenUser(g.user_id)}
              >
                <div className="text-white">
                  {g.kind} {g.amount ?? g.plan ?? ""}
                </div>
                <div className="text-[#667085]">
                  {g.actor_username} · {g.user_id.slice(0, 8)}… · {g.created_at}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FarmPanel({
  staff,
  busy,
  run,
  onOpenUser,
}: {
  staff: OpsStaffUser;
  busy: boolean;
  run: RunFn;
  onOpenUser: (id: string) => void;
}) {
  const [clusters, setClusters] = useState<OpsDeviceCluster[]>([]);
  const load = async () => setClusters(await opsListDevices());
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <Panel title={`${clusters.length} clusters`}>
        <div className="space-y-3">
          {clusters.length === 0 && (
            <EmptyState
              title="No multi-account fingerprints yet"
              hint="Clusters appear once clients report devices."
            />
          )}
          {clusters.map((c) => (
            <div key={c.fingerprint_hash} className="rounded-lg border border-[#1a2230] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] text-[#9aa3b5]">
                    {c.fingerprint_hash.slice(0, 20)}… · {c.account_count} accounts
                    {c.ip ? ` · ${c.ip}` : ""}
                  </p>
                  {c.flagged && <Badge tone="red">flagged</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {can(staff, "farm.flag") && (
                    <>
                      <ActionBtn
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsFlagDevice({
                              data: {
                                fingerprintHash: c.fingerprint_hash,
                                flagged: !c.flagged,
                              },
                            }),
                          ).then(load)
                        }
                      >
                        {c.flagged ? "Clear" : "Flag"}
                      </ActionBtn>
                      <ActionBtn
                        disabled={busy}
                        tone="danger"
                        onClick={() =>
                          void run(() =>
                            opsPunishCluster({
                              data: {
                                fingerprintHash: c.fingerprint_hash,
                                action: "burn",
                              },
                            }),
                          ).then(load)
                        }
                      >
                        Burn all
                      </ActionBtn>
                      {can(staff, "users.ban") && (
                        <ActionBtn
                          disabled={busy}
                          tone="danger"
                          onClick={() =>
                            void run(() =>
                              opsPunishCluster({
                                data: {
                                  fingerprintHash: c.fingerprint_hash,
                                  action: "ban",
                                },
                              }),
                            ).then(load)
                          }
                        >
                          Ban all
                        </ActionBtn>
                      )}
                    </>
                  )}
                </div>
              </div>
              <ul className="mt-2 text-xs text-[#a7b0c0]">
                {c.users.map((u) => (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      className="hover:text-[#9ec1ff]"
                      onClick={() => onOpenUser(u.user_id)}
                    >
                      {u.display_name} {u.banned ? "(banned)" : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SecurityPanel({ staff, busy, run }: { staff: OpsStaffUser; busy: boolean; run: RunFn }) {
  const [ips, setIps] = useState<OpsIpAllowRow[]>([]);
  const [challenges, setChallenges] = useState<OpsChallengeRow[]>([]);
  const [sessions, setSessions] = useState<OpsSessionRow[]>([]);
  const [manualStaffId, setManualStaffId] = useState("");
  const [manualIp, setManualIp] = useState("");

  const load = async () => {
    const [i, c, s] = await Promise.all([opsListIpAllow(), opsListChallenges(), opsListSessions()]);
    setIps(i);
    setChallenges(c);
    setSessions(s);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="IP challenges">
          <div className="max-h-56 overflow-auto text-xs">
            {challenges.length === 0 && (
              <EmptyState
                title="No challenges"
                hint="New staff logins from unknown IPs land here."
              />
            )}
            {challenges.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-[#1a2230] py-2"
              >
                <div>
                  <div className="text-white">
                    {c.username} · {c.ip}
                  </div>
                  <div className="text-[#667085]">
                    {c.status} · {c.expires_at}
                  </div>
                </div>
                {can(staff, "security.ip") && c.status === "pending" && (
                  <div className="flex gap-1">
                    <ActionBtn
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          opsResolveIpChallenge({ data: { id: c.id, action: "allow" } }),
                        ).then(load)
                      }
                    >
                      Allow
                    </ActionBtn>
                    <ActionBtn
                      tone="danger"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          opsResolveIpChallenge({ data: { id: c.id, action: "deny" } }),
                        ).then(load)
                      }
                    >
                      Deny
                    </ActionBtn>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Allowlist">
          <div className="max-h-56 overflow-auto text-xs">
            {ips.map((ip) => (
              <div
                key={ip.id}
                className="flex items-center justify-between gap-2 border-b border-[#1a2230] py-2"
              >
                <div>
                  <div className="text-white">
                    {ip.username} · {ip.ip}
                  </div>
                  <div className="text-[#667085]">{ip.label || "—"}</div>
                </div>
                {can(staff, "security.ip") && (
                  <ActionBtn
                    tone="danger"
                    disabled={busy}
                    onClick={() => void run(() => opsRevokeIp({ data: { id: ip.id } })).then(load)}
                  >
                    Revoke
                  </ActionBtn>
                )}
              </div>
            ))}
          </div>
          {can(staff, "security.ip") && (
            <form
              className="mt-3 flex flex-wrap gap-2 border-t border-[#1a2230] pt-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void run(() =>
                  opsForceAllowIp({
                    data: { staffUserId: manualStaffId, ip: manualIp },
                  }),
                ).then(() => {
                  setManualIp("");
                  return load();
                });
              }}
            >
              <input
                value={manualStaffId}
                onChange={(e) => setManualStaffId(e.target.value)}
                placeholder="Staff UUID"
                className="min-w-[160px] flex-1 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
              />
              <input
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="IP"
                className="w-36 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
              />
              <ActionBtn disabled={busy}>Allow</ActionBtn>
            </form>
          )}
        </Panel>
      </div>
      <Panel title="Staff sessions">
        <div className="max-h-64 overflow-auto text-xs">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 border-b border-[#1a2230] py-2"
            >
              <div>
                <div className="text-white">
                  {s.username} · {s.ip}
                </div>
                <div className="text-[#667085]">
                  {s.revoked_at ? "revoked" : "active"} · {s.created_at}
                </div>
              </div>
              {can(staff, "security.ip") && !s.revoked_at && (
                <ActionBtn
                  tone="danger"
                  disabled={busy}
                  onClick={() =>
                    void run(() => opsRevokeSession({ data: { id: s.id } })).then(load)
                  }
                >
                  Kill
                </ActionBtn>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AuditPanel() {
  const [category, setCategory] = useState("all");
  const [events, setEvents] = useState<OpsEventRow[]>([]);
  useEffect(() => {
    void opsListEvents({ data: { category } }).then(setEvents);
  }, [category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "security", "moderation", "energy", "billing", "support", "staff", "system"].map(
          (c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ),
        )}
      </div>
      <Panel title={`${events.length} events`}>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#121826] text-[#6d7689]">
              <tr>
                <th className="px-2 py-2">When</th>
                <th className="px-2 py-2">Cat</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Actor</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-[#1a2230]">
                  <td className="px-2 py-1.5 text-[#7d8799]">{e.created_at}</td>
                  <td className="px-2 py-1.5">{e.category}</td>
                  <td className="px-2 py-1.5 text-white">{e.action}</td>
                  <td className="px-2 py-1.5">{e.actor_username || "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{e.target_user_id?.slice(0, 8) || "—"}</td>
                  <td className="px-2 py-1.5 font-mono">{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function AnalyticsPanel() {
  const [data, setData] = useState<OpsAnalytics | null>(null);
  useEffect(() => {
    void opsAnalytics().then(setData);
  }, []);
  const maxSignup = Math.max(1, ...(data?.signupsByDay.map((d) => d.count) || [1]));
  const maxRead = Math.max(1, ...(data?.readingsByDay.map((d) => d.count) || [1]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signups (14d)">
          <Bars data={data?.signupsByDay || []} max={maxSignup} />
        </Panel>
        <Panel title="Readings (14d)">
          <Bars data={data?.readingsByDay || []} max={maxRead} />
        </Panel>
        <Panel title="By kind">
          <KV list={(data?.readingsByKind || []).map((r) => [r.kind, r.count])} />
        </Panel>
        <Panel title="Lang split">
          <KV list={(data?.langSplit || []).map((r) => [r.lang, r.count])} />
        </Panel>
        <Panel title="Plans">
          <KV list={(data?.planSplit || []).map((r) => [r.plan, r.count])} />
        </Panel>
        <Panel title="Streak top">
          <KV list={(data?.streakTop || []).map((r) => [r.display_name, r.streak])} />
        </Panel>
      </div>
    </div>
  );
}

function SystemPanel({ staff, busy, run }: { staff: OpsStaffUser; busy: boolean; run: RunFn }) {
  const [health, setHealth] = useState<OpsDevHealth | null>(null);
  const [flags, setFlags] = useState<OpsFlagRow[]>([]);
  const [anns, setAnns] = useState<OpsAnnouncementRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annLevel, setAnnLevel] = useState<"info" | "warn" | "critical">("info");
  const [annLang, setAnnLang] = useState("all");
  const [annDays, setAnnDays] = useState("7");
  const [annBody, setAnnBody] = useState("");

  const load = async () => {
    const [h, f, a] = await Promise.all([opsDevHealth(), opsListFlags(), opsListAnnouncements()]);
    setHealth(h);
    setFlags(f);
    setAnns(a);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Integrations">
          <ul className="space-y-2 text-sm">
            {(health?.env || []).map((e) => {
              const critical = ["Database", "Console gate", "AI engine", "Whop billing"].includes(
                e.key,
              );
              return (
                <li
                  key={e.key}
                  className="flex justify-between gap-2 border-b border-white/[0.06] py-1.5"
                >
                  <div>
                    <p className="text-white">{e.key}</p>
                    <p className="text-[11px] text-[#667085]">{e.note}</p>
                  </div>
                  <Badge tone={e.ok ? "green" : critical ? "red" : "amber"}>
                    {e.ok ? "ok" : critical ? "down" : "optional"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Feature flags">
          <ul className="space-y-2 text-sm">
            {flags.map((f) => {
              const effect =
                f.key === "maintenance_mode"
                  ? "Blocks chat + readings sitewide"
                  : f.key === "chat_enabled"
                    ? "AI chat / tarot replies"
                    : f.key === "coffee_reading_enabled"
                      ? "Photo coffee readings"
                      : f.key === "ads_enabled"
                        ? "AdSense + watch-ad energy"
                        : f.key === "signups_enabled"
                          ? "New account registration"
                          : f.description;
              return (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-2 border-b border-white/[0.06] py-2"
                >
                  <div>
                    <p className="text-white">{f.key}</p>
                    <p className="text-[11px] text-[#667085]">{effect}</p>
                  </div>
                  {can(staff, "system.flags") ? (
                    <Btn
                      disabled={busy}
                      tone={f.enabled ? "primary" : "danger"}
                      onClick={() =>
                        void run(() =>
                          opsSetFlag({ data: { key: f.key, enabled: !f.enabled } }),
                        ).then(load)
                      }
                    >
                      {f.enabled ? "On" : "Off"}
                    </Btn>
                  ) : (
                    <Badge tone={f.enabled ? "green" : "red"}>{f.enabled ? "on" : "off"}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel title="DB pulse">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(health?.dbTables || []).map((t) => (
            <Kpi key={t.table} label={t.table} value={t.rows} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Announcements">
          {can(staff, "system.announcements") && (
            <form
              className="mb-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() =>
                  opsCreateAnnouncement({
                    data: {
                      title: annTitle,
                      body: annBody,
                      level: annLevel,
                      lang: annLang,
                      days: Number(annDays) || 7,
                    },
                  }),
                ).then(() => {
                  setAnnTitle("");
                  setAnnBody("");
                  setAnnLevel("info");
                  setAnnLang("all");
                  setAnnDays("7");
                  return load();
                });
              }}
            >
              <input
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-sm"
              />
              <textarea
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={annLevel}
                  onChange={(e) => setAnnLevel(e.target.value as "info" | "warn" | "critical")}
                  className="rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs text-white"
                >
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="critical">critical</option>
                </select>
                <select
                  value={annLang}
                  onChange={(e) => setAnnLang(e.target.value)}
                  className="rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs text-white"
                >
                  <option value="all">all langs</option>
                  <option value="en">en</option>
                  <option value="ka">ka</option>
                </select>
                <input
                  value={annDays}
                  onChange={(e) => setAnnDays(e.target.value)}
                  type="number"
                  min={0}
                  max={365}
                  className="w-20 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs text-white"
                  title="Days active"
                />
              </div>
              <ActionBtn disabled={busy}>Publish</ActionBtn>
            </form>
          )}
          <ul className="space-y-2 text-xs">
            {anns.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-[#1a2230] py-2">
                <div>
                  <p className="font-medium text-white">
                    {a.title} <Badge tone={a.active ? "green" : "neutral"}>{a.level}</Badge>
                  </p>
                  <p className="text-[#7d8799]">{a.body}</p>
                </div>
                {can(staff, "system.announcements") && (
                  <ActionBtn
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        opsSetAnnouncementActive({
                          data: { id: a.id, active: !a.active },
                        }),
                      ).then(load)
                    }
                  >
                    {a.active ? "Hide" : "Show"}
                  </ActionBtn>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Changelog">
          {can(staff, "system.changelog") && (
            <form
              className="mb-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => opsAddChangelog({ data: { title, body } })).then(() => {
                  setTitle("");
                  setBody("");
                  return load();
                });
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-sm"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-sm"
              />
              <ActionBtn disabled={busy}>Publish</ActionBtn>
            </form>
          )}
          <div className="space-y-3">
            {(health?.changelog || []).map((c) => (
              <div key={c.id} className="border-b border-[#1a2230] pb-3">
                <p className="text-sm font-medium text-white">{c.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-[#a7b0c0]">{c.body}</p>
                <p className="mt-1 text-[10px] text-[#667085]">
                  {c.author_username} · {c.created_at}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent webhooks">
        <div className="overflow-auto text-xs">
          <table className="w-full text-left">
            <thead className="text-[#6d7689]">
              <tr>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {(health?.webhooks || []).map((w, i) => (
                <tr key={`${w.source}-${w.id}-${i}`} className="border-t border-[#1a2230]">
                  <td className="px-2 py-1.5">{w.source}</td>
                  <td className="px-2 py-1.5 text-white">{w.type}</td>
                  <td className="px-2 py-1.5">{w.processed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StaffPanel({ staff, busy, run }: { staff: OpsStaffUser; busy: boolean; run: RunFn }) {
  const [rows, setRows] = useState<OpsStaffRow[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<OpsStaffRole>("moderator");
  const [editId, setEditId] = useState<string | null>(null);
  const [extra, setExtra] = useState<OpsPermission[]>([]);
  const [denied, setDenied] = useState<OpsPermission[]>([]);
  const [resetPw, setResetPw] = useState("");

  const [createExtra, setCreateExtra] = useState<OpsPermission[]>([]);
  const [createDenied, setCreateDenied] = useState<OpsPermission[]>([]);

  const load = async () => setRows(await opsListStaff());
  useEffect(() => {
    void load();
  }, []);

  const editing = rows.find((r) => r.id === editId) || null;

  const PermMatrix = ({
    extras,
    denies,
    setExtras,
    setDenies,
  }: {
    extras: OpsPermission[];
    denies: OpsPermission[];
    setExtras: (v: OpsPermission[]) => void;
    setDenies: (v: OpsPermission[]) => void;
  }) => (
    <div className="mt-3 max-h-72 space-y-3 overflow-auto rounded-xl border border-white/[0.06] p-3">
      {PERMISSION_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
            {g.label}
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {g.keys.map((p) => {
              const granted = extras.includes(p);
              const blocked = denies.includes(p);
              return (
                <div
                  key={p}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] px-2 py-1 text-[11px]"
                >
                  <span className="truncate font-mono text-[#c5cad3]">{p}</span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={`rounded px-1.5 py-0.5 ${granted ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-[#667085]"}`}
                      onClick={() => {
                        setExtras(
                          granted
                            ? extras.filter((x) => x !== p)
                            : [...extras.filter((x) => x !== p), p],
                        );
                        setDenies(denies.filter((x) => x !== p));
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={`rounded px-1.5 py-0.5 ${blocked ? "bg-red-500/20 text-red-300" : "bg-white/5 text-[#667085]"}`}
                      onClick={() => {
                        setDenies(
                          blocked
                            ? denies.filter((x) => x !== p)
                            : [...denies.filter((x) => x !== p), p],
                        );
                        setExtras(extras.filter((x) => x !== p));
                      }}
                    >
                      −
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[#667085]">
        + grant beyond role · − deny from role · {ALL_PERMISSIONS.length} total
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {can(staff, "staff.create") && (
        <Panel title="Provision">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                opsCreateStaff({
                  data: {
                    username,
                    displayName,
                    password,
                    role,
                    permissions: createExtra,
                    denied: createDenied,
                  },
                }),
              ).then(() => {
                setUsername("");
                setDisplayName("");
                setPassword("");
                setCreateExtra([]);
                setCreateDenied([]);
                return load();
              });
            }}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <Field
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <Field
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
              <Field
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (10+)"
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OpsStaffRole)}
                className="rounded-lg border border-white/10 bg-[#0a0e16] px-2.5 py-2 text-sm text-white"
              >
                {assignableRoles(staff.role).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <PermMatrix
              extras={createExtra}
              denies={createDenied}
              setExtras={setCreateExtra}
              setDenies={setCreateDenied}
            />
            <Btn disabled={busy} type="submit">
              Create with permissions
            </Btn>
          </form>
        </Panel>
      )}

      <Panel title="Directory">
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#6d7689]">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Last login</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#1a2230]">
                  <td className="px-2 py-2">
                    <div className="text-white">{r.display_name}</div>
                    <div className="font-mono text-[10px] text-[#667085]">{r.id}</div>
                  </td>
                  <td className="px-2 py-2">{ROLE_LABELS[r.role] || r.role}</td>
                  <td className="px-2 py-2">
                    {r.last_login_at || "—"}
                    <div className="font-mono text-[10px] text-[#667085]">
                      {r.last_login_ip || ""}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {r.disabled ? (
                      <Badge tone="red">disabled</Badge>
                    ) : (
                      <Badge tone="green">active</Badge>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {can(staff, "staff.permissions") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() => {
                            setEditId(r.id);
                            setExtra(r.permissions);
                            setDenied(r.denied_permissions);
                          }}
                        >
                          Perms
                        </ActionBtn>
                      )}
                      {can(staff, "staff.edit") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() => {
                            const next = window.prompt("New role", r.role) as OpsStaffRole | null;
                            if (!next) return;
                            void run(() =>
                              opsUpdateStaff({ data: { staffId: r.id, role: next } }),
                            ).then(load);
                          }}
                        >
                          Role
                        </ActionBtn>
                      )}
                      {can(staff, "staff.reset_password") && (
                        <ActionBtn
                          disabled={busy}
                          onClick={() => {
                            const pw = window.prompt("New password (10+)");
                            if (!pw) return;
                            void run(() =>
                              opsResetStaffPassword({
                                data: { staffId: r.id, password: pw },
                              }),
                            ).then(load);
                          }}
                        >
                          Reset PW
                        </ActionBtn>
                      )}
                      {can(staff, "staff.disable") && r.id !== staff.id && (
                        <ActionBtn
                          disabled={busy}
                          tone={r.disabled ? "neutral" : "danger"}
                          onClick={() =>
                            void run(() =>
                              opsSetStaffDisabled({
                                data: { staffId: r.id, disabled: !r.disabled },
                              }),
                            ).then(load)
                          }
                        >
                          {r.disabled ? "Enable" : "Disable"}
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && can(staff, "staff.permissions") && (
        <Panel title={`Permissions · ${editing.username}`}>
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6d7689]">
                {g.label}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.keys.map((p) => {
                  const granted = extra.includes(p);
                  const blocked = denied.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex items-center justify-between gap-2 rounded border border-[#1a2230] px-2 py-1.5 text-xs"
                    >
                      <span className="font-mono text-[#c5cad3]">{p}</span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 ${granted ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-[#667085]"}`}
                          onClick={() => {
                            setExtra((prev) =>
                              prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                            );
                            setDenied((prev) => prev.filter((x) => x !== p));
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 ${blocked ? "bg-red-500/20 text-red-300" : "bg-white/5 text-[#667085]"}`}
                          onClick={() => {
                            setDenied((prev) =>
                              prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                            );
                            setExtra((prev) => prev.filter((x) => x !== p));
                          }}
                        >
                          −
                        </button>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <ActionBtn
              disabled={busy}
              onClick={() =>
                void run(() =>
                  opsSetStaffPermissions({
                    data: {
                      staffId: editing.id,
                      permissions: extra,
                      denied,
                    },
                  }),
                ).then(load)
              }
            >
              Save permissions
            </ActionBtn>
            <ActionBtn onClick={() => setEditId(null)}>Close</ActionBtn>
          </div>
          {can(staff, "staff.reset_password") && (
            <form
              className="mt-4 flex gap-2 border-t border-[#1a2230] pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() =>
                  opsResetStaffPassword({
                    data: { staffId: editing.id, password: resetPw },
                  }),
                ).then(() => setResetPw(""));
              }}
            >
              <input
                type="password"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="Set new password"
                className="flex-1 rounded-md border border-[#2a3448] bg-[#0b0e14] px-2 py-1.5 text-xs"
              />
              <ActionBtn disabled={busy}>Reset password</ActionBtn>
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ chrome */

function Hero({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
      {sub ? <p className="mt-1 text-sm text-[#7d8799]">{sub}</p> : null}
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0e16]/80 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d7689]">
        {title}
      </p>
      {children}
    </div>
  );
}

function Bars({ data, max }: { data: Array<{ day: string; count: number }>; max: number }) {
  return (
    <div className="flex h-36 items-end gap-1">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-[#1877f2]/85"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1 }}
            title={`${d.day}: ${d.count}`}
          />
          <span className="text-[9px] text-[#667085]">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function KV({ list }: { list: Array<[string, string | number]> }) {
  return (
    <ul className="space-y-1 text-sm">
      {list.map(([k, v]) => (
        <li key={k} className="flex justify-between border-b border-[#1a2230] py-1.5">
          <span>{k}</span>
          <span className="tabular-nums text-white">{v}</span>
        </li>
      ))}
      {list.length === 0 && <li className="text-[#7d8799]">No data.</li>}
    </ul>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
        tone === "danger"
          ? "bg-red-600/90 text-white hover:bg-red-500"
          : "bg-[#1877f2] text-white hover:bg-[#166fe5]"
      }`}
    >
      {children}
    </button>
  );
}
