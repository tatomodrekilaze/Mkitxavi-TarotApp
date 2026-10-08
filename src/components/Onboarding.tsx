import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

/**
 * Shown once, immediately after sign-up. Name and birth date are already
 * captured on the sign-up form, so this only gathers taste: interests,
 * hobbies, and cosmic vibe. Not dismissable, readings are shaped by these.
 */
interface Props {
  open: boolean;
}

const MARIA_AVATAR = "/maria-avatar.jpg";

const INTEREST_KEYS = [
  "astrology",
  "career",
  "toxic",
  "travel",
  "finance",
  "love",
  "health",
  "purpose",
];

const INTEREST_ICONS: Record<string, string> = {
  astrology: "✨",
  career: "📈",
  toxic: "⛓️‍💥",
  travel: "🧭",
  finance: "💰",
  love: "💞",
  health: "🌿",
  purpose: "🕯️",
};

const HOBBY_KEYS = [
  "meditation",
  "music",
  "books",
  "art",
  "nature",
  "fitness",
  "cooking",
  "dancing",
];

const HOBBY_ICONS: Record<string, string> = {
  meditation: "🧘",
  music: "🎧",
  books: "📖",
  art: "🎨",
  nature: "🌲",
  fitness: "🏋️",
  cooking: "🍲",
  dancing: "💃",
};

const VIBE_KEYS = [
  "vibeOverwhelmed",
  "vibeBurnedOut",
  "vibeUnstoppable",
  "vibeStuck",
  "vibeCalm",
  "vibeSeeking",
] as const;

const VIBE_ICONS: Record<(typeof VIBE_KEYS)[number], string> = {
  vibeOverwhelmed: "🌀",
  vibeBurnedOut: "🔋",
  vibeUnstoppable: "🚀",
  vibeStuck: "🔄",
  vibeCalm: "🧘",
  vibeSeeking: "❓",
};

export function Onboarding({ open }: Props) {
  const { t, saveProfile } = useApp();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [cosmicVibes, setCosmicVibes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (key: string) => {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const toggleHobby = (key: string) => {
    setHobbies((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const toggleVibe = (key: string) => {
    setCosmicVibes((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const finish = async () => {
    if (interests.length === 0 || hobbies.length === 0 || cosmicVibes.length === 0) return;
    setBusy(true);
    setError(null);
    // Stored as comma-separated keys (column stays text).
    const result = await saveProfile({
      interests,
      hobbies,
      cosmicVibe: cosmicVibes.join(","),
    });
    setBusy(false);

    if (!result.ok) {
      setError(
        result.errorKey ? t(result.errorKey) : result.errorDetail || "Could not save. Try again.",
      );
      return;
    }
    // Gate closes when `user.registered` flips — never rewind to step 1.
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-stretch justify-center sm:items-center sm:px-4 sm:py-6"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, oklch(0.28 0.08 305 / 0.95), oklch(0.08 0.03 305 / 0.98))",
          }}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden sm:h-auto sm:max-h-[min(92dvh,760px)] sm:rounded-[28px] sm:border sm:border-white/10 sm:bg-black/25 sm:shadow-[0_24px_80px_-24px_oklch(0.2_0.08_305)]"
          >
            {/* Hero band — fills the empty top half on mobile */}
            <div className="relative shrink-0 overflow-hidden px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pb-5 sm:pt-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-80"
                style={{
                  background:
                    "radial-gradient(70% 90% at 50% 10%, oklch(0.55 0.14 85 / 0.22), transparent 70%)",
                }}
              />
              <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <img
                    src={MARIA_AVATAR}
                    alt="Maria"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-gold/55 shadow-[0_0_36px_-8px_var(--gold)] sm:h-24 sm:w-24"
                  />
                  <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-gold animate-pulse-glow" />
                </div>
                <h2 className="font-serif text-2xl text-gradient-gold sm:text-3xl">
                  {t("onbTitle")}
                </h2>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{t("onbSub")}</p>
                <div className="mt-4 flex w-full max-w-xs gap-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        step >= s ? "bg-gold" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="s1"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="pt-1"
                  >
                    <p className="mb-1 text-center font-serif text-base text-foreground sm:text-lg">
                      {t("stepInterests")}
                    </p>
                    <p className="mb-3 text-center text-xs text-muted-foreground">
                      {t("interestsSub")} ({interests.length}/3)
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {INTEREST_KEYS.map((key) => {
                        const active = interests.includes(key);
                        const capped = !active && interests.length >= 3;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            disabled={capped}
                            onClick={() => toggleInterest(key)}
                            className={`flex min-h-[2.85rem] items-center gap-1.5 rounded-xl px-2 py-2 text-left text-[12px] transition-all sm:min-h-[3.25rem] sm:gap-2 sm:px-3 sm:text-sm ${
                              active
                                ? "glass-purple gold-border text-foreground ring-1 ring-gold/50"
                                : capped
                                  ? "glass-dark cursor-not-allowed text-muted-foreground/40"
                                  : "glass-dark text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="shrink-0 text-sm sm:text-lg">
                              {INTEREST_ICONS[key]}
                            </span>
                            <span className="min-w-0 flex-1 break-words leading-snug [overflow-wrap:anywhere]">
                              {t(key)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5">
                      <button
                        type="button"
                        disabled={interests.length === 0}
                        onClick={() => setStep(2)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)] transition-opacity disabled:opacity-40"
                      >
                        {t("next")} <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="s2"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="pt-1"
                  >
                    <p className="mb-1 text-center font-serif text-lg text-foreground">
                      {t("stepHobbies")}
                    </p>
                    <p className="mb-4 text-center text-xs text-muted-foreground">
                      {t("hobbiesSub")} ({hobbies.length}/3)
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {HOBBY_KEYS.map((key) => {
                        const active = hobbies.includes(key);
                        const capped = !active && hobbies.length >= 3;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            disabled={capped}
                            onClick={() => toggleHobby(key)}
                            className={`flex min-h-[3.25rem] items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-[13px] transition-all sm:px-3 sm:text-sm ${
                              active
                                ? "glass-purple gold-border text-foreground ring-1 ring-gold/50"
                                : capped
                                  ? "glass-dark cursor-not-allowed text-muted-foreground/40"
                                  : "glass-dark text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="shrink-0 text-base sm:text-lg">
                              {HOBBY_ICONS[key]}
                            </span>
                            <span className="min-w-0 flex-1 break-words leading-snug">
                              {t(key)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="glass-dark flex items-center justify-center gap-1.5 rounded-xl px-5 py-3.5 text-sm text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> {t("back")}
                      </button>
                      <button
                        type="button"
                        disabled={hobbies.length === 0}
                        onClick={() => setStep(3)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)] transition-opacity disabled:opacity-40"
                      >
                        {t("next")} <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="s3"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="pt-1"
                  >
                    <p className="mb-1 text-center font-serif text-lg text-foreground">
                      {t("stepVibe")}
                    </p>
                    <p className="mb-4 text-center text-xs text-muted-foreground">
                      {t("vibeSub")} ({cosmicVibes.length}/3)
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {VIBE_KEYS.map((key) => {
                        const active = cosmicVibes.includes(key);
                        const capped = !active && cosmicVibes.length >= 3;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            disabled={capped}
                            onClick={() => toggleVibe(key)}
                            className={`flex min-h-[3.25rem] items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-[13px] transition-all sm:px-3 sm:text-sm ${
                              active
                                ? "glass-purple gold-border text-foreground ring-1 ring-gold/50"
                                : capped
                                  ? "glass-dark cursor-not-allowed text-muted-foreground/40"
                                  : "glass-dark text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="shrink-0 text-base sm:text-lg">{VIBE_ICONS[key]}</span>
                            <span className="min-w-0 flex-1 break-words leading-snug">
                              {t(key)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {error && (
                      <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                        {error}
                      </p>
                    )}

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="glass-dark flex items-center justify-center gap-1.5 rounded-xl px-5 py-3.5 text-sm text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> {t("back")}
                      </button>
                      <button
                        type="button"
                        disabled={cosmicVibes.length === 0 || busy}
                        onClick={() => void finish()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)] transition-opacity disabled:opacity-40"
                      >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("complete")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
