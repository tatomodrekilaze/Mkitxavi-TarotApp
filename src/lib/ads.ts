/** Rewarded ads use Google Ad Manager. AdSense and a development countdown are optional. */

type Gpt = {
  cmd: Array<() => void>;
  defineOutOfPageSlot: (adUnitPath: string, format: unknown) => RewardedSlot | null;
  enums?: { OutOfPageFormat?: { REWARDED: unknown } };
  pubads: () => {
    addEventListener: (event: string, handler: (e: RewardedEvent) => void) => void;
  };
  enableServices: () => void;
  display: (slot: RewardedSlot) => void;
  destroySlots: (slots: RewardedSlot[]) => void;
};

declare global {
  interface Window {
    googletag?: Gpt;
  }
}

interface RewardedSlot {
  addService: (service: unknown) => RewardedSlot;
}

interface RewardedEvent {
  makeRewardedVisible?: () => void;
}

const GPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";

export type RewardedAdResult =
  | { ok: true; source: "gam" | "simulate" }
  | {
      ok: false;
      error: "not_configured" | "unsupported" | "no_fill" | "dismissed" | "load_failed";
    };

/** Matches server begin_ad_watch / claim_ad_energy max_per_day. */
export const AD_DAILY_LIMIT = 5;

/** True when Google Ad Manager rewarded video unit is set. */
export function adsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GAM_REWARDED_AD_UNIT?.trim());
}

export function adsenseClientId(): string | undefined {
  const id = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
  return id || undefined;
}

/** Display ad unit from AdSense code generator. */
export function adsenseSlotId(): string | undefined {
  const slot = import.meta.env.VITE_ADSENSE_SLOT?.trim();
  // Fallback matches the live Watch Ad unit so prod still works if env is missing at build.
  return slot || undefined;
}

export function adsenseConfigured(): boolean {
  return Boolean(adsenseClientId() && adsenseSlotId());
}

/** Any live monetization path ready (GAM or AdSense). */
export function adsLiveReady(): boolean {
  return adsConfigured() || adsenseConfigured();
}

/** Inject AdSense bootstrap so Google can verify the site and serve units. */
export function loadAdSenseScript(): void {
  if (typeof document === "undefined") return;
  const client = adsenseClientId();
  if (!client) return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  if (document.querySelector(`script[src*="adsbygoogle.js"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

/** Dev-only empty countdown when no ad network is configured. */
export function adsAllowSimulate(): boolean {
  if (import.meta.env.VITE_ADS_SIMULATE === "true") return true;
  if (import.meta.env.VITE_ADS_SIMULATE === "false") return false;
  return Boolean(import.meta.env.DEV);
}

/**
 * Fullscreen watch overlay (AdSense or empty countdown).
 * Disabled only when VITE_ADS_SIMULATE=false and AdSense is also missing.
 */
export function adsFullscreenFallbackAllowed(): boolean {
  if (import.meta.env.VITE_ADS_SIMULATE === "false" && !adsenseConfigured()) return false;
  return adsenseConfigured() || adsAllowSimulate();
}

/** Can the Watch Ad button start a session? */
export function canStartRewardedWatch(): boolean {
  return adsConfigured() || adsFullscreenFallbackAllowed();
}

function ensureGpt(): Gpt {
  if (!window.googletag) {
    window.googletag = { cmd: [] } as unknown as Gpt;
  }
  if (!window.googletag.cmd) {
    window.googletag.cmd = [];
  }
  return window.googletag;
}

function loadGpt(): Promise<Gpt> {
  const tag = ensureGpt();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GPT_SRC}"]`);
    if (existing) {
      resolve(tag);
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.src = GPT_SRC;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve(ensureGpt());
    s.onerror = () => reject(new Error("gpt_load_failed"));
    document.head.appendChild(s);
  });
}

/** Preload GPT on app start when a rewarded unit is configured. */
export function preloadRewardedAds(): void {
  if (typeof window === "undefined") return;
  loadAdSenseScript();
  if (!adsConfigured()) return;
  void loadGpt().catch(() => undefined);
}

/**
 * Show a GAM rewarded ad. Resolves ok only after rewardedSlotGranted
 * (user watched enough to earn). Closed early → dismissed.
 */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  const adUnit = import.meta.env.VITE_GAM_REWARDED_AD_UNIT?.trim();

  if (!adUnit) {
    return { ok: false, error: "not_configured" };
  }

  let googletag: Gpt;
  try {
    googletag = await loadGpt();
  } catch {
    return { ok: false, error: "load_failed" };
  }

  return new Promise((resolve) => {
    let slot: RewardedSlot | null = null;
    let granted = false;
    let settled = false;
    let ready = false;

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      try {
        if (slot) googletag.destroySlots([slot]);
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const fillTimer = window.setTimeout(() => {
      if (!settled && !ready) finish({ ok: false, error: "no_fill" });
    }, 15_000);

    googletag.cmd.push(() => {
      const format = googletag.enums?.OutOfPageFormat?.REWARDED;
      if (format == null) {
        window.clearTimeout(fillTimer);
        finish({ ok: false, error: "unsupported" });
        return;
      }

      slot = googletag.defineOutOfPageSlot(adUnit, format);
      if (!slot) {
        window.clearTimeout(fillTimer);
        finish({ ok: false, error: "unsupported" });
        return;
      }

      slot.addService(googletag.pubads());

      googletag.pubads().addEventListener("rewardedSlotReady", (event: RewardedEvent) => {
        ready = true;
        window.clearTimeout(fillTimer);
        try {
          event.makeRewardedVisible?.();
        } catch {
          finish({ ok: false, error: "no_fill" });
        }
      });

      googletag.pubads().addEventListener("rewardedSlotGranted", () => {
        granted = true;
      });

      googletag.pubads().addEventListener("rewardedSlotClosed", () => {
        window.clearTimeout(fillTimer);
        if (granted) finish({ ok: true, source: "gam" });
        else finish({ ok: false, error: "dismissed" });
      });

      googletag.enableServices();
      googletag.display(slot);
    });
  });
}

export function adsTxtBody(): string {
  const raw = adsenseClientId();
  if (!raw) return "# No advertising account configured.\n";
  const pub = raw.replace(/^ca-pub-/, "");
  return [
    `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0`,
    "# https://support.google.com/adsense/answer/7532444",
  ].join("\n");
}
