import disposableDomains from "@/lib/disposable-email-domains.json";

const BLOCKED = new Set(
  (disposableDomains as string[]).map((d) => d.trim().toLowerCase()).filter(Boolean),
);

/** Extra / freshly seen disposable hosts not yet in the vendored dump. */
const EXTRA_BLOCKED = new Set(["netiren.com"]);

for (const d of EXTRA_BLOCKED) BLOCKED.add(d);

/** Extract the domain from an email (lowercased). */
export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).replace(/^\.+|\.+$/g, "");
  if (!domain.includes(".")) return null;
  return domain;
}

function domainInBlocklist(domain: string): boolean {
  if (BLOCKED.has(domain)) return true;
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i += 1) {
    const suffix = parts.slice(i).join(".");
    if (BLOCKED.has(suffix)) return true;
  }
  return false;
}

/**
 * Sync check against the local disposable domain list.
 * Prefer {@link checkDisposableEmail} at signup — temp-mail hosts rotate domains.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return domainInBlocklist(domain);
}

export type DisposableCheckResult = {
  disposable: boolean;
  domain: string | null;
  source: "local" | "mailcheck" | "debounce" | "none";
};

async function fetchJson(url: string, ms = 2500): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

/**
 * Local list first, then live detectors (mailcheck.ai + debounce) so rotating
 * temp-mail domains like netiren.com are caught even when absent from the dump.
 */
export async function checkDisposableEmail(email: string): Promise<DisposableCheckResult> {
  const domain = emailDomain(email);
  if (!domain) return { disposable: false, domain: null, source: "none" };

  if (domainInBlocklist(domain)) {
    return { disposable: true, domain, source: "local" };
  }

  const [mailcheck, debounce] = await Promise.all([
    fetchJson(`https://api.mailcheck.ai/domain/${encodeURIComponent(domain)}`),
    fetchJson(`https://disposable.debounce.io/?email=${encodeURIComponent(email.trim())}`),
  ]);

  if (mailcheck && truthyFlag(mailcheck.disposable)) {
    BLOCKED.add(domain);
    return { disposable: true, domain, source: "mailcheck" };
  }
  if (debounce && truthyFlag(debounce.disposable)) {
    BLOCKED.add(domain);
    return { disposable: true, domain, source: "debounce" };
  }

  return { disposable: false, domain, source: "none" };
}
