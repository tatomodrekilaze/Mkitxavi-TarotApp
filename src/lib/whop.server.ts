import Whop from "@whop/sdk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STRIPE_PLANS, type StripePlanKey } from "@/lib/stripe-plans";
import type { SubscriptionStatus } from "@/lib/supabase/types";

function webhookKeyForSdk(): string | undefined {
  const secret = process.env.WHOP_WEBHOOK_SECRET?.trim();
  if (!secret) return undefined;
  // Standard Webhooks verifier expects a base64 key.
  if (/^[A-Za-z0-9+/=]+$/.test(secret) && secret.length % 4 === 0) {
    try {
      atob(secret);
      return secret;
    } catch {
      // fall through - treat as raw secret
    }
  }
  return Buffer.from(secret, "utf8").toString("base64");
}

let whopSingleton: Whop | null = null;

export function getWhop(): Whop {
  // SDK adds the Authorization scheme itself - pass the raw apik_… key only.
  const apiKey = (process.env.WHOP_API_KEY?.trim() || "").replace(/^Bearer\s+/i, "");
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is not set. Add it from Whop Dashboard → Developer.");
  }
  if (!whopSingleton) {
    whopSingleton = new Whop({
      apiKey,
      webhookKey: webhookKeyForSdk() ?? null,
    });
  }
  return whopSingleton;
}

export function isWhopConfigured(): boolean {
  return Boolean(process.env.WHOP_API_KEY?.trim());
}

function planIdFor(plan: StripePlanKey): string | undefined {
  const envKey =
    plan === "topUp"
      ? "WHOP_PLAN_TOPUP"
      : plan === "mystic"
        ? "WHOP_PLAN_MYSTIC"
        : "WHOP_PLAN_ASCENDED";
  const id = process.env[envKey]?.trim();
  return id || undefined;
}

function productIdFor(plan: StripePlanKey): string | undefined {
  const envKey =
    plan === "topUp"
      ? "WHOP_PRODUCT_TOPUP"
      : plan === "mystic"
        ? "WHOP_PRODUCT_MYSTIC"
        : "WHOP_PRODUCT_ASCENDED";
  const id = process.env[envKey]?.trim();
  return id || undefined;
}

function planFromWhopIds(
  planId: string | null | undefined,
  productId: string | null | undefined,
): StripePlanKey | null {
  if (planId) {
    if (planId === process.env.WHOP_PLAN_TOPUP?.trim()) return "topUp";
    if (planId === process.env.WHOP_PLAN_MYSTIC?.trim()) return "mystic";
    if (planId === process.env.WHOP_PLAN_ASCENDED?.trim()) return "ascended";
  }
  if (productId) {
    if (productId === process.env.WHOP_PRODUCT_TOPUP?.trim()) return "topUp";
    if (productId === process.env.WHOP_PRODUCT_MYSTIC?.trim()) return "mystic";
    if (productId === process.env.WHOP_PRODUCT_ASCENDED?.trim()) return "ascended";
  }
  return null;
}

export async function createWhopCheckout(input: {
  userId: string;
  email: string | undefined;
  plan: StripePlanKey;
  origin: string;
}): Promise<{ url: string }> {
  const planId = planIdFor(input.plan);
  if (!planId) {
    throw new Error(
      `Missing Whop plan id for ${input.plan}. Set WHOP_PLAN_TOPUP / MYSTIC / ASCENDED (plan_…).`,
    );
  }

  const origin = input.origin.replace(/\/$/, "");
  const whop = getWhop();
  const checkout = await whop.checkoutConfigurations.create({
    plan_id: planId,
    redirect_url: `${origin}/?checkout=success&plan=${input.plan}`,
    metadata: {
      supabase_user_id: input.userId,
      plan: input.plan,
      email: input.email ?? "",
    },
  });

  if (!checkout.purchase_url) {
    throw new Error("Whop checkout did not return a purchase_url.");
  }
  return { url: checkout.purchase_url };
}

export async function createWhopBillingPortal(input: { userId: string }): Promise<{ url: string }> {
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("whop_manage_url")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row?.whop_manage_url) {
    const err = new Error("No Whop membership yet. Buy a plan first.");
    (err as Error & { code?: string }).code = "billingNoSubscription";
    throw err;
  }
  return { url: row.whop_manage_url };
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

async function applyDailyCap(userId: string, dailyCap: number) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc("apply_plan_daily_cap", {
    p_user_id: userId,
    p_daily_cap: dailyCap,
  });
  if (error) throw error;
}

async function upsertSubscription(fields: {
  userId: string;
  status: SubscriptionStatus;
  plan: "none" | "mystic" | "ascended";
  whopMembershipId?: string | null;
  whopCustomerId?: string | null;
  whopManageUrl?: string | null;
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
      whop_membership_id: fields.whopMembershipId ?? undefined,
      whop_customer_id: fields.whopCustomerId ?? undefined,
      whop_manage_url: fields.whopManageUrl ?? undefined,
      price_id: fields.priceId ?? undefined,
      current_period_end: fields.currentPeriodEnd ?? undefined,
      cancel_at_period_end: fields.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function resolveUserId(
  metadata: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  const fromMeta = metadata?.supabase_user_id;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  return null;
}

function mapMembershipStatus(status: string | undefined | null): SubscriptionStatus {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
    case "expired":
      return "cancelled";
    default:
      return "none";
  }
}

async function claimEvent(eventId: string, type: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("whop_webhook_events").insert({
    id: eventId,
    type,
  });
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

async function fulfillPayment(payment: {
  id: string;
  metadata?: Record<string, unknown> | null;
  plan?: { id?: string } | null;
  membership?: {
    id?: string;
    manage_url?: string | null;
    renewal_period_end?: string | null;
    cancel_at_period_end?: boolean;
    status?: string;
  } | null;
  member?: { id?: string } | null;
  product?: { id?: string } | null;
}) {
  const metadata = payment.metadata ?? null;
  const userId = await resolveUserId(metadata);
  if (!userId) {
    console.error("Whop payment: missing supabase_user_id in metadata", payment.id);
    return;
  }

  // Trust paid Whop plan/product IDs only — never client-influenced metadata.plan.
  const planKey = planFromWhopIds(payment.plan?.id, payment.product?.id) || "topUp";
  const def = STRIPE_PLANS[planKey];

  if (def.mode === "payment") {
    await grantEnergy(userId, def.energyGrant);
    if (payment.member?.id) {
      await upsertSubscription({
        userId,
        status: "none",
        plan: "none",
        whopCustomerId: payment.member.id,
      });
    }
    return;
  }

  const mapped = mapMembershipStatus(payment.membership?.status ?? "active");
  await upsertSubscription({
    userId,
    status: mapped === "none" ? "active" : mapped,
    plan: def.subscriptionPlan,
    whopMembershipId: payment.membership?.id ?? null,
    whopCustomerId: payment.member?.id ?? null,
    whopManageUrl: payment.membership?.manage_url ?? null,
    priceId: payment.plan?.id ?? payment.product?.id ?? null,
    currentPeriodEnd: payment.membership?.renewal_period_end ?? null,
    cancelAtPeriodEnd: Boolean(payment.membership?.cancel_at_period_end),
  });
  await applyDailyCap(userId, def.dailyCap);
}

async function handleMembershipDeactivated(membership: {
  id: string;
  metadata?: Record<string, unknown> | null;
  plan?: { id?: string } | null;
}) {
  const admin = getSupabaseAdminClient();
  let userId = await resolveUserId(membership.metadata);

  if (!userId) {
    const { data: row } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("whop_membership_id", membership.id)
      .maybeSingle();
    userId = row?.user_id ?? null;
  }
  if (!userId) {
    console.error("Whop membership.deactivated: no user for", membership.id);
    return;
  }

  await upsertSubscription({
    userId,
    status: "cancelled",
    plan: "none",
    whopMembershipId: membership.id,
    cancelAtPeriodEnd: false,
  });
  await applyDailyCap(userId, 5);
}

export async function handleWhopWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<void> {
  /*
   * This handler grants plans and energy, so an unverified body is a free
   * subscription. Refuse outright rather than relying on the SDK's behaviour
   * when it was constructed without a webhook key.
   */
  if (!webhookKeyForSdk()) {
    throw new Error("WHOP_WEBHOOK_SECRET is not set. Refusing unverified webhook.");
  }

  const whop = getWhop();
  const event = whop.webhooks.unwrap(rawBody, { headers });

  const firstTime = await claimEvent(event.id, event.type);
  if (!firstTime) return;

  switch (event.type) {
    case "payment.succeeded":
      await fulfillPayment(event.data);
      break;
    case "membership.activated": {
      const m = event.data;
      const userId = await resolveUserId(m.metadata);
      if (!userId) {
        console.error("Whop membership.activated: missing user", m.id);
        break;
      }
      const planKey = planFromWhopIds(m.plan?.id, m.product?.id) || "mystic";
      const def = STRIPE_PLANS[planKey];
      if (def.subscriptionPlan === "none") break;
      await upsertSubscription({
        userId,
        status: mapMembershipStatus(m.status),
        plan: def.subscriptionPlan,
        whopMembershipId: m.id,
        whopCustomerId: m.member?.id ?? null,
        whopManageUrl: m.manage_url ?? null,
        priceId: m.plan?.id ?? null,
        currentPeriodEnd: m.renewal_period_end ?? null,
        cancelAtPeriodEnd: Boolean(m.cancel_at_period_end),
      });
      await applyDailyCap(userId, def.dailyCap);
      break;
    }
    case "membership.deactivated":
      await handleMembershipDeactivated(event.data);
      break;
    case "membership.cancel_at_period_end_changed": {
      const m = event.data;
      const admin = getSupabaseAdminClient();
      let userId = await resolveUserId(m.metadata);
      if (!userId) {
        const { data: row } = await admin
          .from("subscriptions")
          .select("user_id")
          .eq("whop_membership_id", m.id)
          .maybeSingle();
        userId = row?.user_id ?? null;
      }
      if (!userId) break;
      const planKey = planFromWhopIds(m.plan?.id, m.product?.id) || "mystic";
      const def = STRIPE_PLANS[planKey];
      await upsertSubscription({
        userId,
        status: mapMembershipStatus(m.status),
        plan: def.subscriptionPlan === "none" ? "mystic" : def.subscriptionPlan,
        whopMembershipId: m.id,
        whopManageUrl: m.manage_url ?? null,
        currentPeriodEnd: m.renewal_period_end ?? null,
        cancelAtPeriodEnd: Boolean(m.cancel_at_period_end),
      });
      break;
    }
    default:
      break;
  }
}
