import type { StripePlanKey } from "@/lib/stripe-plans";

/** Public Whop product checkout pages (fallback display / docs). */
export const WHOP_PRODUCT_URLS: Record<StripePlanKey, string> = {
  topUp: "https://whop.com/mkitxavi/50-energy/",
  mystic: "https://whop.com/mkitxavi/30-mystic/",
  ascended: "https://whop.com/mkitxavi/150-ascended/",
};

/** Client hint for paywall copy. Server still decides the real processor. */
export function clientBillingProvider(): "whop" | "flitt" | "creem" | "stripe" {
  const raw = (import.meta.env.VITE_BILLING_PROVIDER || "whop").toLowerCase();
  if (raw === "flitt" || raw === "creem" || raw === "stripe") return raw;
  return "whop";
}
