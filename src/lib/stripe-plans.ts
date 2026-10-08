/** Shared plan catalog (client + server). Amounts are USD cents. */

export type StripePlanKey = "topUp" | "mystic" | "ascended";
export type StripeCurrency = "usd";

export type StripePlanDef = {
  key: StripePlanKey;
  mode: "payment" | "subscription";
  /** One-time energy grant (top-up packs). Subscriptions use dailyCap instead. */
  energyGrant: number;
  /** Calendar-day energy allowance while the plan is active. Free tier uses 5. */
  dailyCap: number;
  /** Stored on subscriptions.plan. */
  subscriptionPlan: "none" | "mystic" | "ascended";
  /** USD cents. */
  unitAmountUsd: number;
  productName: string;
  productDescription: string;
};

export const STRIPE_PLANS: Record<StripePlanKey, StripePlanDef> = {
  topUp: {
    key: "topUp",
    mode: "payment",
    energyGrant: 50,
    dailyCap: 5,
    subscriptionPlan: "none",
    unitAmountUsd: 350,
    productName: "50 Energy ენერგია",
    productDescription: "One-time pack of 50 energy for readings with Maria.",
  },
  mystic: {
    key: "mystic",
    mode: "subscription",
    energyGrant: 0,
    dailyCap: 30,
    subscriptionPlan: "mystic",
    unitAmountUsd: 1899,
    productName: "Mystic Plan მისტიური გეგმა",
    productDescription: "30 energy every day + Photo Upload. Auto-renewing monthly until canceled.",
  },
  ascended: {
    key: "ascended",
    mode: "subscription",
    energyGrant: 0,
    dailyCap: 150,
    subscriptionPlan: "ascended",
    unitAmountUsd: 3599,
    productName: "Ascended Plan ამაღლებული გეგმა",
    productDescription:
      "150 energy every day + Photo Upload. Auto-renewing monthly until canceled.",
  },
};

export function isStripePlanKey(value: string): value is StripePlanKey {
  return value === "topUp" || value === "mystic" || value === "ascended";
}

export function isStripeCurrency(value: string): value is StripeCurrency {
  return value === "usd";
}

/** Display prices for the paywall UI (USD). */
export function formatPlanPrice(plan: StripePlanKey, _currency: StripeCurrency = "usd"): string {
  const major = (STRIPE_PLANS[plan].unitAmountUsd / 100).toFixed(2);
  return `$${major}`;
}

export function unitAmountFor(plan: StripePlanKey, _currency: StripeCurrency = "usd"): number {
  return STRIPE_PLANS[plan].unitAmountUsd;
}
