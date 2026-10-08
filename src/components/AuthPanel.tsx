import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  LogIn,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  CalendarDays,
  ArrowLeft,
  Send,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getZodiac } from "@/lib/zodiac";
import { isDisposableEmail } from "@/lib/disposable-email";
import { useApp } from "@/context/AppContext";
import { BrandMark } from "./BrandMark";
import { SocialLinks } from "@/components/SocialLinks";

interface Props {
  open: boolean;
  /** Omitted when the panel is the mandatory sign-in gate. */
  onClose?: () => void;
}

const MIN_PASSWORD = 8;

// Deliberately permissive: the server is the real authority on deliverability,
// and over-strict client regexes reject valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "signup" | "forgot";

/** Max birth date for the 16+ age gate (digital-consent style). */
function maxBirthDateISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d.toISOString().slice(0, 10);
}

function ageFromISO(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function AuthPanel({ open, onClose }: Props) {
  const { t, lang, configured, signIn, signUp, signInWithOAuth, requestPasswordReset, opsFlags } =
    useApp();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirmRevealed, setConfirmRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Previewed live as the date is entered, before any account exists.
  const signupZodiac = getZodiac(birthDate);
  const dismissable = typeof onClose === "function";

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const switchMode = (next: Mode) => {
    if (next === "signup" && !opsFlags.signupsEnabled) {
      setError("New signups are temporarily closed.");
      setMode("signin");
      return;
    }
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setMarketingOptIn(false);
    setRevealed(false);
    clearFeedback();
  };

  const fail = (result: { errorKey?: string; errorDetail?: unknown }) => {
    // Prefer translated copy; otherwise show Supabase's own wording so the
    // real cause is visible instead of a wrong guess. Never render raw objects.
    if (result.errorKey) {
      const msg = t(result.errorKey);
      if (typeof msg === "string" && msg.trim() && msg !== "{}") {
        setError(msg);
        return;
      }
    }
    if (typeof result.errorDetail === "string" && result.errorDetail.trim()) {
      setError(result.errorDetail);
      return;
    }
    setError(t("authInvalidCreds"));
  };

  const submit = async () => {
    clearFeedback();

    if (!EMAIL_RE.test(email.trim())) {
      setError(t("authEmailInvalid"));
      return;
    }
    if (mode === "signup" && isDisposableEmail(email.trim())) {
      setError(t("authDisposableEmail"));
      return;
    }

    if (mode === "forgot") {
      setBusy(true);
      const result = await requestPasswordReset(email.trim());
      setBusy(false);
      if (result.ok) setNotice(t("resetSent"));
      else fail(result);
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError(t("authNameRequired"));
      return;
    }
    if (mode === "signup" && !birthDate) {
      setError(t("authBirthRequired"));
      return;
    }
    if (mode === "signup") {
      const age = ageFromISO(birthDate);
      if (age == null || age < 16) {
        setError(t("authAgeTooYoung"));
        return;
      }
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("authWeakPassword"));
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError(t("authPasswordMismatch"));
      return;
    }

    setBusy(true);
    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim(), birthDate, marketingOptIn);
    setBusy(false);

    if (!result.ok) {
      fail(result);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMarketingOptIn(false);
    if (result.softVerifyHint) {
      setNotice(t("authVerifyLater"));
    } else if (result.needsEmailConfirm) {
      setNotice(t("authCheckEmailVerify"));
      setMode("signin");
    }
  };

  const oauth = async (provider: "google" | "facebook") => {
    clearFeedback();
    setOauthBusy(provider);
    const result = await signInWithOAuth(provider);
    if (!result.ok) {
      setOauthBusy(null);
      fail(result);
    }
    // On success the browser redirects away to Google/Facebook.
  };

  const heading =
    mode === "signin"
      ? t("authSignInTitle")
      : mode === "signup"
        ? t("authGuestTitle")
        : t("resetTitle");

  const subheading =
    mode === "signin" ? t("authSignInSub") : mode === "signup" ? t("authGuestSub") : t("resetSub");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[92] flex items-end justify-center overflow-y-auto overscroll-contain px-0 py-0 sm:items-center sm:px-4 sm:py-6"
          style={{
            background: "oklch(0.05 0.02 305 / 0.55)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
          onClick={dismissable ? onClose : undefined}
        >
          <motion.div
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="ios-sheet glass-purple relative mx-auto flex max-h-[100dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[min(92dvh,720px)] sm:max-w-lg sm:rounded-[28px] sm:p-6"
          >
            <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />
            {dismissable && (
              <button
                onClick={onClose}
                className="glass-dark absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-gold/80"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="min-h-0 w-full">
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center drop-shadow-[0_6px_18px_oklch(0.55_0.14_85_/_0.35)] sm:h-[4.5rem] sm:w-[4.5rem]">
                  <BrandMark size={72} className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                </span>
                <h2 className="mt-2 font-serif text-xl text-gradient-gold sm:text-2xl">
                  {heading}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subheading}</p>
              </div>

              {!configured && (
                <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-center text-xs text-gold">
                  {t("authNotConfigured")}
                </p>
              )}

              {mode !== "forgot" && (
                <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                  <button
                    type="button"
                    disabled={busy || oauthBusy !== null || !configured}
                    onClick={() => void oauth("google")}
                    className="glass-dark flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-foreground transition-colors hover:gold-border disabled:opacity-50"
                  >
                    {oauthBusy === "google" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gold" />
                    ) : (
                      <GoogleGlyph />
                    )}
                    {t("continueGoogle")}
                  </button>
                  <button
                    type="button"
                    disabled={busy || oauthBusy !== null || !configured}
                    onClick={() => void oauth("facebook")}
                    className="glass-dark flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-foreground transition-colors hover:gold-border disabled:opacity-50"
                  >
                    {oauthBusy === "facebook" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gold" />
                    ) : (
                      <FacebookGlyph />
                    )}
                    {t("continueFacebook")}
                  </button>
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      {t("orEmail")}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              )}

              <form
                className={`${mode === "forgot" ? "mt-4" : "mt-1"} space-y-2.5 sm:space-y-3`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="nina-name"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                    >
                      {t("stepName")}
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="nina-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          clearFeedback();
                        }}
                        placeholder={t("namePlaceholder")}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-4 font-serif text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:gold-border"
                      />
                    </div>
                  </div>
                )}

                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="nina-birth"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                    >
                      {t("birthDate")}
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="nina-birth"
                        type="date"
                        autoComplete="bday"
                        value={birthDate}
                        max={maxBirthDateISO()}
                        onChange={(e) => {
                          setBirthDate(e.target.value);
                          clearFeedback();
                        }}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-4 text-foreground outline-none focus:gold-border [color-scheme:dark]"
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/80">
                      {t("authAgeHint")}
                    </p>

                    <AnimatePresence>
                      {signupZodiac && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.94 }}
                          className="glass-dark mt-2.5 flex items-center gap-3 rounded-2xl p-3 gold-border"
                        >
                          <span className="text-3xl text-gold animate-float-slow">
                            {signupZodiac.icon}
                          </span>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {t("yourSign")}
                            </p>
                            <p className="font-serif text-lg text-gradient-gold">
                              {signupZodiac.names[lang ?? "en"]}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="nina-email"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                  >
                    {t("emailLabel")}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                    <input
                      id="nina-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFeedback();
                      }}
                      placeholder={t("emailPlaceholder")}
                      className="glass-dark w-full rounded-xl py-3 pl-10 pr-4 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label
                      htmlFor="nina-password"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                    >
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="nina-password"
                        type={revealed ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFeedback();
                        }}
                        placeholder={t("passwordPlaceholder")}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-11 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                      />
                      <button
                        type="button"
                        onClick={() => setRevealed((v) => !v)}
                        aria-label={revealed ? t("hidePassword") : t("showPassword")}
                        title={revealed ? t("hidePassword") : t("showPassword")}
                        className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-gold/60 transition-colors hover:text-gold"
                      >
                        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="nina-confirm-password"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                    >
                      {t("confirmPasswordLabel")}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        id="nina-confirm-password"
                        type={confirmRevealed ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFeedback();
                        }}
                        placeholder={t("confirmPasswordPlaceholder")}
                        className="glass-dark w-full rounded-xl py-3 pl-10 pr-11 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmRevealed((v) => !v)}
                        aria-label={confirmRevealed ? t("hidePassword") : t("showPassword")}
                        title={confirmRevealed ? t("hidePassword") : t("showPassword")}
                        className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-gold/60 transition-colors hover:text-gold"
                      >
                        {confirmRevealed ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signup" && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-0.5 py-1 text-left">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gold/40 bg-transparent accent-[var(--gold)]"
                    />
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {t("authMarketingOptIn")}
                    </span>
                  </label>
                )}

                {error && (
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-xs text-gold">
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !configured}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)] transition-opacity disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("authPending")}
                    </>
                  ) : mode === "signin" ? (
                    <>
                      <LogIn className="h-4 w-4" /> {t("signIn")}
                    </>
                  ) : mode === "signup" ? (
                    <>
                      <Sparkles className="h-4 w-4" /> {t("createAccount")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> {t("resetSend")}
                    </>
                  )}
                </button>
              </form>

              {mode === "signin" && (
                <button
                  onClick={() => switchMode("forgot")}
                  className="mt-3 w-full text-center text-[11px] text-gold/70 underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {t("forgotPassword")}
                </button>
              )}

              {mode === "forgot" ? (
                <button
                  onClick={() => switchMode("signin")}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground/80 transition-colors hover:text-gold"
                >
                  <ArrowLeft className="h-3 w-3" /> {t("resetBack")}
                </button>
              ) : (
                <button
                  onClick={() =>
                    switchMode(
                      mode === "signin"
                        ? opsFlags.signupsEnabled
                          ? "signup"
                          : "signin"
                        : "signin",
                    )
                  }
                  className="mt-4 w-full text-center text-[11px] uppercase tracking-widest text-muted-foreground/80 transition-colors hover:text-gold"
                >
                  {mode === "signin"
                    ? opsFlags.signupsEnabled
                      ? t("toSignUp")
                      : "Signups closed"
                    : t("toSignIn")}
                </button>
              )}

              <SocialLinks className="mt-5" compact />
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] text-muted-foreground/80">
                <Link
                  to="/terms"
                  className="min-h-9 py-2 hover:text-gold/90 hover:underline underline-offset-2"
                >
                  {t("termsOfService")}
                </Link>
                <Link
                  to="/privacy"
                  className="min-h-9 py-2 hover:text-gold/90 hover:underline underline-offset-2"
                >
                  {t("privacyPolicy")}
                </Link>
                <a
                  href="/support"
                  className="min-h-9 py-2 hover:text-gold/90 hover:underline underline-offset-2"
                >
                  {t("supportBtn")}
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#1877F2"
        d="M13.5 22v-8h2.7l.4-3.1h-3.1V9c0-.9.3-1.5 1.6-1.5H16.7V4.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2V14h2.8v8h3.5z"
      />
    </svg>
  );
}
