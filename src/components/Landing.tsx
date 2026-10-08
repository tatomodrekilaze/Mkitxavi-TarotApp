import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { BrandMark } from "@/components/BrandMark";
import { SocialLinks } from "@/components/SocialLinks";

interface Props {
  onStart: () => void;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

const brandLetters = "Mkitxavi".split("");

const sparkles = [
  { top: "18%", left: "16%", size: 3, delay: 0.2, dur: 3.2 },
  { top: "28%", left: "82%", size: 2, delay: 0.8, dur: 2.6 },
  { top: "62%", left: "12%", size: 2.5, delay: 1.4, dur: 3.8 },
  { top: "70%", left: "78%", size: 2, delay: 0.5, dur: 2.9 },
  { top: "42%", left: "88%", size: 3, delay: 1.1, dur: 3.4 },
  { top: "48%", left: "8%", size: 2, delay: 1.7, dur: 2.4 },
];

export function Landing({ onStart }: Props) {
  const { t } = useApp();

  return (
    // Scrollable shell: short phones must reach Terms / Support below the CTA.
    <div className="relative h-full min-h-0 overflow-y-auto overscroll-contain">
      <section className="relative flex min-h-full flex-col items-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center sm:px-6">
        {/* Atmosphere */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% 28%, oklch(0.42 0.2 300 / 0.5), transparent 62%), radial-gradient(ellipse 55% 40% at 78% 88%, oklch(0.55 0.12 85 / 0.16), transparent 52%), radial-gradient(ellipse 40% 30% at 18% 75%, oklch(0.4 0.16 300 / 0.2), transparent 55%)",
          }}
        />

        {/* Slow breathing wash */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[28%] h-[min(420px,70vw)] w-[min(420px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full sm:top-[32%] sm:h-[520px] sm:w-[520px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.14 88 / 0.14) 0%, oklch(0.45 0.18 300 / 0.1) 38%, transparent 68%)",
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbit ring */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[28%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/15 sm:top-[32%] sm:h-64 sm:w-64"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 1 },
            scale: { duration: 1, ease: easeOut },
            rotate: { duration: 48, repeat: Infinity, ease: "linear" },
          }}
        >
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_12px_oklch(0.78_0.14_88)]" />
          <span className="absolute bottom-3 right-4 h-1.5 w-1.5 rounded-full bg-gold/70 shadow-[0_0_8px_oklch(0.78_0.14_88_/_0.8)]" />
        </motion.div>

        {/* Soft counter-orbit */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[28%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/10 sm:top-[32%] sm:h-80 sm:w-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7, rotate: -360 }}
          transition={{
            opacity: { duration: 1.2, delay: 0.2 },
            rotate: { duration: 72, repeat: Infinity, ease: "linear" },
          }}
        >
          <span className="absolute left-6 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-gold/50" />
        </motion.div>

        {/* Floating sparkles */}
        {sparkles.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute z-[1] rounded-full bg-gold"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              boxShadow: "0 0 10px oklch(0.78 0.14 88 / 0.85)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.95, 0.15], y: [0, -10, 0] }}
            transition={{
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Centers when short; grows + scrolls when content exceeds the viewport */}
        <div className="relative z-10 my-auto flex w-full max-w-lg flex-col items-center py-6 sm:py-10">
          <div className="relative flex h-28 w-28 items-center justify-center sm:h-40 sm:w-40">
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.72 0.14 88 / 0.35) 0%, transparent 68%)",
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.95, 0.5] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute inset-3 rounded-full border border-gold/25"
              animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.72, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.9, ease: easeOut }}
              className="relative z-10 h-[5.5rem] w-[5.5rem] animate-float-slow drop-shadow-[0_18px_50px_oklch(0.55_0.14_85_/_0.55)] sm:h-32 sm:w-32"
            >
              <BrandMark size={128} className="h-full w-full object-contain" />
            </motion.div>
          </div>

          <motion.h1
            className="relative z-10 mt-4 flex justify-center font-serif text-[clamp(2.5rem,12vw,3.75rem)] tracking-tight sm:mt-6 sm:text-7xl"
            aria-label="Mkitxavi"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.045, delayChildren: 0.35 } },
            }}
          >
            {brandLetters.map((letter, i) => (
              <motion.span
                key={`${letter}-${i}`}
                variants={{
                  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
                  show: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.55, ease: easeOut },
                  },
                }}
                style={{ animationDelay: `${i * 0.09}s` }}
                className="text-gradient-gold-live inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          <motion.div
            aria-hidden
            className="mt-2.5 h-px w-20 bg-gradient-to-r from-transparent via-gold/70 to-transparent sm:mt-3 sm:w-24"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.7, ease: easeOut }}
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.65, ease: easeOut }}
            className="relative z-10 mt-4 max-w-md px-1 font-serif text-[clamp(1.25rem,5.5vw,1.875rem)] leading-snug text-foreground/92 sm:mt-5 sm:text-3xl"
          >
            {t("landingHeadline")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: easeOut }}
            className="relative z-10 mt-3 max-w-md px-1 text-[14px] leading-[1.65] text-muted-foreground sm:mt-4 sm:text-[15px] sm:leading-[1.7]"
          >
            {t("landingSub")}
          </motion.p>

          <motion.p
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.08, delayChildren: 1.0 },
              },
            }}
            className="relative z-10 mt-5 flex max-w-md flex-wrap items-center justify-center gap-y-1.5 px-1 font-serif text-[14px] leading-relaxed text-gold/85 sm:mt-7 sm:text-base"
          >
            {t("landingOfferLine")
              .split(" · ")
              .map((item, i, arr) => (
                <motion.span
                  key={item}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.45, ease: easeOut },
                    },
                  }}
                  className="inline-flex items-center"
                >
                  <span className="px-1.5 tracking-wide">{item}</span>
                  {i < arr.length - 1 && (
                    <span
                      aria-hidden
                      className="mx-0.5 inline-block h-[3px] w-[3px] rounded-full bg-gold/45"
                    />
                  )}
                </motion.span>
              ))}
          </motion.p>

          <motion.button
            type="button"
            onClick={onStart}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.15, duration: 0.55, ease: easeOut }}
            whileHover={{ scale: 1.045, boxShadow: "0 20px 56px -12px oklch(0.72 0.14 88 / 0.85)" }}
            whileTap={{ scale: 0.97 }}
            className="relative z-10 mt-8 min-h-11 overflow-hidden rounded-full bg-gradient-to-r from-gold to-gold-soft px-9 py-3 text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_48px_-14px_oklch(0.72_0.14_88_/_0.75)] sm:mt-10 sm:px-11 sm:py-3.5"
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
            />
            <span className="relative">{t("landingCta")}</span>
          </motion.button>

          <motion.nav
            aria-label="Legal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.55, ease: easeOut }}
            className="relative z-10 mt-8 w-full max-w-md sm:mt-12"
          >
            <div
              aria-hidden
              className="mx-auto mb-4 h-px w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
            />
            <ul className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { to: "/about" as const, label: t("aboutMkitxavi") },
                  { to: "/support" as const, label: t("supportBtn") },
                  { to: "/feedback" as const, label: t("feedbackBtn") },
                  { to: "/guidelines" as const, label: t("guidelines") },
                  { to: "/privacy" as const, label: t("privacyPolicy") },
                  { to: "/terms" as const, label: t("termsOfService") },
                ] as const
              ).map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="glass-dark flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2.5 text-center text-[12px] font-medium leading-snug tracking-[0.02em] text-foreground/85 ring-1 ring-white/10 transition-colors hover:bg-white/5 hover:text-gold hover:ring-gold/30"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <SocialLinks className="mt-5" />
          </motion.nav>

          {/* Crawlable brand facts for Google / Gemini / Bing (below hero). */}
          <article className="relative z-10 mx-auto mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.08] to-transparent px-4 py-4 text-left sm:mt-10 sm:px-5 sm:py-5">
            <h2 className="font-serif text-[15px] leading-snug text-gradient-gold sm:text-base">
              {t("landingSeoTitle")}
            </h2>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
              {t("landingSeoBody")}
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
