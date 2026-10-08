export interface ObserverLocation {
  /** IANA timezone, e.g. Asia/Tbilisi */
  timeZone: string;
  country: string;
  countryCode: string;
  city: string;
  /** How the location was resolved. */
  source: "ip" | "timezone";
}

const CACHE_KEY = "mkitxavi.observer.v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

type Cached = ObserverLocation & { at: number };

function browserFallback(): ObserverLocation {
  const timeZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC";
  return {
    timeZone,
    country: "",
    countryCode: "",
    city: "",
    source: "timezone",
  };
}

function readCache(): ObserverLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.timeZone || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    const { at: _at, ...loc } = parsed;
    return loc;
  } catch {
    return null;
  }
}

function writeCache(loc: ObserverLocation) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...loc, at: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Resolve where the visitor is observing from.
 * Prefer IP → country/timezone (geojs, free + CORS), fall back to the device timezone.
 */
export async function resolveObserverLocation(): Promise<ObserverLocation> {
  const cached = readCache();
  if (cached) return cached;

  const fallback = browserFallback();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      writeCache(fallback);
      return fallback;
    }
    const data = (await res.json()) as {
      country?: string;
      country_code?: string;
      city?: string;
      timezone?: string;
    };

    const loc: ObserverLocation = {
      timeZone: data.timezone?.trim() || fallback.timeZone,
      country: data.country?.trim() || "",
      countryCode: (data.country_code || "").toUpperCase(),
      city: data.city?.trim() || "",
      source: data.timezone ? "ip" : "timezone",
    };
    writeCache(loc);
    return loc;
  } catch {
    writeCache(fallback);
    return fallback;
  }
}

/** Wall-clock parts for an absolute instant in a given IANA timezone. */
export function localParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Approximate the UTC Date that corresponds to a civil local datetime in `timeZone`.
 * Used so moon phase is evaluated at the observer's local "now", not a wrong device clock.
 */
export function instantFromLocal(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
): Date {
  // Start with a UTC guess, then correct by the timezone offset at that guess.
  let guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  for (let i = 0; i < 3; i++) {
    const asLocal = localParts(new Date(guess), timeZone);
    const asLocalMs = Date.UTC(
      asLocal.year,
      asLocal.month - 1,
      asLocal.day,
      asLocal.hour,
      asLocal.minute,
      asLocal.second,
    );
    const wantedMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    guess += wantedMs - asLocalMs;
  }
  return new Date(guess);
}
