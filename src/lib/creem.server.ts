import { createHmac, timingSafeEqual } from "node:crypto";
import { Creem } from "creem";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STRIPE_PLANS, type StripePlanKey } from "@/lib/stripe-plans";
import type { SubscriptionStatus } from "@/lib/supabase/types";

type CreemWebhookEvent = {
  id?: string;
  eventType?: string;
  event_type?: string;
  object?: Record<string, unknown>;
};

function creemServer(): "prod" | "test" {
  const mode = (process.env.CREEM_MODE || "").trim().toLowerCase();
  if (mode === "test" || mode === "sandbox") return "test";
  if (mode === "prod" || mode === "live") return "prod";
  // Test API keys typically contain "test"
  const key = process.env.CREEM_API_KEY || "";
  return key.includes("test") ? "test" : "prod";
}

let creemSingleton: Creem | null = null;

export function getCreem(): Creem {
  const apiKey = process.env.CREEM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CREEM_API_KEY is not set. Add it to .env from the Creem Dashboard.");
  }
  if (!creemSingleton) {
    creemSingleton = new Creem({ apiKey, server: creemServer() });
  }
  return creemSingleton;
}

export function isCreemConfigured(): boolean {
  return Boolean(process.env.CREEM_API_KEY?.trim());
}

function productIdForPlan(plan: StripePlanKey): string | undefined {
  const envKey =
    plan === "topUp"
      ? "CREEM_PRODUCT_TOPUP"
      : plan === "mystic"
        ? "CREEM_PRODUCT_MYSTIC"
        : "CREEM_PRODUCT_ASCENDED";
  const id = process.env[envKey]?.trim();
  return id || undefined;
}

function planFromProductId(productId: string | null | undefined): StripePlanKey | null {
  if (!productId) return null;
  if (productId === process.env.CREEM_PRODUCT_TOPUP?.trim()) return "topUp";
  if (productId === process.env.CREEM_PRODUCT_MYSTIC?.trim()) return "mystic";
  if (productId === process.env.CREEM_PRODUCT_ASCENDED?.trim()) return "ascended";
  return null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export async function createCreemCheckout(input: {
  userId: string;
  email: string | undefined;
  plan: StripePlanKey;
  origin: string;
}): Promise<{ url: string }> {
  const productId = productIdForPlan(input.plan);
  if (!productId) {
    throw new Error(
      `Missing Creem product id for ${input.plan}. Set CREEM_PRODUCT_TOPUP / MYSTIC / ASCENDED.`,
    );
  }

  const origin = input.origin.replace(/\/$/, "");
  const creem = getCreem();
  const checkout = await creem.checkouts.create({
    productId,
    requestId: `${input.userId}:${input.plan}:${Date.now()}`,
    successUrl: `${origin}/?checkout=success&plan=${input.plan}`,
    customer: input.email ? { email: input.email } : undefined,
    metadata: {
      supabase_user_id: input.userId,
      plan: input.plan,
    },
  });

  if (!checkout.checkoutUrl) {
    throw new Error("Creem Checkout did not return a URL.");
  }
  return { url: checkout.checkoutUrl };
}

export async function createCreemBillingPortal(input: {
  userId: string;
}): Promise<{ url: string }> {
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("creem_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row?.creem_customer_id) {
    throw new Error("No Creem customer yet. Buy a plan first.");
  }

  const creem = getCreem();
  const links = await creem.customers.generateBillingLinks({
    customerId: row.creem_customer_id,
  });
  if (!links.customerPortalLink) {
    throw new Error("Creem did not return a portal link.");
  }
  return { url: links.customerPortalLink };
}

function mapCreemStatus(status: string | undefined | null): SubscriptionStatus {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
    case "expired":
      return "cancelled";
    case "paused":
    case "unpaid":
      return "past_due";
    default:
      return "none";
  }
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
  creemCustomerId?: string | null;
  creemSubscriptionId?: string | null;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: fields.userId,
      status: fields.status,
      plan: fields.plan,
      creem_customer_id: fields.creemCustomerId ?? undefined,
      creem_subscription_id: fields.creemSubscriptionId ?? undefined,
      price_id: fields.priceId ?? undefined,
      current_period_end: fields.currentPeriodEnd ?? undefined,
      cancel_at_period_end: fields.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function resolveUserId(opts: {
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  const fromMeta = opts.metadata?.supabase_user_id;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;

  if (opts.requestId) {
    const uid = opts.requestId.split(":")[0];
    if (uid && uid.length >= 20) return uid;
  }

  if (opts.customerId) {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("creem_customer_id", opts.customerId)
      .maybeSingle();
    return data?.user_id ?? null;
  }
  return null;
}

async function syncSubscriptionObject(
  sub: Record<string, unknown>,
  userIdHint?: string | null,
  planHint?: StripePlanKey | null,
) {
  const metadata = (sub.metadata as Record<string, unknown> | undefined) ?? null;
  const customerId = idOf(sub.customer);
  const userId =
    userIdHint ||
    (await resolveUserId({
      metadata,
      customerId,
    }));
  if (!userId) {
    console.error("Creem subscription: missing user id", sub.id);
    return;
  }

  const productId = idOf(sub.product);
  // Paid product id only — never trust metadata.plan for entitlements.
  const planKey = planHint || planFromProductId(productId) || "mystic";
  const def = STRIPE_PLANS[planKey];
  const statusRaw = typeof sub.status === "string" ? sub.status : null;
  const mapped = mapCreemStatus(statusRaw);
  const periodEnd =
    typeof sub.current_period_end_date === "string"
      ? sub.current_period_end_date
      : typeof sub.currentPeriodEndDate === "string"
        ? sub.currentPeriodEndDate
        : null;
  const cancelAtPeriodEnd =
    statusRaw === "scheduled_cancel" ||
    Boolean(sub.cancel_at_period_end) ||
    Boolean(sub.cancelAtPeriodEnd);

  await upsertSubscription({
    userId,
    status: mapped === "none" && statusRaw === "scheduled_cancel" ? "active" : mapped,
    plan:
      mapped === "cancelled" || mapped === "none"
        ? "none"
        : def.subscriptionPlan === "none"
          ? "mystic"
          : def.subscriptionPlan,
    creemCustomerId: customerId,
    creemSubscriptionId: typeof sub.id === "string" ? sub.id : null,
    priceId: productId,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
  });
}

async function handleCheckoutCompleted(obj: Record<string, unknown>) {
  const metadata = (obj.metadata as Record<string, unknown> | undefined) ?? null;
  const customerId = idOf(obj.customer);
  const userId = await resolveUserId({
    metadata,
    requestId: typeof obj.request_id === "string" ? obj.request_id : null,
    customerId,
  });
  if (!userId) {
    console.error("Creem checkout: missing user id", obj.id);
    return;
  }

  const productId = idOf(obj.product);
  const planKey = planFromProductId(productId) || "topUp";
  const def = STRIPE_PLANS[planKey];

  if (def.mode === "payment") {
    // Lifetime Ascended unlock (one-time).
    if (def.subscriptionPlan === "ascended") {
      await upsertSubscription({
        userId,
        status: "active",
        plan: "ascended",
        creemCustomerId: customerId,
        priceId: productId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      return;
    }

    await grantEnergy(userId, def.energyGrant);
    if (customerId) {
      await upsertSubscription({
        userId,
        status: "none",
        plan: "none",
        creemCustomerId: customerId,
      });
    }
    return;
  }

  const sub = obj.subscription;
  if (sub && typeof sub === "object") {
    await syncSubscriptionObject(sub as Record<string, unknown>, userId, planKey);
  } else if (customerId) {
    await upsertSubscription({
      userId,
      status: "active",
      plan: def.subscriptionPlan === "none" ? "mystic" : def.subscriptionPlan,
      creemCustomerId: customerId,
      creemSubscriptionId: idOf(sub),
      priceId: productId,
    });
  }
}

async function handleSubscriptionPaid(obj: Record<string, unknown>) {
  const metadata = (obj.metadata as Record<string, unknown> | undefined) ?? null;
  const productId = idOf(obj.product);
  const planKey = planFromProductId(productId) || "mystic";

  await syncSubscriptionObject(obj, null, planKey);

  if (planKey === "mystic") {
    const userId = await resolveUserId({
      metadata,
      customerId: idOf(obj.customer),
    });
    if (userId) {
      await grantEnergy(userId, STRIPE_PLANS.mystic.energyGrant);
    }
  }
}

async function claimEvent(eventId: string, type: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("creem_webhook_events").insert({
    id: eventId,
    type,
  });
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

function verifyCreemSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function handleCreemWebhook(rawBody: string, signature: string): Promise<void> {
  const secret = process.env.CREEM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("CREEM_WEBHOOK_SECRET is not set.");
  }
  if (!verifyCreemSignature(rawBody, signature, secret)) {
    throw new Error("Invalid Creem webhook signature.");
  }

  const event = JSON.parse(rawBody) as CreemWebhookEvent;
  const type = event.eventType || event.event_type;
  const eventId = event.id;
  if (!type || !eventId) {
    throw new Error("Creem webhook missing eventType or id.");
  }

  const firstTime = await claimEvent(eventId, type);
  if (!firstTime) return;

  const obj = (event.object || {}) as Record<string, unknown>;

  switch (type) {
    case "checkout.completed":
      await handleCheckoutCompleted(obj);
      break;
    case "subscription.paid":
      await handleSubscriptionPaid(obj);
      break;
    case "subscription.active":
    case "subscription.trialing":
    case "subscription.update":
    case "subscription.past_due":
    case "subscription.canceled":
    case "subscription.expired":
    case "subscription.paused":
    case "subscription.scheduled_cancel":
      await syncSubscriptionObject(obj);
      break;
    default:
      break;
  }
}
