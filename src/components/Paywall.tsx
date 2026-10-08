import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play, Check, Zap, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  AD_DAILY_LIMIT,
  adsConfigured,
  adsFullscreenFallbackAllowed,
  adsenseConfigured,
  canStartRewardedWatch,
  showRewardedAd,
} from "@/lib/ads";
import { startBillingCheckout } from "@/lib/creem-checkout";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { STRIPE_PLANS, formatPlanPrice, type StripePlanKey } from "@/lib/stripe-plans";
import { formatFlittPlanPrice } from "@/lib/flitt-plans";
import { clientBillingProvider } from "@/lib/whop-plans";
import { AdSenseUnit } from "./AdSenseUnit";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional notice from Stripe return (?checkout=success|cancelled). */
  externalNotice?: string | null;
}

/** Fullscreen watch length when GAM rewarded is unavailable. */
const FALLBACK_WATCH_SECONDS = 30;

export function Paywall({ open, onClose, externalNotice }: Props) {
  const {
    t,
    beginAdWatch,
    claimAdEnergy,
    energy,
    energyUnlimited,
    adsClaimedToday,
    authenticated,
  } = useApp();
  const showHasEnergy = energyUnlimited || energy > 0;
  const billingProvider = clientBillingProvider();
  const checkoutCurrency = "usd" as const;
  const priceOf = (plan: StripePlanKey) =>
    billingProvider === "flitt"
      ? formatFlittPlanPrice(plan)
      : formatPlanPrice(plan, checkoutCurrency);
  const adsLeft = Math.max(0, AD_DAILY_LIMIT - (adsClaimedToday ?? 0));
  const watchAdLabel = t("watchAd")
    .replaceAll("{left}", String(adsLeft))
    .replaceAll("{max}", String(AD_DAILY_LIMIT));

  const [adState, setAdState] = useState<"idle" | "loading" | "playing" | "done">("idle");
  const [countdown, setCountdown] = useState(FALLBACK_WATCH_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [adRefresh, setAdRefresh] = useState(0);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StripePlanKey>("mystic");
  const claimedRef = useRef(false);
  const busyRef = useRef(false);
  const ticketRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearWatchTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetAdSession = () => {
    clearWatchTimer();
    setAdState("idle");
    setCountdown(FALLBACK_WATCH_SECONDS);
    claimedRef.current = false;
    busyRef.current = false;
    ticketRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      resetAdSession();
      setNotice(null);
      setLimitHit(false);
      setCheckoutBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (externalNotice) setNotice(externalNotice);
  }, [externalNotice]);

  useEffect(
    () => () => {
      clearWatchTimer();
    },
    [],
  );

  const finishGrant = () => {
    if (claimedRef.current) return;
    const ticket = ticketRef.current;
    if (!ticket) {
      busyRef.current = false;
      setAdState("idle");
      setNotice(t("adFailed"));
      return;
    }
    claimedRef.current = true;
    clearWatchTimer();
    setAdState("done");
    busyRef.current = false;
    void claimAdEnergy(ticket).then((r) => {
      ticketRef.current = null;
      if (!r.ok) {
        claimedRef.current = false;
        setAdState("idle");
        setLimitHit(Boolean(r.errorKey === "adLimitReached"));
        setNotice(t(r.errorKey ?? "adFailed"));
        return;
      }
      setLimitHit(false);
      setNotice(null);
    });
  };

  const startFullscreenWatch = (ticket: string, seconds: number) => {
    ticketRef.current = ticket;
    setAdRefresh((n) => n + 1);
    setAdState("loading");
    setCountdown(seconds);
    clearWatchTimer();
    // Mount AdSense first, then start the watch once the slot can request.
    window.setTimeout(() => {
      setAdState("playing");
      clearWatchTimer();
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c > 1) return c - 1;
          clearWatchTimer();
          busyRef.current = false;
          queueMicrotask(finishGrant);
          return 0;
        });
      }, 1000);
    }, 1200);
  };

  const dismissFullscreenWatch = () => {
    if (adState !== "playing" && adState !== "loading") return;
    clearWatchTimer();
    busyRef.current = false;
    claimedRef.current = false;
    ticketRef.current = null;
    setAdState("idle");
    setCountdown(FALLBACK_WATCH_SECONDS);
    setNotice(t("adDismissed"));
  };

  const startAd = () => {
    if (limitHit || adState === "done" || busyRef.current) return;
    if (adsLeft <= 0) {
      setLimitHit(true);
      setNotice(t("adLimitReached"));
      return;
    }
    if (!canStartRewardedWatch()) {
      setNotice(t("adNotConfigured"));
      return;
    }
    if (!authenticated) {
      setNotice(t("authRequiredPay"));
      return;
    }
    busyRef.current = true;
    setNotice(null);
    claimedRef.current = false;
    ticketRef.current = null;
    setAdState("loading");

    void (async () => {
      // 1) Prefer GAM true fullscreen rewarded video when configured.
      if (adsConfigured()) {
        const ticketRes = await beginAdWatch("gam");
        if (!ticketRes.ok) {
          busyRef.current = false;
          setAdState("idle");
          if (ticketRes.errorKey === "adLimitReached") {
            setLimitHit(true);
            setNotice(t("adLimitReached"));
          } else {
            setNotice(ticketRes.errorDetail ?? t(ticketRes.errorKey ?? "adFailed"));
          }
          return;
        }
        ticketRef.current = ticketRes.ticket;

        const result = await showRewardedAd();
        if (result.ok) {
          // Server always requires the full watch window before redeem (~28s).
          const waitMs = Math.max(0, ticketRes.minWatchSeconds * 1000 - 500);
          window.setTimeout(() => finishGrant(), waitMs);
          return;
        }
        ticketRef.current = null;
        if (result.error === "dismissed") {
          busyRef.current = false;
          setAdState("idle");
          setNotice(t("adDismissed"));
          return;
        }
        // 2) Fall back to AdSense fullscreen watch (real inventory).
        if (adsFullscreenFallbackAllowed()) {
          const overlayTicket = await beginAdWatch(adsenseConfigured() ? "overlay" : "simulate");
          if (!overlayTicket.ok) {
            busyRef.current = false;
            setAdState("idle");
            setNotice(overlayTicket.errorDetail ?? t(overlayTicket.errorKey ?? "adFailed"));
            return;
          }
          startFullscreenWatch(
            overlayTicket.ticket,
            Math.max(FALLBACK_WATCH_SECONDS, overlayTicket.minWatchSeconds),
          );
          return;
        }
        busyRef.current = false;
        setAdState("idle");
        if (result.error === "no_fill" || result.error === "unsupported") setNotice(t("adNoFill"));
        else setNotice(t("adFailed"));
        return;
      }

      // 2) AdSense (or DEV) fullscreen watch overlay.
      if (adsFullscreenFallbackAllowed()) {
        const overlayTicket = await beginAdWatch(adsenseConfigured() ? "overlay" : "simulate");
        if (!overlayTicket.ok) {
          busyRef.current = false;
          setAdState("idle");
          if (overlayTicket.errorKey === "adLimitReached") {
            setLimitHit(true);
            setNotice(t("adLimitReached"));
          } else {
            setNotice(overlayTicket.errorDetail ?? t(overlayTicket.errorKey ?? "adFailed"));
          }
          return;
        }
        startFullscreenWatch(
          overlayTicket.ticket,
          Math.max(FALLBACK_WATCH_SECONDS, overlayTicket.minWatchSeconds),
        );
        return;
      }

      busyRef.current = false;
      setAdState("idle");
      setNotice(t("adNotConfigured"));
    })();
  };

  const pay = () => {
    if (checkoutBusy) return;
    if (!authenticated) {
      setNotice(t("authRequiredPay"));
      return;
    }
    setNotice(null);
    setCheckoutBusy(true);
    void (async () => {
      const {
        data: { session },
      } = await getSupabaseBrowserClient().auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setCheckoutBusy(false);
        setNotice(t("authRequiredPay"));
        return;
      }
      const result = await startBillingCheckout({
        data: {
          plan: selectedPlan,
          origin: window.location.origin,
          currency: checkoutCurrency,
          accessToken,
        },
      });
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setCheckoutBusy(false);
      setNotice(t(result.errorKey));
    })();
  };

  const plans = [
    {
      key: "topUp" as const,
      title: t("topUp"),
      amount: String(STRIPE_PLANS.topUp.energyGrant),
      unit: t("energy"),
      price: priceOf("topUp"),
      desc: t("topUpDesc"),
      popular: false,
    },
    {
      key: "mystic" as const,
      title: t("mystic"),
      amount: String(STRIPE_PLANS.mystic.dailyCap),
      unit: t("energyPerDay"),
      price: `${priceOf("mystic")}${t("perMonth")}`,
      desc: t("mysticDesc"),
      popular: true,
    },
    {
      key: "ascended" as const,
      title: t("ascended"),
      amount: String(STRIPE_PLANS.ascended.dailyCap),
      unit: t("energyPerDay"),
      price: `${priceOf("ascended")}${t("perMonth")}`,
      desc: t("ascendedDesc"),
      popular: false,
    },
  ];

  const overlayOpen = adState === "loading" || adState === "playing";
  const progress = ((FALLBACK_WATCH_SECONDS - countdown) / FALLBACK_WATCH_SECONDS) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-end justify-center overflow-y-auto overscroll-contain px-0 py-0 sm:items-center sm:px-4 sm:py-6"
          style={{
            background: "oklch(0.05 0.02 305 / 0.82)",
            backdropFilter: "blur(14px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-purple relative my-auto max-h-[100dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[min(92dvh,720px)] sm:rounded-[28px] sm:p-6"
          >
            <button
              onClick={onClose}
              className="glass-dark absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-gold/80"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="text-4xl">{showHasEnergy ? "✨" : "🕯️"}</div>
              <h2 className="mt-2 font-serif text-2xl text-gradient-gold">
                {showHasEnergy ? t("moreEnergy") : t("outOfEnergy")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {showHasEnergy ? t("moreEnergySub") : t("paywallSub")}
              </p>
            </div>

            <div className="mt-6">
              {adState === "done" ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-gold/30 bg-black/20 py-4 text-sm font-semibold text-gold">
                  <span className="flex items-center gap-2">
                    <Check className="h-5 w-5" /> {t("adDone")}
                    <Zap className="h-4 w-4 fill-gold" />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdState("idle");
                      claimedRef.current = false;
                      busyRef.current = false;
                    }}
                    className="text-xs font-medium text-gold/80 underline-offset-2 hover:underline"
                  >
                    {t("watchAdAgain")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startAd}
                  disabled={
                    limitHit || adsLeft <= 0 || adState === "loading" || adState === "playing"
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 py-3.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-4 w-4 fill-gold" /> {watchAdLabel}
                </button>
              )}
            </div>

            {notice && (
              <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-center text-xs text-gold">
                {notice}
              </p>
            )}

            <p className="mt-5 text-center text-xs uppercase tracking-widest text-muted-foreground">
              {t("selectPlanHint")}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {plans.map((p) => {
                const selected = selectedPlan === p.key;
                return (
                  <motion.button
                    key={p.key}
                    type="button"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{ scale: selected ? 1.015 : 1 }}
                    transition={{ type: "spring", stiffness: 360, damping: 26 }}
                    disabled={checkoutBusy}
                    onClick={() => {
                      setSelectedPlan(p.key);
                      setNotice(null);
                    }}
                    aria-pressed={selected}
                    className={`relative flex flex-col overflow-visible rounded-2xl p-4 text-left transition-all disabled:opacity-60 ${
                      selected ? "glass-gold ring-2 ring-gold/55" : "glass-dark hover:gold-border"
                    }`}
                  >
                    {p.popular && !selected && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                      >
                        <span className="sheen-layer" />
                      </span>
                    )}
                    {p.popular && (
                      <span className="mb-2 inline-flex w-fit self-start rounded-full bg-gradient-to-r from-gold to-gold-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-obsidian shadow-[0_6px_18px_-6px_oklch(0.72_0.14_88_/_0.9)]">
                        {t("mostPopular")}
                      </span>
                    )}
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gold/80">
                        {p.title}
                      </span>
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                          selected ? "border-gold bg-gold text-obsidian" : "border-gold/40"
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <motion.span
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="grid place-items-center"
                          >
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </motion.span>
                        ) : null}
                      </span>
                    </span>
                    {p.key === "topUp" ? (
                      <span className="mt-1 flex items-center gap-1.5 font-serif text-3xl text-gradient-gold">
                        <Zap className="h-7 w-7 fill-gold text-gold" aria-hidden />
                        {p.amount}
                      </span>
                    ) : (
                      <>
                        <span className="mt-1 font-serif text-3xl text-gradient-gold">
                          {p.amount}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{p.unit}</span>
                      </>
                    )}
                    <span className="mt-2 font-semibold text-foreground">{p.price}</span>
                    <span className="mt-1 text-[11px] leading-tight text-muted-foreground">
                      {p.desc}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
              {t("payWith")}
            </p>
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={pay}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background:
                  billingProvider === "whop"
                    ? "linear-gradient(135deg,#ff6243,#fa4616)"
                    : billingProvider === "flitt"
                      ? "linear-gradient(135deg,#0ea5e9,#0369a1)"
                      : "linear-gradient(135deg,#0f766e,#14b8a6)",
              }}
            >
              {checkoutBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("stripeRedirecting")}
                </>
              ) : billingProvider === "whop" ? (
                <>
                  💳 {t("payWithWhop")} · {t("stripeWallets")}
                </>
              ) : billingProvider === "flitt" ? (
                <>💳 Flitt · {t("stripeWallets")}</>
              ) : (
                <>💳 Creem · {t("stripeWallets")}</>
              )}
            </button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/80">
              {billingProvider === "whop"
                ? t("whopPayHint")
                : billingProvider === "flitt"
                  ? t("flittPayHint")
                  : t("stripePayHint")}
            </p>
          </motion.div>
        </motion.div>
      )}

      {overlayOpen && (
        <motion.div
          key="rewarded-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={t("watchAd")}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="text-xs font-medium text-white/70">{t("adPlaying")}</p>
            <button
              type="button"
              onClick={dismissFullscreenWatch}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, oklch(0.35 0.12 305 / 0.55), transparent 65%)",
              }}
            />
            <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-4">
              <div className="relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-gold/25 bg-white/95 px-6 py-8 shadow-lg">
                <p className="relative z-10 text-center font-serif text-lg leading-snug text-neutral-800 sm:text-xl">
                  {t("adComingSoon")}
                </p>
                {/* Keep a hidden unit so Google can still verify the site while ads are pending. */}
                {adsenseConfigured() && (
                  <div
                    className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                    aria-hidden
                  >
                    <AdSenseUnit
                      variant="fullscreen"
                      refreshKey={`reward-${adRefresh}`}
                      className="min-h-[250px] w-[300px]"
                    />
                  </div>
                )}
              </div>
              {adState === "loading" ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" />
                  <p className="text-sm text-white/80">{t("adLoading")}</p>
                </div>
              ) : (
                <>
                  <div className="font-serif text-5xl tabular-nums text-gold">{countdown}</div>
                  <p className="text-center text-sm text-white/75">{t("adPlaying")}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-gold transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/45">
            {t("adDismissed")}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
