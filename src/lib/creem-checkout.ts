import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseUserClient } from "@/lib/supabase/admin";
import {
  createCreemBillingPortal,
  createCreemCheckout,
  isCreemConfigured,
} from "@/lib/creem.server";
import {
  createFlittBillingPortal,
  createFlittCheckout,
  isFlittConfigured,
} from "@/lib/flitt.server";
import {
  createBillingPortalSession,
  createCheckoutSession,
  isStripeConfigured,
} from "@/lib/stripe.server";
import { createWhopBillingPortal, createWhopCheckout, isWhopConfigured } from "@/lib/whop.server";

const CheckoutInput = z.object({
  plan: z.enum(["topUp", "mystic", "ascended"]),
  origin: z.string().url().max(300),
  /** Kept for Stripe fallback; Flitt uses GEL. */
  currency: z.enum(["usd"]).default("usd"),
  /** Browser auth lives in localStorage - pass the access token explicitly. */
  accessToken: z.string().min(20).max(4000),
});

const PortalInput = z.object({
  origin: z.string().url().max(300),
  accessToken: z.string().min(20).max(4000),
});

export type BillingActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      errorKey:
        | "stripeNotConfigured"
        | "authRequiredPay"
        | "stripeFailed"
        | "billingNoSubscription";
      detail?: string;
    };

async function resolveUser(accessToken: string) {
  const supabase = getSupabaseUserClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}

/** Whop → Flitt → Creem → Stripe. */
export const startBillingCheckout = createServerFn({ method: "POST" })
  .validator(CheckoutInput)
  .handler(async ({ data }): Promise<BillingActionResult> => {
    const user = await resolveUser(data.accessToken);
    if (!user) {
      return { ok: false, errorKey: "authRequiredPay" };
    }

    if (isWhopConfigured()) {
      try {
        const { url } = await createWhopCheckout({
          userId: user.id,
          email: user.email,
          plan: data.plan,
          origin: data.origin,
        });
        return { ok: true, url };
      } catch (err) {
        console.error("Whop checkout error", err);
        return {
          ok: false,
          errorKey: "stripeFailed",
          detail: err instanceof Error ? err.message : undefined,
        };
      }
    }

    if (isFlittConfigured()) {
      try {
        const { url } = await createFlittCheckout({
          userId: user.id,
          email: user.email,
          plan: data.plan,
          origin: data.origin,
        });
        return { ok: true, url };
      } catch (err) {
        console.error("Flitt checkout error", err);
        return {
          ok: false,
          errorKey: "stripeFailed",
          detail: err instanceof Error ? err.message : undefined,
        };
      }
    }

    if (isCreemConfigured()) {
      try {
        const { url } = await createCreemCheckout({
          userId: user.id,
          email: user.email,
          plan: data.plan,
          origin: data.origin,
        });
        return { ok: true, url };
      } catch (err) {
        console.error("Creem checkout error", err);
        return {
          ok: false,
          errorKey: "stripeFailed",
          detail: err instanceof Error ? err.message : undefined,
        };
      }
    }

    if (!isStripeConfigured()) {
      return { ok: false, errorKey: "stripeNotConfigured" };
    }

    try {
      const { url } = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        plan: data.plan,
        origin: data.origin,
        currency: data.currency,
      });
      return { ok: true, url };
    } catch (err) {
      console.error("Stripe checkout error", err);
      return {
        ok: false,
        errorKey: "stripeFailed",
        detail: err instanceof Error ? err.message : undefined,
      };
    }
  });

export const startBillingPortal = createServerFn({ method: "POST" })
  .validator(PortalInput)
  .handler(async ({ data }): Promise<BillingActionResult> => {
    const user = await resolveUser(data.accessToken);
    if (!user) {
      return { ok: false, errorKey: "authRequiredPay" };
    }
    return runPortal(user.id, data.origin);
  });

async function runPortal(userId: string, origin: string): Promise<BillingActionResult> {
  if (isWhopConfigured()) {
    try {
      const { url } = await createWhopBillingPortal({ userId });
      return { ok: true, url };
    } catch (err) {
      console.error("Whop portal error", err);
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      return {
        ok: false,
        errorKey: code === "billingNoSubscription" ? "billingNoSubscription" : "stripeFailed",
        detail: err instanceof Error ? err.message : undefined,
      };
    }
  }

  if (isFlittConfigured()) {
    try {
      const { url } = await createFlittBillingPortal({
        userId,
        origin,
      });
      return { ok: true, url };
    } catch (err) {
      console.error("Flitt portal error", err);
      return {
        ok: false,
        errorKey: "stripeFailed",
        detail: err instanceof Error ? err.message : undefined,
      };
    }
  }

  if (isCreemConfigured()) {
    try {
      const { url } = await createCreemBillingPortal({ userId });
      return { ok: true, url };
    } catch (err) {
      console.error("Creem portal error", err);
      return {
        ok: false,
        errorKey: "stripeFailed",
        detail: err instanceof Error ? err.message : undefined,
      };
    }
  }

  if (!isStripeConfigured()) {
    return { ok: false, errorKey: "stripeNotConfigured" };
  }

  try {
    const { url } = await createBillingPortalSession({
      userId,
      origin,
    });
    return { ok: true, url };
  } catch (err) {
    console.error("Stripe portal error", err);
    return {
      ok: false,
      errorKey: "stripeFailed",
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}
