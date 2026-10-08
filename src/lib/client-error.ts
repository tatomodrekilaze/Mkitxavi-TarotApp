/** Generic client error hook - no third-party / builder branding. */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) {
    console.error("[client-error]", error, context);
  }
}
