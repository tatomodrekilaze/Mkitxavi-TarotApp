import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createBillingPortalSession,
  createCheckoutSession,
  isStripeConfigured,
} from "@/lib/stripe.server";

const CheckoutInput = z.object({
  plan: z.enum(["topUp", "mystic", "ascended"]),
  origin: z.string().url().max(300),
  /** USD only (Creem / Stripe catalogue is dollar-priced). */
  currency: z.enum(["usd"]).default("usd"),
});

const PortalInput = z.object({
  origin: z.string().url().max(300),
});

export type StripeActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      errorKey: "stripeNotConfigured" | "authRequired" | "stripeFailed";
      detail?: string;
    };

export const startStripeCheckout = createServerFn({ method: "POST" })
  .validator(CheckoutInput)
  .handler(async ({ data }): Promise<StripeActionResult> => {
    if (!isStripeConfigured()) {
      return { ok: false, errorKey: "stripeNotConfigured" };
    }

    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, errorKey: "authRequired" };
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

export const startStripeBillingPortal = createServerFn({ method: "POST" })
  .validator(PortalInput)
  .handler(async ({ data }): Promise<StripeActionResult> => {
    if (!isStripeConfigured()) {
      return { ok: false, errorKey: "stripeNotConfigured" };
    }

    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, errorKey: "authRequired" };
    }

    try {
      const { url } = await createBillingPortalSession({
        userId: user.id,
        origin: data.origin,
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
  });
