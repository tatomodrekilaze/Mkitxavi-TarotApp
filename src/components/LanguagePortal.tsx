import { motion } from "framer-motion";
import { LANGUAGES } from "@/lib/i18n";
import { useApp } from "@/context/AppContext";
import { BrandMark } from "./BrandMark";

/** Always shown in Georgian first, primary audience, before a language is chosen. */
const PORTAL_KA = {
  title: "რომელ ენაზე გინდა გააგრძელო?",
  sub: "აირჩიე შენი მკითხაობის ენა.",
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const sparkles = [
  { top: "14%", left: "18%", size: 2.5, delay: 0.2, dur: 3.1 },
  { top: "22%", left: "80%", size: 2, delay: 0.9, dur: 2.7 },
  { top: "78%", left: "16%", size: 2, delay: 1.3, dur: 3.4 },
  { top: "82%", left: "76%", size: 3, delay: 0.5, dur: 2.9 },
];

export function LanguagePortal() {
  const { setLang } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-5"
      style={{
        background: "oklch(0.05 0.02 305 / 0.82)",
        backdropFilter: "blur(18px)",
      }}
    >
      {/* Atmosphere */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, oklch(0.42 0.2 300 / 0.45), transparent 65%), radial-gradient(ellipse 40% 30% at 70% 80%, oklch(0.55 0.12 85 / 0.12), transparent 55%)",
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.14 88 / 0.12) 0%, oklch(0.45 0.18 300 / 0.1) 40%, transparent 68%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-gold"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            boxShadow: "0 0 10px oklch(0.78 0.14 88 / 0.85)",
          }}
          animate={{ opacity: [0.15, 0.95, 0.15], y: [0, -8, 0] }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.9, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24, delay: 0.05 }}
        className="glass-purple relative w-full max-w-md overflow-hidden rounded-[1.75rem] px-6 py-8 text-center sm:px-9 sm:py-10"
      >
        {/* Soft inner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, oklch(0.72 0.14 88 / 0.16), transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, oklch(0.72 0.14 88 / 0.3) 0%, transparent 68%)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-1 rounded-full border border-gold/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_oklch(0.78_0.14_88)]" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.75, ease: easeOut, delay: 0.15 }}
            className="relative z-10 grid h-[4.5rem] w-[4.5rem] place-items-center animate-float-slow drop-shadow-[0_10px_28px_oklch(0.55_0.14_85_/_0.4)]"
          >
            <BrandMark size={72} className="h-[4.5rem] w-[4.5rem] object-contain" />
          </motion.div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55, ease: easeOut }}
          className="relative mt-5 font-serif text-2xl leading-snug text-gradient-gold sm:text-[1.7rem]"
        >
          {PORTAL_KA.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: easeOut }}
          className="relative mt-2 text-sm text-muted-foreground"
        >
          {PORTAL_KA.sub}
        </motion.p>

        <motion.div
          aria-hidden
          className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.55, ease: easeOut }}
        />

        <div className="relative mt-7 flex flex-col gap-3">
          {LANGUAGES.map((l, i) => (
            <motion.button
              key={l.code}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: easeOut }}
              whileHover={{
                scale: 1.03,
                boxShadow:
                  "0 0 0 1px oklch(0.78 0.14 88 / 0.45), 0 12px 36px -16px oklch(0.72 0.14 88 / 0.55)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setLang(l.code)}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/8 bg-obsidian/35 px-5 py-4 transition-colors hover:border-gold/35"
            >
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                animate={{ x: ["-130%", "130%"] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  repeatDelay: 2.2 + i * 0.4,
                  ease: "easeInOut",
                }}
              />
              <img
                src={l.flagSrc}
                alt=""
                width={28}
                height={19}
                className="relative h-[19px] w-7 shrink-0 rounded-[3px] object-cover shadow-[0_2px_10px_oklch(0_0_0_/_0.35)] ring-1 ring-white/15"
              />
              <span className="relative font-serif text-lg tracking-wide text-foreground">
                {l.native}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
