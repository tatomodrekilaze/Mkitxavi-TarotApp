import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Flame, Star, Gift, Loader2, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Day 5 is an early hook so the first gift arrives before day 10. */
export const STREAK_REWARDS = [
  { day: 5, energy: 5 },
  { day: 10, energy: 10 },
  { day: 20, energy: 20 },
  { day: 50, energy: 50 },
  { day: 100, energy: 100 },
] as const;

export function StreakPanel({ open, onClose }: Props) {
  const { t, streak, bestStreak, streakRewardsClaimed, claimStreakReward } = useApp();
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claim = async (day: number) => {
    setError(null);
    setNotice(null);
    setBusyDay(day);
    const result = await claimStreakReward(day);
    setBusyDay(null);
    if (!result.ok) {
      setError(
        result.errorKey ? t(result.errorKey) : (result.errorDetail ?? t("streakClaimFailed")),
      );
      return;
    }
    setNotice(t("streakClaimed"));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[92] flex items-end justify-center sm:items-center"
          style={{
            background: "oklch(0.05 0.02 305 / 0.55)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative w-full max-w-md rounded-t-[28px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[28px]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

            <button
              onClick={onClose}
              className="glass-dark absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-gold/80"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-orange-400/40 to-amber-500/20">
                <Flame className="h-7 w-7 fill-orange-400 text-orange-300" />
              </div>
              <h2 className="mt-3 font-serif text-2xl text-gradient-gold">{t("streakTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("streakSub")}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="glass-dark rounded-[22px] px-3 py-4 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Flame className="h-4 w-4 fill-orange-400 text-orange-400" />
                  <span className="font-serif text-3xl text-orange-300">{streak}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("streak")}
                </p>
              </div>
              <div className="glass-dark rounded-[22px] px-3 py-4 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-serif text-3xl text-gradient-gold">{bestStreak}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("streakBest")}
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
              {t("streakRewards")}
            </p>
            <div className="mt-3 space-y-2">
              {STREAK_REWARDS.map((r) => {
                const claimed = streakRewardsClaimed.includes(r.day);
                const unlocked = streak >= r.day;
                const canClaim = unlocked && !claimed;
                return (
                  <div
                    key={r.day}
                    className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 ${
                      canClaim ? "glass-purple gold-border" : "glass-dark"
                    }`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-400/15">
                      <Gift className="h-4.5 w-4.5 text-orange-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t("streakDay").replace("{n}", String(r.day))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{r.energy} {t("energy")}
                      </p>
                    </div>
                    {claimed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gold">
                        <Check className="h-3.5 w-3.5" /> {t("streakClaimedShort")}
                      </span>
                    ) : (
                      <button
                        disabled={!canClaim || busyDay === r.day}
                        onClick={() => void claim(r.day)}
                        className="rounded-full bg-gradient-to-r from-gold to-gold-soft px-3.5 py-1.5 text-xs font-bold text-obsidian disabled:opacity-35"
                      >
                        {busyDay === r.day ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : unlocked ? (
                          t("streakClaim")
                        ) : (
                          t("streakLocked")
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="mt-3 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-xs text-gold">
                {notice}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
