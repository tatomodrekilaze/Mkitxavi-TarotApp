import { motion } from "framer-motion";
import { Settings, Zap, Flame, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BrandMark } from "./BrandMark";
import { MoonPhase } from "./MoonPhase";

interface Props {
  onOpenPaywall: () => void;
  onOpenSettings: () => void;
  onOpenServices: () => void;
  onOpenStreak: () => void;
}

export function Header({ onOpenPaywall, onOpenSettings, onOpenServices, onOpenStreak }: Props) {
  const { energy, energyUnlimited, authenticated, streak, t } = useApp();

  return (
    <header className="sticky top-0 z-40 shrink-0 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="glass mx-auto flex max-w-2xl items-center justify-between gap-1.5 rounded-[18px] px-2 py-2 ring-1 ring-white/5 sm:gap-2 sm:rounded-[22px] sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#14081f] shadow-[0_0_18px_-6px_var(--gold)] sm:h-9 sm:w-9 sm:rounded-xl">
            <BrandMark size={30} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate font-serif text-lg tracking-tight text-gradient-gold sm:text-xl">
              {t("appName")}
            </h1>
            <p className="hidden truncate text-[10px] tracking-[0.08em] text-muted-foreground/90 sm:block">
              {t("tagline")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden min-[360px]:block">
            <MoonPhase size={28} showLabel={false} />
          </div>

          {authenticated && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onOpenStreak}
              aria-label={t("streak")}
              title={t("streak")}
              className="glass-dark flex items-center gap-0.5 rounded-full px-2 py-1.5 sm:gap-1 sm:px-2.5"
              style={{ boxShadow: "0 0 14px -4px rgba(255,140,60,0.55)" }}
            >
              <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400 sm:h-4 sm:w-4" />
              <span className="text-xs font-semibold text-orange-300 sm:text-sm">{streak}</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onOpenPaywall}
            aria-label={t("energy")}
            title={t("energy")}
            className="glass-dark flex items-center gap-1 rounded-full px-2.5 py-1.5 gold-border sm:gap-1.5 sm:px-3"
          >
            <Zap className="h-3.5 w-3.5 fill-gold text-gold sm:h-4 sm:w-4" />
            <span className="text-xs font-semibold text-gold sm:text-sm">
              {energyUnlimited ? "∞" : energy}
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenServices}
            aria-label={t("services")}
            title={t("services")}
            className="glass-dark grid h-8 w-8 place-items-center rounded-full text-gold/80 hover:text-gold sm:h-9 sm:w-9"
          >
            <Sparkles className="h-4 w-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            aria-label={t("settings")}
            className="glass-dark grid h-8 w-8 place-items-center rounded-full text-gold/80 hover:text-gold sm:h-9 sm:w-9"
          >
            <Settings className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
