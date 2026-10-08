import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { logOpsEvent } from "@/lib/ops-console.server";
import copy from "@/lib/ops-user-notify-copy.json";

export type OpsNotifyLang = "en" | "ka";

export type OpsUserNoticeKind =
  | "ban"
  | "unban"
  | "restrict"
  | "unrestrict"
  | "force_logout"
  | "account_deleted"
  | "conversation_cleared"
  | "energy_granted"
  | "energy_deducted"
  | "energy_set"
  | "energy_unlimited_on"
  | "energy_unlimited_off"
  | "daily_cap_set"
  | "sub_granted"
  | "sub_revoked"
  | "email_verified"
  | "email_unverified"
  | "streak_reset";

export type OpsNotifyOptions = {
  notify?: boolean;
  notifyLang?: OpsNotifyLang;
};

type NoticeOpts = {
  displayName: string | null;
  reason?: string | null;
  amount?: number | null;
  plan?: string | null;
  days?: number | null;
  balance?: number | null;
  cap?: number | null;
};

type CopyBundle = (typeof copy)["en"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function pack(c: CopyBundle, displayName: string | null, subject: string, body: string) {
  const who = displayName?.trim() || c.friend;
  return {
    subject,
    text: [`${c.helloPrefix}${who}${c.helloSuffix}`, "", body, "", c.support, "", c.sign].join(
      "\n",
    ),
  };
}

function buildNotice(
  kind: OpsUserNoticeKind,
  lang: OpsNotifyLang,
  opts: NoticeOpts,
): { subject: string; text: string } {
  const c = copy[lang];
  const reason = opts.reason?.trim() || c.reasonFallback;
  const n = opts.displayName;
  const amount = Math.abs(opts.amount ?? 0);
  const balance = opts.balance ?? 0;
  const cap = opts.cap ?? 0;
  const plan = opts.plan ?? "plan";
  const days = opts.days ?? 0;

  switch (kind) {
    case "ban":
      return pack(c, n, c.banSub, fill(c.banBody, { reason }));
    case "unban":
      return pack(c, n, c.unbanSub, c.unbanBody);
    case "restrict":
      return pack(c, n, c.restrictSub, c.restrictBody);
    case "unrestrict":
      return pack(c, n, c.unrestrictSub, c.unrestrictBody);
    case "force_logout":
      return pack(c, n, c.logoutSub, c.logoutBody);
    case "account_deleted":
      return pack(c, n, c.delSub, c.delBody);
    case "conversation_cleared":
      return pack(c, n, c.chatSub, c.chatBody);
    case "energy_granted":
      return pack(c, n, c.egSub, fill(c.egBody, { amount }));
    case "energy_deducted":
      return pack(c, n, c.edSub, fill(c.edBody, { amount }));
    case "energy_set":
      return pack(c, n, c.esSub, fill(c.esBody, { balance }));
    case "energy_unlimited_on":
      return pack(c, n, c.euOnSub, c.euOnBody);
    case "energy_unlimited_off":
      return pack(c, n, c.euOffSub, c.euOffBody);
    case "daily_cap_set":
      return pack(c, n, c.capSub, fill(c.capBody, { cap }));
    case "sub_granted":
      return pack(c, n, c.subGSub, fill(c.subGBody, { plan, days }));
    case "sub_revoked":
      return pack(c, n, c.subRSub, c.subRBody);
    case "email_verified":
      return pack(c, n, c.evSub, c.evBody);
    case "email_unverified":
      return pack(c, n, c.euvSub, c.euvBody);
    case "streak_reset":
      return pack(c, n, c.streakSub, c.streakBody);
    default:
      return pack(c, n, c.defSub, c.defBody);
  }
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, detail: "RESEND_API_KEY missing" };

  const from = process.env.CONTACT_FROM?.trim() || "Mkitxavi <onboarding@resend.dev>";
  const html = `
    <div style="font-family:Georgia,serif;line-height:1.55;color:#111;max-width:560px">
      ${escapeHtml(input.text).replace(/\n/g, "<br/>")}
    </div>
  `.trim();

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html,
  });
  if (error) {
    console.error("ops user notify resend", error);
    return { ok: false, detail: error.message };
  }
  return { ok: true, detail: data?.id ?? "sent" };
}

/** Send a user-facing notice after an ops action. Never throws. */
export async function maybeNotifyOpsUser(input: {
  userId: string;
  notify?: boolean;
  notifyLang?: OpsNotifyLang;
  kind: OpsUserNoticeKind;
  actorStaffId: string;
  actorUsername: string;
  reason?: string | null;
  amount?: number | null;
  plan?: string | null;
  days?: number | null;
  balance?: number | null;
  cap?: number | null;
}): Promise<{ emailed: boolean; detail?: string }> {
  if (!input.notify) return { emailed: false };

  try {
    const admin = getSupabaseAdminClient();
    const [{ data: auth }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(input.userId),
      admin.from("profiles").select("display_name, lang").eq("id", input.userId).maybeSingle(),
    ]);

    const email = auth.user?.email?.trim();
    if (!email) return { emailed: false, detail: "No email on account" };

    const profileLang = String((profile as { lang?: string | null } | null)?.lang || "")
      .toLowerCase()
      .startsWith("ka")
      ? "ka"
      : "en";
    const lang: OpsNotifyLang =
      input.notifyLang === "ka" || input.notifyLang === "en" ? input.notifyLang : profileLang;

    const notice = buildNotice(input.kind, lang, {
      displayName: (profile as { display_name?: string | null } | null)?.display_name ?? null,
      reason: input.reason,
      amount: input.amount,
      plan: input.plan,
      days: input.days,
      balance: input.balance,
      cap: input.cap,
    });

    const sent = await sendResendEmail({
      to: email,
      subject: notice.subject,
      text: notice.text,
    });

    await logOpsEvent({
      category: "moderation",
      action: "user_notify_email",
      actorStaffId: input.actorStaffId,
      actorUsername: input.actorUsername,
      targetUserId: input.userId,
      meta: {
        kind: input.kind,
        lang,
        ok: sent.ok,
        detail: sent.detail ?? null,
      },
    });

    return { emailed: sent.ok, detail: sent.detail };
  } catch (err) {
    console.error("ops user notify", err);
    return {
      emailed: false,
      detail: err instanceof Error ? err.message : "notify failed",
    };
  }
}

export function appendNotifyResult(
  message: string,
  notify?: boolean,
  result?: { emailed: boolean; detail?: string },
): string {
  if (!notify) return message;
  if (result?.emailed) return `${message} Email sent.`;
  return `${message} Email not sent${result?.detail ? `: ${result.detail}` : "."}`;
}
