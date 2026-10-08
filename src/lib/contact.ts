/** Contact addresses for this deployment. Set both before opening a public instance. */
export const BUSINESS_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL?.trim() || "business@example.com";
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "support@example.com";

export function mailtoSupport(subject?: string): string {
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${SUPPORT_EMAIL}${q}`;
}

export function mailtoBusiness(subject?: string): string {
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${BUSINESS_EMAIL}${q}`;
}
