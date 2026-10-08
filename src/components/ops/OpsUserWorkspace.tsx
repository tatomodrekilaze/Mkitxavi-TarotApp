import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  opsBanUser,
  opsClearConversation,
  opsDeleteUser,
  opsForceLogout,
  opsGrantEnergy,
  opsGrantSub,
  opsResetUserPassword,
  opsResetUserStreak,
  opsRestrictUser,
  opsRevokeSub,
  opsSetDailyCap,
  opsSetEnergy,
  opsSetNotes,
  opsSetPlan,
  opsSetUnlimited,
  opsUserConversation,
  opsUserReadings,
  opsVerifyEmail,
  opsWatchlistUser,
} from "@/lib/ops-console";
import {
  can,
  formatOpsTime,
  opsUserLabel,
  type OpsReadingFull,
  type OpsStaffUser,
  type OpsUserConversation,
  type OpsUserDossier,
} from "@/lib/ops-console-shared";
import { Badge, Btn, Chip, Field, Meta, Panel } from "@/components/ops/ops-chrome";

type RunFn = (
  fn: () => Promise<{ ok: boolean; message?: string; error?: string; detail?: string }>,
) => Promise<{ ok: boolean; message?: string; error?: string; detail?: string } | undefined>;

type Tab = "overview" | "chat" | "readings" | "actions";
type NotifyLang = "en" | "ka";

function defaultNotifyLang(lang: string | null | undefined): NotifyLang {
  return String(lang || "")
    .toLowerCase()
    .startsWith("ka")
    ? "ka"
    : "en";
}

function NotifyBar({
  notify,
  notifyLang,
  onNotify,
  onLang,
  hasEmail,
}: {
  notify: boolean;
  notifyLang: NotifyLang;
  onNotify: (v: boolean) => void;
  onLang: (v: NotifyLang) => void;
  hasEmail: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#1877f2]/25 bg-[#1877f2]/10 px-3 py-2.5">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-[#dce8ff]">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => onNotify(e.target.checked)}
          className="accent-[#1877f2]"
        />
        Notify user by email
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[#7d8799]">Language</span>
        <Chip active={notifyLang === "en"} onClick={() => onLang("en")}>
          English
        </Chip>
        <Chip active={notifyLang === "ka"} onClick={() => onLang("ka")}>
          ქართული
        </Chip>
      </div>
      {!hasEmail && (
        <p className="mt-1.5 text-[10px] text-amber-200/90">
          This account has no email — notify will fail until one is linked.
        </p>
      )}
      <p className="mt-1 text-[10px] text-[#8b93a7]">
        Applies to ban, restrict, energy, plans, logout, delete, streak, verify, and clear chat.
        Watchlist and mod notes stay silent.
      </p>
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
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
        tone === "danger"
          ? "bg-red-600/90 text-white hover:bg-red-500"
          : "bg-[#1877f2] text-white hover:bg-[#166fe5]"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function OpsUserWorkspace({
  staff,
  selected,
  busy,
  run,
  onRefresh,
  onDeleted,
}: {
  staff: OpsStaffUser;
  selected: OpsUserDossier;
  busy: boolean;
  run: RunFn;
  onRefresh: () => Promise<void>;
  onDeleted?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [chat, setChat] = useState<OpsUserConversation | null>(null);
  const [readings, setReadings] = useState<OpsReadingFull[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [energyDelta, setEnergyDelta] = useState("50");
  const [energyAbs, setEnergyAbs] = useState(String(selected.energy ?? 0));
  const [cap, setCap] = useState(String(selected.daily_cap ?? 5));
  const [days, setDays] = useState("30");
  const [notes, setNotes] = useState(selected.mod_notes || "");
  const [banReason, setBanReason] = useState(selected.ban_reason || "");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [notify, setNotify] = useState(true);
  const [notifyLang, setNotifyLang] = useState<NotifyLang>(defaultNotifyLang(selected.lang));

  useEffect(() => {
    setEnergyAbs(String(selected.energy ?? 0));
    setCap(String(selected.daily_cap ?? 5));
    setNotes(selected.mod_notes || "");
    setBanReason(selected.ban_reason || "");
    setDeleteConfirm("");
    setChat(null);
    setReadings([]);
    setTab("overview");
    setNotify(true);
    setNotifyLang(defaultNotifyLang(selected.lang));
  }, [selected.id]);

  const mail = () => ({ notify, notifyLang });

  const loadChat = async () => {
    if (!can(staff, "users.conversations")) return;
    setChatLoading(true);
    try {
      const data = await opsUserConversation({ data: { userId: selected.id } });
      setChat(data);
    } finally {
      setChatLoading(false);
    }
  };

  const loadReadings = async () => {
    if (!can(staff, "users.conversations")) return;
    setChatLoading(true);
    try {
      setReadings(
        (await opsUserReadings({ data: { userId: selected.id, limit: 40 } })) as OpsReadingFull[],
      );
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "chat" && !chat) void loadChat();
    if (tab === "readings" && !readings.length) void loadReadings();
  }, [tab]);

  const tabs: Array<{ id: Tab; label: string; show?: boolean }> = [
    { id: "overview", label: "Overview" },
    { id: "chat", label: "Chat", show: can(staff, "users.conversations") },
    { id: "readings", label: "Readings", show: can(staff, "users.conversations") },
    { id: "actions", label: "Actions" },
  ];

  return (
    <Panel
      title={`Dossier · ${selected.label || opsUserLabel(selected.display_name, selected.authEmail)}`}
      action={
        <div className="flex flex-wrap gap-1">
          {selected.banned && <Badge tone="red">banned</Badge>}
          {selected.chat_restricted && <Badge tone="amber">restricted</Badge>}
          {selected.watchlist && <Badge tone="amber">watch</Badge>}
          {selected.unlimited && <Badge tone="green">∞</Badge>}
          {selected.is_comp && <Badge tone="blue">comp</Badge>}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </Chip>
          ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 text-sm"
        >
          {tab === "overview" && (
            <>
              <Meta
                rows={[
                  ["Email", selected.authEmail || "—"],
                  ["Lang", selected.lang || "—"],
                  ["Plan", `${selected.plan || "none"} / ${selected.sub_status || "none"}`],
                  ["Provider", selected.provider],
                  ["Energy", selected.unlimited ? "unlimited" : String(selected.energy ?? 0)],
                  ["Cap", String(selected.daily_cap ?? "—")],
                  ["Streak", `${selected.streak} (best ${selected.best_streak})`],
                  ["Readings", String(selected.readingsCount)],
                  ["Created", selected.created_at],
                  ["Last sign-in", selected.lastSignInAt || "—"],
                  ["Period end", selected.period_end || "—"],
                  ["Granted by", selected.granted_by || "—"],
                  ["User ID", selected.id],
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <Btn
                  tone="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(selected.id);
                  }}
                >
                  Copy user ID
                </Btn>
                {selected.authEmail && (
                  <Btn
                    tone="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(selected.authEmail || "");
                    }}
                  >
                    Copy email
                  </Btn>
                )}
                {can(staff, "users.conversations") && (
                  <Btn tone="ghost" onClick={() => setTab("chat")}>
                    Open chat history
                  </Btn>
                )}
              </div>
              {selected.recentReadings?.length > 0 && (
                <Box title="Recent readings">
                  <ul className="max-h-40 space-y-2 overflow-auto text-xs">
                    {selected.recentReadings.map((r) => (
                      <li key={r.id} className="border-b border-white/[0.04] pb-2">
                        <p className="text-[#8b93a7]">
                          {r.kind} · {r.created_at}
                        </p>
                        <p className="text-[#c5cad3] line-clamp-2">{r.result_text}</p>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
              {selected.grants?.length > 0 && (
                <Box title="Grant ledger">
                  <ul className="max-h-36 space-y-1 overflow-auto text-[11px] text-[#a7b0c0]">
                    {selected.grants.map((g) => (
                      <li key={g.id} className="border-b border-white/[0.04] py-1">
                        {g.kind} {g.amount ?? g.plan ?? ""} · {g.actor_username} · {g.created_at}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </>
          )}

          {tab === "chat" && (
            <>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                Support / safety access only. Each open is audit-logged. Do not export or share
                transcripts outside ops.
              </div>
              <NotifyBar
                notify={notify}
                notifyLang={notifyLang}
                onNotify={setNotify}
                onLang={setNotifyLang}
                hasEmail={Boolean(selected.authEmail)}
              />
              <div className="flex flex-wrap gap-2">
                <Btn disabled={chatLoading || busy} onClick={() => void loadChat()}>
                  {chatLoading ? "Loading…" : "Reload"}
                </Btn>
                {can(staff, "users.conversations") && (
                  <Btn
                    tone="danger"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        opsClearConversation({
                          data: { userId: selected.id, ...mail() },
                        }),
                      ).then(() => loadChat())
                    }
                  >
                    Clear chat
                  </Btn>
                )}
              </div>
              <div className="max-h-[56vh] space-y-2.5 overflow-auto rounded-xl border border-white/[0.06] bg-[#070a10] p-3">
                {!chat?.messages.length && !chatLoading && (
                  <p className="text-xs text-[#667085]">No saved conversation.</p>
                )}
                {chat?.messages.map((m, i) => (
                  <motion.div
                    key={`${m.id}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className={`rounded-xl px-3 py-2.5 text-xs shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)] ${
                      m.role === "user"
                        ? "ml-4 border border-[#1877f2]/25 bg-[#1877f2]/15 text-[#dce8ff]"
                        : "mr-4 border border-white/[0.06] bg-white/[0.04] text-[#c5cad3]"
                    }`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b93a7]">
                        {m.role === "nina" ? "Maria" : m.role}
                        {m.hasCards ? " · cards" : ""}
                        {m.hasImage ? " · photo" : ""}
                      </p>
                      <time className="text-[10px] tabular-nums text-[#667085]">
                        {formatOpsTime(m.createdAt)}
                      </time>
                    </div>
                    {m.imageUrl && (
                      <a
                        href={m.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-2 block overflow-hidden rounded-lg border border-white/10"
                      >
                        <img
                          src={m.imageUrl}
                          alt="User photo"
                          className="max-h-56 w-full object-contain bg-black/40"
                        />
                      </a>
                    )}
                    {m.cards?.length > 0 && (
                      <p className="mb-1.5 text-[11px] text-[#9ec1ff]">
                        Cards: {m.cards.join(" · ")}
                      </p>
                    )}
                    {m.text.trim() && (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    )}
                  </motion.div>
                ))}
              </div>
              {chat?.updatedAt && (
                <p className="text-[10px] text-[#667085]">
                  Updated {formatOpsTime(chat.updatedAt)} · {chat.messageCount} msgs · lane{" "}
                  {chat.service || "—"}
                </p>
              )}
            </>
          )}

          {tab === "readings" && (
            <>
              <Btn disabled={chatLoading || busy} onClick={() => void loadReadings()}>
                {chatLoading ? "Loading…" : "Reload readings"}
              </Btn>
              <div className="max-h-[52vh] space-y-3 overflow-auto">
                {!readings.length && !chatLoading && (
                  <p className="text-xs text-[#667085]">No readings stored.</p>
                )}
                {readings.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-white/[0.06] bg-[#070a10] p-3 text-xs"
                  >
                    <p className="font-medium text-white">
                      {r.kind} · {r.created_at}
                    </p>
                    {r.cards?.length > 0 && (
                      <p className="mt-1 text-[#7d8799]">{r.cards.join(" · ")}</p>
                    )}
                    {r.input?.question && (
                      <p className="mt-1 text-[#9ec1ff]">Q: {r.input.question}</p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-[#c5cad3]">{r.result_text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "actions" && (
            <>
              <NotifyBar
                notify={notify}
                notifyLang={notifyLang}
                onNotify={setNotify}
                onLang={setNotifyLang}
                hasEmail={Boolean(selected.authEmail)}
              />

              {can(staff, "users.ban") && (
                <Box title="Moderation">
                  <Field
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ban reason"
                    className="mb-2 w-full"
                  />
                  <div className="flex flex-wrap gap-2">
                    <ActionBtn
                      disabled={busy}
                      tone={selected.banned ? "neutral" : "danger"}
                      onClick={() =>
                        void run(() =>
                          opsBanUser({
                            data: {
                              userId: selected.id,
                              ban: !selected.banned,
                              reason: banReason,
                              ...mail(),
                            },
                          }),
                        ).then(onRefresh)
                      }
                    >
                      {selected.banned ? "Unban" : "Ban + revoke tokens"}
                    </ActionBtn>
                    {can(staff, "users.restrict") && (
                      <ActionBtn
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsRestrictUser({
                              data: {
                                userId: selected.id,
                                restrict: !selected.chat_restricted,
                                ...mail(),
                              },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        {selected.chat_restricted ? "Lift restrict" : "Restrict chat"}
                      </ActionBtn>
                    )}
                    {can(staff, "users.watchlist") && (
                      <ActionBtn
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsWatchlistUser({
                              data: {
                                userId: selected.id,
                                watch: !selected.watchlist,
                              },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        {selected.watchlist ? "Unwatch" : "Watchlist"}
                      </ActionBtn>
                    )}
                    {can(staff, "users.force_logout") && (
                      <ActionBtn
                        disabled={busy}
                        tone="danger"
                        onClick={() =>
                          void run(() =>
                            opsForceLogout({
                              data: { userId: selected.id, ...mail() },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        Force logout
                      </ActionBtn>
                    )}
                  </div>
                </Box>
              )}

              {(can(staff, "energy.grant") || can(staff, "energy.set")) && (
                <Box title="Custom energy">
                  <div className="flex flex-wrap gap-2">
                    {can(staff, "energy.grant") && (
                      <>
                        <Field
                          value={energyDelta}
                          onChange={(e) => setEnergyDelta(e.target.value)}
                          className="w-20"
                        />
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsGrantEnergy({
                                data: {
                                  userId: selected.id,
                                  delta: Number(energyDelta) || 0,
                                  ...mail(),
                                },
                              }),
                            ).then(onRefresh)
                          }
                        >
                          Grant +
                        </ActionBtn>
                        <ActionBtn
                          disabled={busy}
                          tone="danger"
                          onClick={() =>
                            void run(() =>
                              opsGrantEnergy({
                                data: {
                                  userId: selected.id,
                                  delta: -Math.abs(Number(energyDelta) || 0),
                                  ...mail(),
                                },
                              }),
                            ).then(onRefresh)
                          }
                        >
                          Deduct
                        </ActionBtn>
                      </>
                    )}
                    {can(staff, "energy.set") && (
                      <>
                        <Field
                          value={energyAbs}
                          onChange={(e) => setEnergyAbs(e.target.value)}
                          className="w-20"
                        />
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsSetEnergy({
                                data: {
                                  userId: selected.id,
                                  balance: Number(energyAbs) || 0,
                                  ...mail(),
                                },
                              }),
                            ).then(onRefresh)
                          }
                        >
                          Set absolute
                        </ActionBtn>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {can(staff, "energy.cap") && (
                      <>
                        <Field
                          value={cap}
                          onChange={(e) => setCap(e.target.value)}
                          className="w-20"
                        />
                        <ActionBtn
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              opsSetDailyCap({
                                data: {
                                  userId: selected.id,
                                  cap: Number(cap) || 0,
                                  ...mail(),
                                },
                              }),
                            ).then(onRefresh)
                          }
                        >
                          Set daily cap
                        </ActionBtn>
                      </>
                    )}
                    {can(staff, "energy.unlimited") && (
                      <ActionBtn
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsSetUnlimited({
                              data: {
                                userId: selected.id,
                                unlimited: !selected.unlimited,
                                ...mail(),
                              },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        {selected.unlimited ? "Remove ∞ energy" : "Grant ∞ energy"}
                      </ActionBtn>
                    )}
                  </div>
                </Box>
              )}

              {can(staff, "billing.grant") && (
                <Box title="Free / custom subscription">
                  <div className="flex flex-wrap items-center gap-2">
                    <Field
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="w-16"
                    />
                    <span className="text-[11px] text-[#7d8799]">days</span>
                    {(["mystic", "ascended"] as const).map((plan) => (
                      <ActionBtn
                        key={plan}
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsGrantSub({
                              data: {
                                userId: selected.id,
                                plan,
                                days: Number(days) || 30,
                                withUnlimited: plan === "ascended",
                                ...mail(),
                              },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        Free {plan}
                      </ActionBtn>
                    ))}
                    {can(staff, "billing.revoke") && (
                      <ActionBtn
                        disabled={busy}
                        tone="danger"
                        onClick={() =>
                          void run(() =>
                            opsRevokeSub({
                              data: {
                                userId: selected.id,
                                alsoEnergy: true,
                                ...mail(),
                              },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        Revoke sub
                      </ActionBtn>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="w-full text-[10px] uppercase tracking-wide text-[#6d7689]">
                      Force plan status
                    </span>
                    {(
                      [
                        ["mystic", "active"],
                        ["ascended", "active"],
                        ["none", "none"],
                      ] as const
                    ).map(([plan, status]) => (
                      <ActionBtn
                        key={`${plan}-${status}`}
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            opsSetPlan({
                              data: { userId: selected.id, plan, status },
                            }),
                          ).then(onRefresh)
                        }
                      >
                        Set {plan}/{status}
                      </ActionBtn>
                    ))}
                  </div>
                </Box>
              )}

              {can(staff, "users.notes") && (
                <Box title="Mod notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mb-2 w-full rounded-lg border border-white/10 bg-[#0a0e16] px-2.5 py-2 text-xs text-white"
                  />
                  <ActionBtn
                    disabled={busy}
                    onClick={() =>
                      void run(() => opsSetNotes({ data: { userId: selected.id, notes } })).then(
                        onRefresh,
                      )
                    }
                  >
                    Save notes
                  </ActionBtn>
                </Box>
              )}

              <Box title="Account tools">
                <div className="flex flex-wrap gap-2">
                  {can(staff, "users.verify_email") && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          opsVerifyEmail({
                            data: {
                              userId: selected.id,
                              verified: !selected.email_verified,
                              ...mail(),
                            },
                          }),
                        ).then(onRefresh)
                      }
                    >
                      {selected.email_verified ? "Clear verified" : "Mark verified"}
                    </ActionBtn>
                  )}
                  {can(staff, "users.reset_password") && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() =>
                        void run(() => opsResetUserPassword({ data: { userId: selected.id } }))
                      }
                    >
                      Send recovery (ops inbox)
                    </ActionBtn>
                  )}
                  {can(staff, "users.notes") && (
                    <ActionBtn
                      disabled={busy}
                      tone="danger"
                      onClick={() =>
                        void run(() =>
                          opsResetUserStreak({
                            data: { userId: selected.id, ...mail() },
                          }),
                        ).then(onRefresh)
                      }
                    >
                      Reset streak
                    </ActionBtn>
                  )}
                </div>
              </Box>

              {can(staff, "users.delete") && (
                <Box title="Danger zone">
                  <Field
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    className="mb-2 w-full"
                  />
                  <ActionBtn
                    disabled={busy || deleteConfirm !== "DELETE"}
                    tone="danger"
                    onClick={() =>
                      void run(() =>
                        opsDeleteUser({
                          data: {
                            userId: selected.id,
                            confirm: deleteConfirm,
                            ...mail(),
                          },
                        }),
                      ).then((res) => {
                        if (res?.ok) onDeleted?.();
                        else void onRefresh();
                      })
                    }
                  >
                    Delete account
                  </ActionBtn>
                </Box>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
