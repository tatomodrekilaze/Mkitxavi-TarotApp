import { createHash, timingSafeEqual } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STRIPE_PLANS, isStripePlanKey, type StripePlanKey } from "@/lib/stripe-plans";
import { FLITT_PLAN_AMOUNT_TETRI } from "@/lib/flitt-plans";
import type { SubscriptionStatus } from "@/lib/supabase/types";

const FLITT_API = "https://pay.flitt.com/api";

export { FLITT_PLAN_AMOUNT_TETRI, formatFlittPlanPrice } from "@/lib/flitt-plans";

export function isFlittConfigured(): boolean {
  return Boolean(process.env.FLITT_MERCHANT_ID?.trim() && process.env.FLITT_SECRET_KEY?.trim());
}

function merchantId(): number {
  const raw = process.env.FLITT_MERCHANT_ID?.trim();
  const id = Number(raw);
  if (!raw || !Number.isFinite(id)) {
    throw new Error("FLITT_MERCHANT_ID is not set.");
  }
  return id;
}

function secretKey(): string {
  const key = process.env.FLITT_SECRET_KEY?.trim();
  if (!key) throw new Error("FLITT_SECRET_KEY is not set.");
  return key;
}

function publicOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function callbackBase(origin: string): string {
  const configured = process.env.FLITT_CALLBACK_BASE_URL?.trim().replace(/\/$/, "");
  return configured || publicOrigin(origin);
}

/** Protocol 1.0 signature (flat params). */
export function flittSign(params: Record<string, unknown>, secret = secretKey()): string {
  const ordered: string[] = [];
  for (const key of Object.keys(params).sort()) {
    if (key === "signature" || key === "response_signature_string") continue;
    const value = params[key];
    if (value === "" || value === null || value === undefined) continue;
    if (typeof value === "object") {
      ordered.push(JSON.stringify(value));
      continue;
    }
    ordered.push(String(value));
  }
  return createHash("sha1")
    .update(`${secret}|${ordered.join("|")}`, "utf8")
    .digest("hex");
}

/** Protocol 2.0 signature (subscriptions). */
function flittSignV2(base64Data: string, secret = secretKey()): string {
  return createHash("sha1").update(`${secret}|${base64Data}`, "utf8").digest("hex");
}

export function flittVerifyCallback(
  payload: Record<string, unknown>,
  secret = secretKey(),
): boolean {
  const signature = payload.signature;
  if (typeof signature !== "string" || !signature) return false;
  const copy = { ...payload };
  delete copy.signature;
  delete copy.response_signature_string;
  const expected = flittSign(copy, secret);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function merchantData(userId: string, plan: StripePlanKey): string {
  return JSON.stringify({ u: userId, p: plan });
}

function parseMerchantData(raw: unknown): { userId: string; plan: StripePlanKey } | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as { u?: unknown; p?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.p !== "string") return null;
    if (!isStripePlanKey(parsed.p)) return null;
    return { userId: parsed.u, plan: parsed.p };
  } catch {
    return null;
  }
}

async function flittPostJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${FLITT_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { response?: Record<string, unknown> };
  if (!json.response) {
    throw new Error("Flitt returned an empty response.");
  }
  return json.response;
}

export async function createFlittCheckout(input: {
  userId: string;
  email: string | undefined;
  plan: StripePlanKey;
  origin: string;
}): Promise<{ url: string; orderId: string }> {
  const amount = FLITT_PLAN_AMOUNT_TETRI[input.plan];
  const def = STRIPE_PLANS[input.plan];
  const origin = publicOrigin(input.origin);
  const base = callbackBase(input.origin);
  const orderId = `mx_${input.userId.replace(/-/g, "").slice(0, 12)}_${input.plan}_${Date.now()}`;
  const mid = merchantId();

  const admin = getSupabaseAdminClient();
  const { error: insertError } = await admin.from("flitt_orders").insert({
    order_id: orderId,
    user_id: input.userId,
    plan: input.plan,
    amount,
    currency: "GEL",
    status: "pending",
  });
  if (insertError) throw insertError;

  const common = {
    order_id: orderId,
    merchant_id: mid,
    order_desc: def.productName,
    amount,
    currency: "GEL",
    response_url: `${origin}/?checkout=success&plan=${input.plan}`,
    server_callback_url: `${base}/api/flitt/callback`,
    merchant_data: merchantData(input.userId, input.plan),
    sender_email: input.email || undefined,
    product_id: input.plan,
  };

  let response: Record<string, unknown>;

  if (def.mode === "subscription") {
    // Protocol 2.0 required for Flitt scheduled subscriptions.
    const orderPayload = {
      ...common,
      subscription: "Y",
      recurring_data: {
        every: 1,
        period: "month",
        amount,
        quantity: 120,
        state: "shown_readonly",
        readonly: "Y",
      },
    };
    const base64data = Buffer.from(JSON.stringify({ order: orderPayload }), "utf8").toString(
      "base64",
    );
    response = await flittPostJson("checkout/url/", {
      request: {
        version: "2.0",
        data: base64data,
        signature: flittSignV2(base64data),
      },
    });
  } else {
    const request = { ...common, signature: flittSign(common) };
    response = await flittPostJson("checkout/url/", { request });
  }

  if (response.response_status === "failure" || response.error_message) {
    throw new Error(
      typeof response.error_message === "string"
        ? response.error_message
        : "Flitt checkout failed.",
    );
  }

  // Protocol 2.0 may nest checkout_url differently; handle both.
  let checkoutUrl = typeof response.checkout_url === "string" ? response.checkout_url : null;
  if (!checkoutUrl && typeof response.data === "string") {
    try {
      const decoded = JSON.parse(Buffer.from(response.data, "base64").toString("utf8")) as {
        order?: { checkout_url?: string };
      };
      checkoutUrl = decoded.order?.checkout_url ?? null;
    } catch {
      /* ignore */
    }
  }

  if (!checkoutUrl) {
    throw new Error("Flitt did not return a checkout_url.");
  }

  return { url: checkoutUrl, orderId };
}

export async function createFlittBillingPortal(input: {
  userId: string;
  origin: string;
}): Promise<{ url: string }> {
  const admin = getSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("flitt_order_id, plan, status")
    .eq("user_id", input.userId)
    .maybeSingle();

  const origin = publicOrigin(input.origin);

  if (
    sub?.flitt_order_id &&
    sub.plan === "mystic" &&
    (sub.status === "active" || sub.status === "trialing")
  ) {
    const request = {
      order_id: sub.flitt_order_id,
      merchant_id: merchantId(),
      action: "stop",
    };
    const signed = { ...request, signature: flittSign(request) };
    const response = await flittPostJson("subscription/", { request: signed });
    if (response.error_message) {
      throw new Error(String(response.error_message));
    }
    await upsertSubscription({
      userId: input.userId,
      status: "cancelled",
      plan: "none",
      flittOrderId: sub.flitt_order_id,
    });
    return { url: `${origin}/?billing=cancelled` };
  }

  return { url: `${origin}/support` };
}

async function grantEnergy(userId: string, amount: number) {
  if (amount <= 0) return;
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc("grant_purchase_energy", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
}

async function upsertSubscription(fields: {
  userId: string;
  status: SubscriptionStatus;
  plan: "none" | "mystic" | "ascended";
  flittOrderId?: string | null;
  flittPaymentId?: string | null;
  flittRectoken?: string | null;
  currentPeriodEnd?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: fields.userId,
      status: fields.status,
      plan: fields.plan,
      flitt_order_id: fields.flittOrderId ?? undefined,
      flitt_payment_id: fields.flittPaymentId ?? undefined,
      flitt_rectoken: fields.flittRectoken ?? undefined,
      current_period_end: fields.currentPeriodEnd ?? undefined,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function claimCallback(orderId: string, paymentId: string | null): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const id = paymentId ? `${orderId}:${paymentId}` : orderId;
  const { error } = await admin.from("flitt_webhook_events").insert({
    id,
    type: "callback",
  });
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

export async function handleFlittCallback(payload: Record<string, unknown>): Promise<void> {
  if (!flittVerifyCallback(payload)) {
    throw new Error("Invalid Flitt callback signature.");
  }

  const orderStatus =
    typeof payload.order_status === "string" ? payload.order_status.toLowerCase() : "";
  const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
  const paymentId =
    payload.payment_id !== undefined && payload.payment_id !== null
      ? String(payload.payment_id)
      : null;

  if (!orderId) {
    throw new Error("Flitt callback missing order_id.");
  }

  // Only fulfill approved (and scheduled subscription renewals).
  if (orderStatus !== "approved") {
    const admin = getSupabaseAdminClient();
    await admin
      .from("flitt_orders")
      .update({
        status: orderStatus || "declined",
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
    return;
  }

  const firstTime = await claimCallback(orderId, paymentId);
  if (!firstTime) return;

  const admin = getSupabaseAdminClient();
  const { data: orderRow } = await admin
    .from("flitt_orders")
    .select("user_id, plan")
    .eq("order_id", orderId)
    .maybeSingle();

  const fromMerchant = parseMerchantData(payload.merchant_data);
  const userId = orderRow?.user_id || fromMerchant?.userId;
  const planRaw = orderRow?.plan || fromMerchant?.plan;
  if (!userId || !planRaw || !isStripePlanKey(planRaw)) {
    throw new Error(`Flitt callback: cannot resolve user/plan for ${orderId}`);
  }

  const def = STRIPE_PLANS[planRaw];
  const rectoken = typeof payload.rectoken === "string" ? payload.rectoken : null;

  await admin
    .from("flitt_orders")
    .update({
      status: "approved",
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);

  if (def.mode === "payment") {
    if (def.subscriptionPlan === "ascended") {
      await upsertSubscription({
        userId,
        status: "active",
        plan: "ascended",
        flittOrderId: orderId,
        flittPaymentId: paymentId,
        flittRectoken: rectoken,
      });
      return;
    }
    await grantEnergy(userId, def.energyGrant);
    return;
  }

  // Mystic subscription: initial charge + renewals both arrive as approved callbacks.
  await upsertSubscription({
    userId,
    status: "active",
    plan: "mystic",
    flittOrderId: orderId,
    flittPaymentId: paymentId,
    flittRectoken: rectoken,
    currentPeriodEnd: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await grantEnergy(userId, def.energyGrant);
}
