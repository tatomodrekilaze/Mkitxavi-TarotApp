import type { User } from "@supabase/supabase-js";

function looksLikeEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** True when a display name is just an email address (common signup mistake / leak). */
export function looksLikeEmailAddress(value: string | null | undefined): boolean {
  return looksLikeEmail(value?.trim() ?? "");
}

/**
 * True when Google/Facebook gave us a real mailbox we can trust as verified.
 *
 * Email/password accounts are NOT auto-trusted here: our signup trigger sets
 * auth.users.email_confirmed_at so people can log in immediately, but
 * profiles.email_verified must stay false until they open a real verify link
 * (callback with ?verify=1 or type=signup/email_change).
 */
export function hasTrustedOAuthEmail(user: User | null | undefined): boolean {
  if (!user) return false;
  const accountEmail = user.email?.trim() ?? "";
  const identities = user.identities ?? [];
  const providers = identities.map((i) => i.provider);

  if (providers.includes("google")) {
    const google = identities.find((i) => i.provider === "google");
    const googleEmail = (google?.identity_data as { email?: unknown } | undefined)?.email;
    return looksLikeEmail(googleEmail) || looksLikeEmail(accountEmail);
  }

  if (providers.includes("facebook")) {
    // Phone-only Meta signups usually have no user.email at all.
    return looksLikeEmail(accountEmail);
  }

  return false;
}

export function hasAccountEmail(user: User | null | undefined): boolean {
  return looksLikeEmail(user?.email);
}
