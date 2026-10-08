import type { LocaleCode } from "./i18n";
import {
  instantFromLocal,
  localParts,
  type ObserverLocation,
  resolveObserverLocation,
} from "./geo";

export interface MoonInfo {
  /** Synodic phase 0..1 (0 = new, 0.5 = full). */
  phase: number;
  /** Age of the current cycle in days. */
  ageDays: number;
  illumination: number; // 0..100
  key: string;
  emoji: string;
  names: Record<LocaleCode, string>;
  /** Observer context used for the calculation. */
  timeZone: string;
  country: string;
  countryCode: string;
  city: string;
  /** Local civil time string HH:MM in the observer timezone. */
  localTime: string;
  localDate: string;
}

const PHASES: { key: string; emoji: string; names: Record<LocaleCode, string> }[] = [
  {
    key: "new",
    emoji: "🌑",
    names: { en: "New Moon", ka: "ახალმთვარეობა", ru: "Новолуние" },
  },
  {
    key: "waxing-crescent",
    emoji: "🌒",
    names: {
      en: "Waxing Crescent",
      ka: "მზარდი ნამგალი",
      ru: "Растущий серп",
    },
  },
  {
    key: "first-quarter",
    emoji: "🌓",
    names: {
      en: "First Quarter",
      ka: "პირველი მეოთხედი",
      ru: "Первая четверть",
    },
  },
  {
    key: "waxing-gibbous",
    emoji: "🌔",
    names: {
      en: "Waxing Gibbous",
      ka: "მზარდი მთვარე",
      ru: "Растущая луна",
    },
  },
  {
    key: "full",
    emoji: "🌕",
    names: { en: "Full Moon", ka: "სავსემთვარეობა", ru: "Полнолуние" },
  },
  {
    key: "waning-gibbous",
    emoji: "🌖",
    names: {
      en: "Waning Gibbous",
      ka: "კლებადი მთვარე",
      ru: "Убывающая луна",
    },
  },
  {
    key: "last-quarter",
    emoji: "🌗",
    names: {
      en: "Last Quarter",
      ka: "ბოლო მეოთხედი",
      ru: "Последняя четверть",
    },
  },
  {
    key: "waning-crescent",
    emoji: "🌘",
    names: {
      en: "Waning Crescent",
      ka: "კლებადი ნამგალი",
      ru: "Убывающий серп",
    },
  },
];

/** Mean synodic month (days). */
const SYNODIC = 29.530588853;
/** Reference new moon: 2000-01-06 18:14:00 UTC (Meeus). */
const KNOWN_NEW_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

function phaseIndex(phase: number): number {
  // Eight equal bins centered on each named phase.
  return Math.floor(((phase + 1 / 16) % 1) * 8) % 8;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Astronomical moon phase for an absolute Instant.
 * Illumination uses the cosine of the phase angle (same worldwide at one Instant).
 */
export function getMoonPhaseAt(
  date: Date,
): Pick<MoonInfo, "phase" | "ageDays" | "illumination" | "key" | "emoji" | "names"> {
  const days = (date.getTime() - KNOWN_NEW_MS) / 86400000;
  let age = days % SYNODIC;
  if (age < 0) age += SYNODIC;

  const phase = age / SYNODIC;
  // Fraction of the disc illuminated (0 at new, 100 at full).
  const illumination = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100);
  const p = PHASES[phaseIndex(phase)];

  return { phase, ageDays: Math.round(age * 10) / 10, illumination, ...p };
}

export function getMoonPhase(date = new Date()): MoonInfo {
  const base = getMoonPhaseAt(date);
  return {
    ...base,
    timeZone: "UTC",
    country: "",
    countryCode: "",
    city: "",
    localTime: "",
    localDate: "",
  };
}

/**
 * Moon as seen for a resolved observer: IP → country/timezone → local civil now → phase.
 * Falls back to the device timezone if geolocation is unavailable.
 */
export function getMoonPhaseForObserver(observer: ObserverLocation, now = new Date()): MoonInfo {
  // Read wall-clock "now" in their country timezone, then convert back to an Instant.
  // This keeps the phase tied to local civil time even if the device clock/zone is wrong.
  const parts = localParts(now, observer.timeZone);
  const instant = instantFromLocal(parts, observer.timeZone);
  const base = getMoonPhaseAt(instant);

  return {
    ...base,
    timeZone: observer.timeZone,
    country: observer.country,
    countryCode: observer.countryCode,
    city: observer.city,
    localTime: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
    localDate: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
  };
}

/** Resolve IP location then compute the localized moon. */
export async function resolveMoonPhase(now = new Date()): Promise<MoonInfo> {
  const observer = await resolveObserverLocation();
  return getMoonPhaseForObserver(observer, now);
}
