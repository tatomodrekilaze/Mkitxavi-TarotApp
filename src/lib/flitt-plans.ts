import type { StripePlanKey } from "@/lib/stripe-plans";

/** GEL tetri (1 GEL = 100 tetri). Shared client + server. */
export const FLITT_PLAN_AMOUNT_TETRI: Record<StripePlanKey, number> = {
  topUp: 550, // ₾5.50
  mystic: 3999, // ₾39.99 / month
  ascended: 10999, // ₾109.99 one-time
};

export function formatFlittPlanPrice(plan: StripePlanKey): string {
  const tetri = FLITT_PLAN_AMOUNT_TETRI[plan];
  return `₾${(tetri / 100).toFixed(2)}`;
}

/** Client hint for paywall copy. Server still decides the real processor. */
export function clientBillingProvider(): "whop" | "flitt" | "creem" | "stripe" {
  const raw = (import.meta.env.VITE_BILLING_PROVIDER || "whop").toLowerCase();
  if (raw === "flitt" || raw === "creem" || raw === "stripe") return raw;
  return "whop";
}
