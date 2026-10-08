import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Brain, ArrowLeft, Sparkles, BookOpen, SunMedium } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SIGNS, getZodiac } from "@/lib/zodiac";
import { computeCompatibility } from "@/lib/compatibility";
import { QUIZ, scoreQuiz, ARCHETYPES, isArchetypeKey, type ArchetypeKey } from "@/lib/personality";
import { cardOfTheDay, cardsBySuit, type TarotCard, type TarotSuit } from "@/lib/tarot";
import { TarotCardArt } from "./TarotCardArt";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "menu" | "zodiac" | "personality" | "meanings" | "oracle";
type Lang = "en" | "ka";

export function ServicesPanel({ open, onClose }: Props) {
  const { t, lang, user } = useApp();
  const L = (lang ?? "en") as Lang;
  const [view, setView] = useState<View>("menu");

  const close = () => {
    setView("menu");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto overscroll-contain px-0 py-0 sm:items-center sm:px-4 sm:py-6"
          style={{
            background: "oklch(0.05 0.02 305 / 0.82)",
            backdropFilter: "blur(14px)",
          }}
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-purple relative my-auto max-h-[100dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[min(92dvh,720px)] sm:rounded-[28px] sm:p-6"
          >
            <button
              onClick={close}
              aria-label={t("close")}
              className="glass-dark absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-gold/80"
            >
              <X className="h-4 w-4" />
            </button>
            {view !== "menu" && (
              <button
                onClick={() => setView("menu")}
                aria-label={t("back")}
                className="glass-dark absolute left-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-gold/80"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="pt-8">
              {view === "menu" && <Menu onPick={setView} t={t} />}
              {view === "zodiac" && <ZodiacService lang={L} t={t} defaultBirth={user.birthDate} />}
              {view === "personality" && <PersonalityService lang={L} t={t} />}
              {view === "meanings" && <CardMeaningsService lang={L} t={t} />}
              {view === "oracle" && <DailyOracleService lang={L} t={t} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Menu({ onPick, t }: { onPick: (v: View) => void; t: (k: string) => string }) {
  const items: { view: View; icon: ReactNode; title: string; sub: string; tone: string }[] = [
    {
      view: "oracle",
      icon: <SunMedium className="h-5 w-5 text-amber-200" />,
      title: t("svcOracle"),
      sub: t("svcOracleSub"),
      tone: "from-amber-500/30 to-gold/20",
    },
    {
      view: "meanings",
      icon: <BookOpen className="h-5 w-5 text-violet-200" />,
      title: t("svcMeanings"),
      sub: t("svcMeaningsSub"),
      tone: "from-violet-500/30 to-purple/30",
    },
    {
      view: "zodiac",
      icon: <Heart className="h-5 w-5 text-pink-300" />,
      title: t("svcZodiac"),
      sub: t("svcZodiacSub"),
      tone: "from-pink-500/30 to-purple/30",
    },
    {
      view: "personality",
      icon: <Brain className="h-5 w-5 text-indigo-300" />,
      title: t("svcPersonality"),
      sub: t("svcPersonalitySub"),
      tone: "from-indigo-500/30 to-purple/30",
    },
  ];

  return (
    <div>
      <div className="text-center">
        <div className="text-4xl">🔮</div>
        <h2 className="mt-2 font-serif text-2xl text-gradient-gold">{t("services")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("servicesSub")}</p>
      </div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <button
            key={item.view}
            onClick={() => onPick(item.view)}
            className="glass-dark flex items-start gap-3 rounded-2xl p-4 text-left hover:gold-border"
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.tone}`}
            >
              {item.icon}
            </div>
            <div>
              <p className="font-serif text-lg text-gold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CardMeaningsService({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const [selected, setSelected] = useState<TarotCard | null>(null);

  const sections: { suit: TarotSuit; title: string }[] = [
    { suit: "major", title: t("arcanaMajor") },
    { suit: "wands", title: t("suitWands") },
    { suit: "cups", title: t("suitCups") },
    { suit: "swords", title: t("suitSwords") },
    { suit: "pentacles", title: t("suitPentacles") },
  ];

  return (
    <div>
      <div className="text-center">
        <div className="text-4xl">🃏</div>
        <h2 className="mt-2 font-serif text-2xl text-gradient-gold">{t("svcMeanings")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("svcMeaningsSub")}</p>
      </div>

      <div className="mt-5 space-y-6">
        {sections.map((section) => (
          <div key={section.suit}>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">
              {section.title}
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {cardsBySuit(section.suit).map((card) => (
                <motion.button
                  key={card.key}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelected(card)}
                  className="glass-dark flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl p-1.5 text-center hover:gold-border"
                >
                  <TarotCardArt
                    card={card}
                    alt={card.names[lang]}
                    className="aspect-[2/3] w-full rounded-xl"
                  />
                  <span className="px-1 pb-1 font-serif text-[11px] leading-tight text-foreground">
                    {card.names[lang]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <CardMeaningModal card={selected} lang={lang} t={t} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CardMeaningModal({
  card,
  lang,
  t,
  onClose,
}: {
  card: TarotCard;
  lang: Lang;
  t: (k: string) => string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      style={{ background: "oklch(0.05 0.02 305 / 0.72)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="mystic-scroll glass-purple relative max-h-[min(88dvh,640px)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl p-6"
      >
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="glass-dark absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-gold/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold/60">
            Rider–Waite–Smith · {card.glyph}
          </p>
          <TarotCardArt
            card={card}
            alt={card.names[lang]}
            className="mx-auto mt-3 aspect-[2/3] w-40 rounded-xl shadow-[0_12px_40px_-12px_oklch(0.78_0.14_88_/_0.55)]"
          />
          <h3 className="mt-3 font-serif text-2xl text-gradient-gold">{card.names[lang]}</h3>
          <p className="mt-1 text-xs uppercase tracking-widest text-gold/70">
            {card.keywords[lang]}
          </p>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{card.meanings[lang]}</p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3 text-sm font-semibold text-obsidian"
        >
          {t("close")}
        </button>
      </motion.div>
    </motion.div>
  );
}

function DailyOracleService({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const card = useMemo(() => cardOfTheDay(today), [today]);

  return (
    <div className="text-center">
      <div className="text-4xl">☀️</div>
      <h2 className="mt-2 font-serif text-2xl text-gradient-gold">{t("svcOracle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("svcOracleSub")}</p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark mt-6 rounded-3xl p-6 gold-border"
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold/60">{t("oracleToday")}</p>
        <TarotCardArt
          card={card}
          alt={card.names[lang]}
          className="mx-auto mt-4 aspect-[2/3] w-44 rounded-xl shadow-[0_16px_48px_-14px_oklch(0.78_0.14_88_/_0.6)]"
        />
        <p className="mt-3 text-xs font-bold text-gold/50">Rider–Waite–Smith · {card.glyph}</p>
        <h3 className="mt-1 font-serif text-2xl text-gradient-gold">{card.names[lang]}</h3>
        <p className="mt-1 text-xs uppercase tracking-widest text-gold/70">{card.keywords[lang]}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{card.meanings[lang]}</p>
        <p className="mt-5 text-xs text-gold/60">{t("oracleHint")}</p>
      </motion.div>
    </div>
  );
}

function ZodiacService({
  lang,
  t,
  defaultBirth,
}: {
  lang: Lang;
  t: (k: string) => string;
  defaultBirth: string;
}) {
  const defaultSign = getZodiac(defaultBirth)?.key ?? "aries";
  const [a, setA] = useState<string>(defaultSign);
  const [b, setB] = useState<string>("libra");

  const signA = SIGNS.find((s) => s.key === a)!;
  const signB = SIGNS.find((s) => s.key === b)!;

  const result = useMemo(
    () => computeCompatibility(a, b, signA.names[lang], signB.names[lang], lang),
    [a, b, lang, signA, signB],
  );

  return (
    <div>
      <div className="text-center">
        <div className="text-4xl">💞</div>
        <h2 className="mt-2 font-serif text-2xl text-gradient-gold">{t("svcZodiac")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("svcZodiacSub")}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SignPicker label={t("yourSign")} value={a} onChange={setA} lang={lang} />
        <SignPicker label={t("partnerSign")} value={b} onChange={setB} lang={lang} />
      </div>

      <div className="glass-dark mt-5 rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-3 text-4xl">
          <span>{signA.icon}</span>
          <span className="text-gold/60">✦</span>
          <span>{signB.icon}</span>
        </div>
        <div className="mt-3 font-serif text-5xl text-gradient-gold">{result.score}%</div>
        <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-gold/80">
          {result.label}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

        <div className="mt-5 space-y-2 text-left">
          <Bar label={t("bondLove")} value={result.bars.love} />
          <Bar label={t("bondFriendship")} value={result.bars.friendship} />
          <Bar label={t("bondGrowth")} value={result.bars.growth} />
        </div>
      </div>
    </div>
  );
}

function SignPicker({
  label,
  value,
  onChange,
  lang,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
}) {
  return (
    <label className="glass-dark block rounded-2xl p-3">
      <span className="text-[10px] uppercase tracking-widest text-gold/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-base font-semibold text-foreground outline-none"
      >
        {SIGNS.map((s) => (
          <option key={s.key} value={s.key} className="bg-obsidian text-foreground">
            {s.icon} {s.names[lang]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-gold/80">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-soft"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PersonalityResultView({
  archetypeKey,
  lang,
  t,
  onRedo,
}: {
  archetypeKey: ArchetypeKey;
  lang: Lang;
  t: (k: string) => string;
  onRedo: () => void;
}) {
  const arc = ARCHETYPES[archetypeKey];
  return (
    <div className="text-center">
      <div className="text-5xl">{arc.emoji}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-gold/70">
        {t("personalityResult")}
      </p>
      <h2 className="mt-1 font-serif text-3xl text-gradient-gold">{arc.names[lang]}</h2>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/55">
        {arc.vibe[lang]}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{arc.descs[lang]}</p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {arc.strengths[lang].map((s) => (
          <span
            key={s}
            className="glass-dark rounded-full px-3 py-1 text-xs font-semibold text-gold gold-border"
          >
            <Sparkles className="mr-1 inline h-3 w-3" />
            {s}
          </span>
        ))}
      </div>

      <button
        onClick={onRedo}
        className="mt-6 rounded-full border border-gold/50 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
      >
        {t("retakeQuiz")}
      </button>
    </div>
  );
}

function PersonalityService({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const { personalityArchetype, savePersonalityArchetype, clearPersonalityArchetype } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizMode, setQuizMode] = useState(false);

  useEffect(() => {
    // Reopening Services → Personality should show saved result, not restart.
    setQuizMode(false);
    setStep(0);
    setAnswers([]);
  }, [personalityArchetype]);

  const saved = isArchetypeKey(personalityArchetype) && !quizMode ? personalityArchetype : null;

  if (saved) {
    return (
      <PersonalityResultView
        archetypeKey={saved}
        lang={lang}
        t={t}
        onRedo={() => {
          void clearPersonalityArchetype();
          setAnswers([]);
          setStep(0);
          setQuizMode(true);
        }}
      />
    );
  }

  const done = step >= QUIZ.length;

  if (done) {
    const key = scoreQuiz(answers);
    return (
      <PersonalityResultView
        archetypeKey={key}
        lang={lang}
        t={t}
        onRedo={() => {
          void clearPersonalityArchetype();
          setAnswers([]);
          setStep(0);
          setQuizMode(true);
        }}
      />
    );
  }

  const q = QUIZ[step];
  return (
    <div>
      <div className="text-center">
        <div className="text-4xl">🜃</div>
        <h2 className="mt-2 font-serif text-2xl text-gradient-gold">{t("svcPersonality")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("svcPersonalitySub")}</p>
        <p className="mt-2 text-xs uppercase tracking-widest text-gold/70">
          {step + 1} / {QUIZ.length}
        </p>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-gold to-gold-soft transition-all"
          style={{ width: `${(step / QUIZ.length) * 100}%` }}
        />
      </div>

      <p className="mt-5 text-center font-serif text-lg text-foreground">{q.q[lang]}</p>

      <div className="mt-4 grid gap-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              const next = [...answers, i];
              setAnswers(next);
              if (step + 1 >= QUIZ.length) {
                const key = scoreQuiz(next);
                void savePersonalityArchetype(key);
                setStep(step + 1);
                setQuizMode(false);
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="glass-dark rounded-xl px-4 py-3 text-left text-sm text-foreground transition-colors hover:gold-border"
          >
            {opt.labels[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
