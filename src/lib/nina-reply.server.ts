import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  classifyIntentLocally,
  generateNinaReply,
  type NinaCardPayload,
  type NinaContextPayload,
  type NinaHistoryTurn,
  type NinaProfileContext,
  type NinaSessionPayload,
} from "@/lib/nina-ai";
import { isLikelyCardReadingAsk, stripAiMarkup } from "@/lib/chat-text";
import { canUsePhotoUpload } from "@/lib/photo-access";
import {
  deafFallbackReplacement,
  detectHallucination,
  repairInventedLongHorizonOnTodayAsk,
  repairPastPresentFutureOnShortHorizonAsk,
  repairStockMonthWindow,
  repairTopicLeak,
} from "@/lib/hallucination";
import type { Lang } from "@/lib/i18n";
import { fetchOpsRuntimeConfig } from "@/lib/ops-runtime.server";
import { TAROT_DECK } from "@/lib/tarot";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Fallback per-user rate limit (in-memory; used if durable RPC unavailable). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map<string, number[]>();

function checkRateLimitMemory(userId: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(userId) ?? [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(userId, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(userId, recent);
  return true;
}

/**
 * Prefer durable `claim_ai_reply_slot` (Supabase). Fall back to in-memory when
 * the RPC is missing or errors so a failed migration never blocks replies.
 */
async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("claim_ai_reply_slot", {
      p_max_per_minute: RATE_MAX,
    });
    if (!error && typeof data === "boolean") {
      return data;
    }
    if (error) {
      console.warn("[ninaReply] claim_ai_reply_slot unavailable, using memory", error.message);
    }
  } catch (err) {
    console.warn("[ninaReply] claim_ai_reply_slot threw, using memory", err);
  }
  return checkRateLimitMemory(userId);
}

/** Resolve card keys against the real deck — never trust client name/keywords/meaning. */
function resolveTrustedCards(
  cards: NinaReplyInput["cards"],
  lang: Lang,
): NinaCardPayload[] | undefined {
  if (!cards?.length) return undefined;
  const out: NinaCardPayload[] = [];
  for (const c of cards.slice(0, 3)) {
    const full = TAROT_DECK.find((d) => d.key === c.key);
    if (!full) continue;
    out.push({
      key: full.key,
      name: full.names[lang] || full.names.en,
      glyph: full.glyph,
      suit: full.suit,
      keywords: full.keywords[lang] || full.keywords.en,
      meaning: full.meanings[lang] || full.meanings.en,
    });
  }
  return out.length ? out : undefined;
}

function sanitizeHistory(history: NinaHistoryTurn[] | undefined): NinaHistoryTurn[] | undefined {
  if (!history?.length) return undefined;
  return history.slice(-12).map((h) => ({
    role: h.role === "nina" ? "nina" : "user",
    text: String(h.text ?? "").slice(0, 800),
  }));
}

export type NinaReplyInput = {
  mode: "chat" | "reading" | "intent" | "clarify" | "coffee" | "hand" | "dream";
  lang: Lang;
  question: string;
  accessToken: string;
  /** Client may send keys only; server resolves trusted card text from the deck. */
  cards?: Array<Pick<NinaCardPayload, "key"> & Partial<Omit<NinaCardPayload, "key">>>;
  history?: NinaHistoryTurn[];
  imageBase64?: string;
  imageMime?: string;
  session?: NinaSessionPayload;
  client?: NinaContextPayload["client"];
};

export type NinaReplyResult =
  | {
      ok: true;
      text: string;
      source: "ai" | "fallback";
      intent?: "chat" | "clarify" | "reading";
      /** Balance after the server charged for this reply, when it charged. */
      energy?: number;
    }
  | { ok: false; error: string };

/**
 * Every generative mode bills one energy. `intent` is a local classifier only
 * (no Gemini) so it cannot burn AI quota.
 */
const BILLABLE_MODES = new Set<NinaReplyInput["mode"]>([
  "chat",
  "reading",
  "coffee",
  "hand",
  "dream",
  "clarify",
]);

async function loadProfileContext(accessToken: string): Promise<{
  profile: NinaProfileContext;
  userId: string;
  supabase: SupabaseClient<Database>;
  plan: string;
  subStatus: string;
  isComp: boolean;
  periodEnd: string | null;
  energyUnlimited: boolean;
  banned: boolean;
  chatRestricted: boolean;
} | null> {
  const supabase = getSupabaseUserClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;

  const [{ data: profile }, { data: energy }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("energy_balance").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, plan, is_comp, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    supabase,
    plan: sub?.plan ?? "none",
    subStatus: sub?.status ?? "none",
    isComp: Boolean(sub?.is_comp),
    periodEnd: sub?.current_period_end ?? null,
    energyUnlimited: Boolean(energy?.unlimited),
    banned: Boolean(profile?.banned),
    chatRestricted: Boolean(profile?.chat_restricted),
    profile: {
      name: profile?.display_name ?? "",
      birthDate: profile?.birth_date ?? null,
      interests: profile?.interests ?? [],
      hobbies: profile?.hobbies ?? [],
      cosmicVibe: profile?.cosmic_vibe ?? null,
      streak: profile?.streak ?? 0,
      bestStreak: profile?.best_streak ?? 0,
      energy: energy?.unlimited ? 999999 : (energy?.balance ?? 0),
      dailyCap: energy?.daily_cap ?? 5,
      subStatus: sub?.status ?? "none",
    },
  };
}

async function maybeSaveReading(
  userId: string,
  lang: Lang,
  question: string,
  cards: NinaCardPayload[] | undefined,
  text: string,
) {
  try {
    if (!cards?.length) return;
    // Service role only — clients cannot insert fake reading history.
    const admin = getSupabaseAdminClient();
    await admin.from("reading_history").insert({
      user_id: userId,
      kind: "tarot",
      lang,
      cards: cards.map((c) => c.key),
      input: { question },
      result_text: text,
      energy_spent: 1,
    });
  } catch (err) {
    console.warn("reading_history insert skipped", err);
  }
}

export async function handleNinaReply(data: NinaReplyInput): Promise<NinaReplyResult> {
  const loaded = await loadProfileContext(data.accessToken);
  if (!loaded) {
    return { ok: false, error: "unauthorized" };
  }
  const {
    profile,
    userId,
    supabase,
    plan,
    subStatus,
    isComp,
    periodEnd,
    energyUnlimited,
    banned,
    chatRestricted,
  } = loaded;

  if (banned) {
    return { ok: false, error: "account_banned" };
  }
  if (chatRestricted && BILLABLE_MODES.has(data.mode)) {
    return { ok: false, error: "account_restricted" };
  }
  if (BILLABLE_MODES.has(data.mode) && !(await checkRateLimit(supabase, userId))) {
    return { ok: false, error: "rate_limited" };
  }

  const runtime = await fetchOpsRuntimeConfig();
  if (runtime.flags.maintenanceMode && BILLABLE_MODES.has(data.mode)) {
    return { ok: false, error: "maintenance" };
  }
  if (
    !runtime.flags.chatEnabled &&
    BILLABLE_MODES.has(data.mode) &&
    data.mode !== "coffee" &&
    data.mode !== "hand"
  ) {
    return { ok: false, error: "chat_disabled" };
  }
  if (!runtime.flags.coffeeReadingEnabled && (data.mode === "coffee" || data.mode === "hand")) {
    return { ok: false, error: "coffee_disabled" };
  }

  const lang: Lang = data.lang === "en" ? "en" : "ka";

  // Intent never calls Gemini — local rules only.
  if (data.mode === "intent") {
    const intent = classifyIntentLocally(data.question, data.history);
    return { ok: true, text: intent, source: "fallback", intent };
  }

  const trustedCards = resolveTrustedCards(data.cards, lang);

  // Chat/clarify/dream must not answer life asks without a real draw —
  // unless the client is continuing an active three-card spread (cards attached).
  if (
    (data.mode === "chat" || data.mode === "clarify" || data.mode === "dream") &&
    isLikelyCardReadingAsk(data.question) &&
    !trustedCards?.length
  ) {
    return { ok: false, error: "needs_reading" };
  }
  if (data.mode === "reading" && (!trustedCards || trustedCards.length === 0)) {
    return { ok: false, error: "cards_required" };
  }
  if (data.mode === "coffee" || data.mode === "hand") {
    if (!data.imageBase64) {
      return { ok: false, error: "image_required" };
    }
    const mime = (data.imageMime || "").toLowerCase().replace("image/jpg", "image/jpeg");
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      return { ok: false, error: "invalid_image" };
    }
    // Rough decoded size guard (~1.5MB).
    if (data.imageBase64.length > 2_000_000) {
      return { ok: false, error: "invalid_image" };
    }
    if (
      !canUsePhotoUpload({
        energyUnlimited,
        plan,
        status: subStatus,
        isComp,
        periodEnd,
      })
    ) {
      return { ok: false, error: "subscription_required" };
    }
  }

  /*
   * Charge before generating. The client also checks the balance, but that is a
   * UX affordance only: without this the paywall and the Gemini quota are open
   * to anyone who replays this request with a valid token.
   */
  let energyAfter: number | undefined;
  if (BILLABLE_MODES.has(data.mode)) {
    const { data: remaining, error: spendError } = await supabase.rpc("spend_energy", {
      amount: 1,
    });
    if (spendError) {
      console.warn("[ninaReply] spend_energy refused", spendError.message);
      return { ok: false, error: "insufficient_energy" };
    }
    if (typeof remaining === "number") energyAfter = remaining;
  }

  const ctx: NinaContextPayload = {
    mode: data.mode,
    lang,
    question: data.question.slice(0, 2000),
    cards: trustedCards,
    history: sanitizeHistory(data.history),
    imageBase64: data.imageBase64,
    imageMime: data.imageMime?.toLowerCase().replace("image/jpg", "image/jpeg"),
    session: data.session,
    client:
      data.mode === "reading" || data.mode === "coffee" || data.mode === "hand"
        ? data.client
        : undefined,
  };

  const refundCharge = async (why: string) => {
    if (typeof energyAfter !== "number") return;
    try {
      const admin = getSupabaseAdminClient();
      const { data: wallet } = await admin
        .from("energy_balance")
        .select("unlimited")
        .eq("user_id", userId)
        .maybeSingle();
      // Unlimited spends never deducted — do not grant free energy.
      if (wallet?.unlimited) return;
      await admin.rpc("grant_purchase_energy", { p_user_id: userId, p_amount: 1 });
    } catch (err) {
      console.warn(`[ninaReply] refund after ${why} failed`, err);
    }
  };

  const ai = await generateNinaReply(profile, ctx);
  if (!ai.ok || !ai.text) {
    console.warn("[ninaReply] ai failed", ai.error ?? "ai_failed", data.mode);
    await refundCharge("ai_failed");
    return { ok: false, error: ai.error ?? "ai_failed" };
  }

  let text = stripAiMarkup(ai.text);
  const replyLang = lang === "en" ? "en" : "ka";

  const hit = detectHallucination({
    mode: data.mode,
    text,
    question: data.question,
    hasImage: Boolean(data.imageBase64),
    cards: trustedCards,
    history: sanitizeHistory(data.history),
  });

  if (hit === "deaf") {
    console.warn("[ninaReply] deaf fallback blocked", data.mode);
    await refundCharge("deaf");
    text = deafFallbackReplacement(replyLang);
  } else if (hit === "fake_spread") {
    console.warn("[ninaReply] invented spread blocked", data.mode);
    await refundCharge("fake_spread");
    // Only ask client to draw when the ask truly needs cards.
    return {
      ok: false,
      error: isLikelyCardReadingAsk(data.question) ? "needs_reading" : "invented_spread",
    };
  } else if (hit === "fake_photo") {
    console.warn("[ninaReply] fake photo sight blocked", data.mode);
    await refundCharge("fake_photo");
    text =
      replyLang === "en"
        ? "Send a clear photo with the paperclip, and I will read what is actually there. I will not invent from thin air."
        : "ატვირთე მკაფიო ფოტო ქაღალდის კლიპით და წავიკითხავ იმას, რაც ნამდვილად ჩანს. ჰაერიდან არაფერს გამოვიგონებ.";
  } else if (hit === "ungrounded_life") {
    console.warn("[ninaReply] ungrounded life claim blocked", data.mode);
    await refundCharge("ungrounded_life");
    text =
      replyLang === "en"
        ? "I will not invent facts you did not share. Tell me the one detail that matters most, and we will go from there."
        : "იმ ფაქტებს არ გამოვიგონებ, რაც არ გითქვამს. მითხარი ერთი ყველაზე მნიშვნელოვანი დეტალი და იქიდან გავაგრძელებთ.";
  } else if (hit === "topic_leak") {
    console.warn("[ninaReply] history topic leak soft-cleaned", data.mode);
    text = repairTopicLeak({
      text,
      question: data.question,
      history: sanitizeHistory(data.history),
      lang: replyLang,
    });
  } else if (hit === "today_long_horizon") {
    console.warn("[ninaReply] today-ask long horizon soft-repaired", data.mode);
    text = repairInventedLongHorizonOnTodayAsk({
      text,
      question: data.question,
      lang: replyLang,
    });
  } else if (hit === "short_horizon_ppf") {
    console.warn("[ninaReply] short-horizon PPF soft-repaired", data.mode);
    text = repairPastPresentFutureOnShortHorizonAsk({
      text,
      question: data.question,
      lang: replyLang,
    });
  } else if (hit === "stock_month_window") {
    console.warn("[ninaReply] stock 1–2 month window soft-repaired", data.mode);
    text = repairStockMonthWindow({
      text,
      question: data.question,
      lang: replyLang,
    });
  } else if (hit === "extra_cards") {
    // Soft: keep the answer — false positives were wiping good readings.
    console.warn("[ninaReply] extra cards soft-ignored", data.mode);
  }

  if (data.mode === "reading") {
    void maybeSaveReading(userId, lang, data.question, trustedCards, text);
  }

  return { ok: true, text, source: "ai", energy: energyAfter };
}
