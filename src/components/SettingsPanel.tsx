import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Volume2,
  VolumeX,
  X,
  Check,
  LogOut,
  Camera,
  Loader2,
  Mail,
  UserRound,
  Lock,
  LifeBuoy,
  MessageSquareHeart,
  Clock3,
  CreditCard,
  Zap,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LANGUAGES } from "@/lib/i18n";
import { useApp } from "@/context/AppContext";
import { startBillingPortal } from "@/lib/creem-checkout";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { STRIPE_PLANS, formatPlanPrice } from "@/lib/stripe-plans";
import { SocialLinks } from "@/components/SocialLinks";

const VERIFY_PENDING_KEY = "mkitxavi_email_verify_pending";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenPaywall?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SettingsPanel({ open, onClose, onOpenPaywall }: Props) {
  const {
    lang,
    setLang,
    muted,
    setMuted,
    sub,
    subPlan,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    whopManageUrl,
    user,
    email,
    emailVerified,
    emailVerifyPending,
    authenticated,
    signOut,
    updateDisplayName,
    updateEmail,
    resendEmailVerification,
    updateAvatar,
    changePassword,
    refreshWallet,
    t,
  } = useApp();

  const fileRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState(user.name);
  const [emailDraft, setEmailDraft] = useState(email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [busy, setBusy] = useState<
    "name" | "email" | "avatar" | "password" | "verify" | "billing" | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  /** Local optimistic latch so the UI never snaps back while the request runs. */
  const [verifyLatch, setVerifyLatch] = useState(false);
  const wasOpen = useRef(false);

  const hasPaidPlan =
    (sub === "active" || sub === "trialing" || sub === "past_due") &&
    (subPlan === "mystic" || subPlan === "ascended");
  const planDef =
    subPlan === "ascended"
      ? STRIPE_PLANS.ascended
      : subPlan === "mystic"
        ? STRIPE_PLANS.mystic
        : null;

  const hasEmail = Boolean(email && EMAIL_RE.test(email));
  const verifyPending = !emailVerified && (emailVerifyPending || verifyLatch);

  // Reset drafts only when the panel opens, not on every profile tick.
  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setNameDraft(user.name.includes("@") ? "" : user.name);
    setEmailDraft(email ?? "");
    setCurrentPassword("");
    setNextPassword("");
    setError(null);
    setBillingError(null);
    setBusy(null);
  }, [open, user.name, email]);

  useEffect(() => {
    if (!emailVerified) return;
    setVerifyLatch(false);
    try {
      localStorage.removeItem(VERIFY_PENDING_KEY);
    } catch {
      /* ignore */
    }
  }, [emailVerified]);

  // After the user opens the magic link, refresh verified status when they return.
  useEffect(() => {
    if (!open || !verifyPending || emailVerified) return;
    const onFocus = () => {
      void refreshWallet();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const tick = window.setInterval(() => {
      void refreshWallet();
    }, 8000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(tick);
    };
  }, [open, verifyPending, emailVerified, refreshWallet]);

  const fail = (result: { errorKey?: string; errorDetail?: string }) => {
    if (result.errorKey) setError(t(result.errorKey));
    else if (result.errorDetail) setError(result.errorDetail);
    else setError(t("profileSaveFailed"));
  };

  const saveName = async () => {
    setError(null);
    setNotice(null);
    if (!nameDraft.trim()) {
      setError(t("authNameRequired"));
      return;
    }
    if (nameDraft.trim() === user.name) return;
    setBusy("name");
    const result = await updateDisplayName(nameDraft);
    setBusy(null);
    if (!result.ok) fail(result);
    else setNotice(t("profileNameSaved"));
  };

  const saveEmail = async () => {
    setError(null);
    setNotice(null);
    const next = emailDraft.trim();
    if (!EMAIL_RE.test(next)) {
      setError(t("authEmailInvalid"));
      return;
    }
    if (next.toLowerCase() === (email ?? "").toLowerCase()) return;
    setBusy("email");
    const result = await updateEmail(next);
    setBusy(null);
    if (!result.ok) fail(result);
    else setNotice(t("profileEmailSent"));
  };

  const verifyEmail = async () => {
    if (verifyPending || emailVerified) return;
    setError(null);
    setNotice(null);
    setVerifyLatch(true);
    try {
      localStorage.setItem(VERIFY_PENDING_KEY, "1");
    } catch {
      /* ignore */
    }
    setBusy("verify");
    const result = await resendEmailVerification();
    setBusy(null);
    if (!result.ok) {
      setVerifyLatch(false);
      try {
        localStorage.removeItem(VERIFY_PENDING_KEY);
      } catch {
        /* ignore */
      }
      fail(result);
      return;
    }
    setNotice(t("verifyEmailWaiting"));
    void refreshWallet();
  };

  const savePassword = async () => {
    setError(null);
    setNotice(null);
    if (!currentPassword) {
      setError(t("authWrongPassword"));
      return;
    }
    if (nextPassword.length < 8) {
      setError(t("authWeakPassword"));
      return;
    }
    setBusy("password");
    const result = await changePassword(currentPassword, nextPassword);
    setBusy(null);
    if (!result.ok) fail(result);
    else {
      setCurrentPassword("");
      setNextPassword("");
      setNotice(t("profilePasswordSaved"));
    }
  };

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    setBusy("avatar");
    const result = await updateAvatar(file);
    setBusy(null);
    if (!result.ok) fail(result);
    else setNotice(t("profileAvatarSaved"));
  };

  const initial = (user.name || email || "").trim().charAt(0).toUpperCase() || "☾";

  const formatPeriodDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statusLabel = (() => {
    if (sub === "past_due") return t("billingStatusPastDue");
    if (sub === "cancelled") return t("billingStatusCancelled");
    if (sub === "trialing" && hasPaidPlan) return t("billingStatusTrialing");
    if (hasPaidPlan) return t("billingStatusActive");
    return t("billingStatusNone");
  })();

  const openBillingPortal = async () => {
    // Never touch profile `error` - billing feedback stays in this section only.
    setError(null);
    setBillingError(null);
    if (!hasPaidPlan) {
      onOpenPaywall?.();
      return;
    }
    if (whopManageUrl) {
      window.location.href = whopManageUrl;
      return;
    }
    setBusy("billing");
    const {
      data: { session },
    } = await getSupabaseBrowserClient().auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      setBusy(null);
      setBillingError(t("authRequiredPay"));
      return;
    }
    const result = await startBillingPortal({
      data: { origin: window.location.origin, accessToken },
    });
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    setBusy(null);
    setBillingError(t(result.errorKey));
  };

  const periodLabel = formatPeriodDate(currentPeriodEnd);
  const planTitle = hasPaidPlan
    ? subPlan === "ascended"
      ? t("billingPlanAscended")
      : t("billingPlanMystic")
    : t("subNone");

  const subscriptionBlock = (
    <div className="mt-7">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
        {t("subscription")}
      </p>

      <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.07] to-transparent">
        {/* Plan header */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
              hasPaidPlan
                ? "bg-gradient-to-br from-gold/30 to-gold/5 text-gold ring-1 ring-gold/35"
                : "bg-white/5 text-muted-foreground ring-1 ring-white/10"
            }`}
          >
            {hasPaidPlan ? <Sparkles className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-serif text-lg leading-tight text-gradient-gold">{planTitle}</p>
              {hasPaidPlan ? (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    sub === "past_due"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-gold/20 text-gold"
                  }`}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>
            {hasPaidPlan && planDef ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {t("billingDailyAllowance").replace("{n}", String(planDef.dailyCap))}
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{t("billingChooseHint")}</p>
            )}
          </div>
        </div>

        {/* Classic billing details - paid plans only */}
        {hasPaidPlan && planDef ? (
          <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5 text-[12px]">
              <span className="text-muted-foreground">{t("billingRowEnergy")}</span>
              <span className="font-medium text-foreground">
                {planDef.dailyCap}/{lang === "ka" ? "დღე" : "day"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5 text-[12px]">
              <span className="text-muted-foreground">{t("billingRowPrice")}</span>
              <span className="font-medium text-foreground">
                {t("billingPriceMonthly").replace("{price}", formatPlanPrice(planDef.key))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5 text-[12px]">
              <span className="text-muted-foreground">{t("billingRowAutoRenew")}</span>
              <span
                className={`font-medium ${cancelAtPeriodEnd ? "text-muted-foreground" : "text-gold"}`}
              >
                {cancelAtPeriodEnd ? t("billingOff") : t("billingOn")}
              </span>
            </div>
            {periodLabel ? (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[12px]">
                <span className="text-muted-foreground">
                  {cancelAtPeriodEnd ? t("billingRowAccessUntil") : t("billingRowRenewal")}
                </span>
                <span className="font-medium text-foreground">{periodLabel}</span>
              </div>
            ) : null}
            <p className="border-t border-white/10 px-3.5 py-2 text-[11px] text-muted-foreground/85">
              {t("billingIncludesPhoto")} · {t("billingManageHint")}
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="space-y-2 px-3 pb-3">
          {!hasPaidPlan ? (
            <button
              type="button"
              onClick={() => {
                setBillingError(null);
                setError(null);
                onOpenPaywall?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3 text-sm font-semibold text-obsidian"
            >
              <CreditCard className="h-4 w-4" />
              {t("choosePlan")}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy === "billing"}
                onClick={() => void openBillingPortal()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
              >
                {busy === "billing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("billingOpeningPortal")}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {t("manageBilling")}
                  </>
                )}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy === "billing" || cancelAtPeriodEnd}
                  onClick={() => void openBillingPortal()}
                  className="rounded-xl border border-white/15 py-2.5 text-[11px] font-semibold text-foreground/90 transition-colors hover:bg-white/5 disabled:opacity-40"
                >
                  {t("cancelAutoRenew")}
                </button>
                <button
                  type="button"
                  disabled={busy === "billing"}
                  onClick={() => void openBillingPortal()}
                  className="rounded-xl border border-gold/30 py-2.5 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
                >
                  {t("updatePaymentMethod")}
                </button>
              </div>
            </>
          )}
        </div>

        {billingError ? (
          <p className="mx-3 mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            {billingError}
          </p>
        ) : null}
      </div>
    </div>
  );

  const profileError =
    error &&
    error !== t("stripeFailed") &&
    error !== t("billingNoSubscription") &&
    error !== t("stripeNotConfigured")
      ? error
      : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              background: "oklch(0.05 0.02 305 / 0.45)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
            }}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-none p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:w-[min(100%,28rem)] sm:rounded-l-[28px] sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-gradient-gold">{t("settings")}</h2>
              <button
                onClick={onClose}
                className="glass-dark grid h-9 w-9 place-items-center rounded-full text-gold/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {authenticated && (
              <div className="mt-5 space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
                  {t("profile")}
                </p>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy === "avatar"}
                    className="group relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold to-gold-soft font-serif text-3xl text-obsidian shadow-[0_0_28px_-6px_var(--gold)] disabled:opacity-60"
                    aria-label={t("changeAvatar")}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      {busy === "avatar" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </span>
                  </button>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-gradient-gold truncate">
                      {user.name || email}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={!!busy}
                      className="mt-1 text-xs text-gold/80 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {t("changeAvatar")}
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      void onPickAvatar(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label
                    htmlFor="settings-name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                  >
                    {t("stepName")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="settings-name"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-3 font-serif text-foreground outline-none focus:gold-border"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy === "name" || nameDraft.trim() === user.name}
                      onClick={() => void saveName()}
                      className="rounded-xl bg-gradient-to-r from-gold to-gold-soft px-4 text-sm font-semibold text-obsidian disabled:opacity-40"
                    >
                      {busy === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="settings-email"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                  >
                    {t("emailLabel")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="settings-email"
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-3 text-foreground outline-none focus:gold-border"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={
                        busy === "email" ||
                        emailDraft.trim().toLowerCase() === (email ?? "").toLowerCase()
                      }
                      onClick={() => void saveEmail()}
                      className="rounded-xl bg-gradient-to-r from-gold to-gold-soft px-4 text-sm font-semibold text-obsidian disabled:opacity-40"
                    >
                      {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                    </button>
                  </div>
                  {emailVerified ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-gold">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      {t("emailVerified")}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {t("profileEmailHint")}
                      </p>
                      <div className="glass-dark mt-3 space-y-2.5 overflow-hidden rounded-[18px] px-3.5 py-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-xs font-semibold text-foreground break-words">
                              {!hasEmail
                                ? t("emailMissing")
                                : verifyPending
                                  ? t("verifyEmailWaitingTitle")
                                  : t("emailUnverified")}
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-muted-foreground break-words [overflow-wrap:anywhere]">
                              {!hasEmail
                                ? t("emailMissingHint")
                                : verifyPending
                                  ? t("verifyEmailWaiting")
                                  : t("emailVerifyHint")}
                            </p>
                          </div>
                          {verifyPending ? (
                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gold/80" />
                          ) : null}
                        </div>
                        {hasEmail && !verifyPending && (
                          <button
                            type="button"
                            disabled={busy === "verify"}
                            onClick={() => void verifyEmail()}
                            className="w-full rounded-full bg-gradient-to-r from-gold to-gold-soft px-3.5 py-2 text-xs font-bold text-obsidian disabled:opacity-40"
                          >
                            {busy === "verify" ? (
                              <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                            ) : (
                              t("verifyEmail")
                            )}
                          </button>
                        )}
                        {verifyPending && (
                          <p className="text-center text-[11px] font-medium text-gold/90">
                            {t("verifyEmailWaitingTitle")}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gold/70">
                    {t("changePassword")}
                  </p>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                    <input
                      id="settings-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t("currentPassword")}
                      className="glass-dark w-full rounded-xl py-3 pl-10 pr-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                    <input
                      id="settings-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={nextPassword}
                      onChange={(e) => setNextPassword(e.target.value)}
                      placeholder={t("newPasswordLabel")}
                      className="glass-dark w-full rounded-xl py-3 pl-10 pr-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy === "password" || !currentPassword || !nextPassword}
                    onClick={() => void savePassword()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3 text-sm font-semibold text-obsidian disabled:opacity-40"
                  >
                    {busy === "password" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("updatePassword")
                    )}
                  </button>
                </div>

                {profileError && (
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                    {profileError}
                  </p>
                )}
                {notice && (
                  <p className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-xs text-gold">
                    {notice}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void signOut();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/50 px-3 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" /> {t("signOut")}
                </button>
              </div>
            )}

            {subscriptionBlock}

            {/* Language */}
            <div className="mt-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
                {t("language")}
              </p>
              <div className="flex flex-col gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                      lang === l.code
                        ? "glass-purple text-foreground"
                        : "glass-dark text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3 font-serif text-base">
                      <img
                        src={l.flagSrc}
                        alt=""
                        width={24}
                        height={16}
                        className="h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-white/15"
                      />
                      {l.native}
                    </span>
                    {lang === l.code && <Check className="h-4 w-4 text-gold" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio */}
            <div className="mt-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
                {t("audio")}
              </p>
              <button
                onClick={() => setMuted(!muted)}
                className="glass-dark flex w-full items-center justify-between rounded-xl px-4 py-3"
              >
                <span className="flex items-center gap-3 text-foreground">
                  {muted ? (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-gold" />
                  )}
                  <span className="text-sm">{muted ? t("muted") : t("unmuted")}</span>
                </span>
                <span
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    muted ? "bg-muted" : "bg-gold/80"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      muted ? "left-0.5" : "left-[22px]"
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Help last */}
            <div className="mt-7 space-y-2 pb-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
                {t("helpSection")}
              </p>
              <a
                href="/support"
                onClick={onClose}
                className="glass-dark flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <LifeBuoy className="h-5 w-5 shrink-0 text-gold" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {t("supportBtn")}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("supportBtnSub")}
                  </span>
                </span>
              </a>
              <a
                href="/feedback"
                onClick={onClose}
                className="glass-dark flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <MessageSquareHeart className="h-5 w-5 shrink-0 text-gold" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {t("feedbackBtn")}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("feedbackBtnSub")}
                  </span>
                </span>
              </a>
              <SocialLinks className="pt-2" compact />
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-1 pt-1 text-[11px] text-muted-foreground/80">
                <Link
                  to="/terms"
                  onClick={onClose}
                  className="min-h-9 py-2 hover:text-gold hover:underline underline-offset-2"
                >
                  {t("termsOfService")}
                </Link>
                <Link
                  to="/privacy"
                  onClick={onClose}
                  className="min-h-9 py-2 hover:text-gold hover:underline underline-offset-2"
                >
                  {t("privacyPolicy")}
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
