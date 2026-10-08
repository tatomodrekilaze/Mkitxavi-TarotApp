import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  STRIPE_PLANS,
  unitAmountFor,
  type StripeCurrency,
  type StripePlanKey,
} from "@/lib/stripe-plans";
import type { SubscriptionStatus } from "@/lib/supabase/types";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env from the Stripe Dashboard.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function priceIdForPlan(plan: StripePlanKey): string | undefined {
  const envKey =
    plan === "topUp"
      ? "STRIPE_PRICE_TOPUP"
      : plan === "mystic"
        ? "STRIPE_PRICE_MYSTIC"
        : "STRIPE_PRICE_ASCENDED";
  const id = process.env[envKey]?.trim();
  return id || undefined;
}

function lineItemsForPlan(
  plan: StripePlanKey,
  currency: StripeCurrency,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const def = STRIPE_PLANS[plan];
  // Fixed Price IDs in env override inline amounts (USD only).
  const priceId = priceIdForPlan(plan);
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }

  const unit_amount = unitAmountFor(plan, "usd");
  void currency;

  if (def.mode === "subscription") {
    return [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount,
          recurring: { interval: "month" },
          product_data: {
            name: def.productName,
            description: def.productDescription,
          },
        },
      },
    ];
  }

  return [
    {
      quantity: 1,
      price_data: {
        currency,
        unit_amount,
        product_data: {
          name: def.productName,
          description: def.productDescription,
        },
      },
    },
  ];
}

async function ensureCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  });

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      status: "none",
      plan: "none",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return customer.id;
}

export async function createCheckoutSession(input: {
  userId: string;
  email: string | undefined;
  plan: StripePlanKey;
  origin: string;
  currency: StripeCurrency;
}): Promise<{ url: string }> {
  const def = STRIPE_PLANS[input.plan];
  const stripe = getStripe();
  const customerId = await ensureCustomer(input.userId, input.email);
  const origin = input.origin.replace(/\/$/, "");
  const currency = input.currency;

  const session = await stripe.checkout.sessions.create({
    mode: def.mode,
    customer: customerId,
    client_reference_id: input.userId,
    line_items: lineItemsForPlan(input.plan, currency),
    success_url: `${origin}/?checkout=success&plan=${input.plan}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    // Card + Apple Pay + Google Pay (when wallets are available for the domain).
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: input.userId,
      plan: input.plan,
      currency,
    },
    subscription_data:
      def.mode === "subscription"
        ? {
            metadata: {
              supabase_user_id: input.userId,
              plan: input.plan,
              currency,
            },
          }
        : undefined,
    payment_intent_data:
      def.mode === "payment"
        ? {
            metadata: {
              supabase_user_id: input.userId,
              plan: input.plan,
            },
          }
        : undefined,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a URL.");
  }
  return { url: session.url };
}

export async function createBillingPortalSession(input: {
  userId: string;
  origin: string;
}): Promise<{ url: string }> {
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row?.stripe_customer_id) {
    throw new Error("No Stripe customer yet. Buy a plan first.");
  }

  const stripe = getStripe();
  const origin = input.origin.replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: origin,
  });
  return { url: session.url };
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
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
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
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
      stripe_customer_id: fields.stripeCustomerId ?? undefined,
      stripe_subscription_id: fields.stripeSubscriptionId ?? undefined,
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
  metadata?: Stripe.Metadata | null;
  clientReferenceId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  const fromMeta = opts.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;
  if (opts.clientReferenceId) return opts.clientReferenceId;

  if (opts.customerId) {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    return data?.user_id ?? null;
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = await resolveUserId({
    metadata: session.metadata,
    clientReferenceId: session.client_reference_id,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
  });
  if (!userId) {
    console.error("Stripe checkout: missing user id", session.id);
    return;
  }

  // Resolve plan from paid Stripe price IDs only (never trust metadata.plan alone).
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 3 });
  const priceId = lineItems.data[0]?.price?.id ?? null;
  const planKey =
    (priceId === process.env.STRIPE_PRICE_ASCENDED
      ? "ascended"
      : priceId === process.env.STRIPE_PRICE_MYSTIC
        ? "mystic"
        : priceId === process.env.STRIPE_PRICE_TOPUP
          ? "topUp"
          : null) ?? "topUp";
  const def = STRIPE_PLANS[planKey];
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (session.mode === "payment") {
    if (def.subscriptionPlan === "ascended") {
      await upsertSubscription({
        userId,
        status: "active",
        plan: "ascended",
        stripeCustomerId: customerId,
        priceId: null,
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
        stripeCustomerId: customerId,
      });
    }
    return;
  }

  // Subscription checkout, detailed sync also comes from subscription events.
  const subId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (subId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    await syncSubscription(sub, userId, planKey);
    // Mystic energy is granted on invoice.paid (including the first invoice).
  }
}

async function syncSubscription(
  sub: Stripe.Subscription,
  userIdHint?: string | null,
  planHint?: StripePlanKey | null,
) {
  const userId =
    userIdHint ||
    (await resolveUserId({
      metadata: sub.metadata,
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    }));
  if (!userId) {
    console.error("Stripe subscription: missing user id", sub.id);
    return;
  }

  const planKey = planHint || (await planFromPrice(sub)) || "mystic";
  const def = STRIPE_PLANS[planKey];
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  await upsertSubscription({
    userId,
    status: mapStripeStatus(sub.status),
    plan: sub.status === "canceled" ? "none" : def.subscriptionPlan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    priceId,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  });
}

async function planFromPrice(sub: Stripe.Subscription): Promise<StripePlanKey | null> {
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MYSTIC) return "mystic";
  if (priceId === process.env.STRIPE_PRICE_ASCENDED) return "ascended";
  if (priceId === process.env.STRIPE_PRICE_TOPUP) return "topUp";
  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const userId = await resolveUserId({
    metadata: invoice.metadata,
    customerId,
  });
  if (!userId) return;

  // Prefer subscription metadata plan; fall back to our subscriptions row.
  let plan: StripePlanKey | "none" | null = null;
  const subRef = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
    .subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  if (subId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    plan = await planFromPrice(sub);
    await syncSubscription(sub, userId, plan);
  }

  if (!plan) {
    const admin = getSupabaseAdminClient();
    const { data: row } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    plan = row?.plan ?? null;
  }

  if (plan === "mystic") {
    await grantEnergy(userId, STRIPE_PLANS.mystic.energyGrant);
  }
}

async function claimEvent(eventId: string, type: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({
    id: eventId,
    type,
  });
  if (error) {
    // Duplicate primary key → already processed
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  const firstTime = await claimEvent(event.id, event.type);
  if (!firstTime) return;

  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.paid": {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    }
    default:
      break;
  }
}
