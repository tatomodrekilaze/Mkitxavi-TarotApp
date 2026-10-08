import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { drawThree, type TarotCard } from "@/lib/tarot";
import { useApp } from "@/context/AppContext";
import { TarotCardArt } from "./TarotCardArt";

interface Props {
  onResolved: (cards: TarotCard[]) => void;
}

const FAN_COUNT = 7;
const PICK = 3;
const RESOLVE_AFTER_MS = 1100;

export function FanSpread({ onResolved }: Props) {
  const { t, lang } = useApp();
  const drawn = useMemo(() => drawThree(), []);
  const deck = useMemo(() => Array.from({ length: FAN_COUNT }, (_, i) => ({ id: i })), []);

  const [picked, setPicked] = useState<number[]>([]);
  const [reading, setReading] = useState(false);
  const resolvedRef = useRef(false);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    if (!reading || resolvedRef.current) return;
    const timer = window.setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onResolvedRef.current(drawn);
    }, RESOLVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [reading, drawn]);

  const pick = (id: number) => {
    if (picked.includes(id) || picked.length >= PICK || reading) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length === PICK) setReading(true);
  };

  const pickedOrder = (id: number) => picked.indexOf(id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.16 0.08 300 / 0.9), oklch(0.05 0.02 305 / 0.97))",
        backdropFilter: "blur(8px)",
      }}
    >
      <AnimatePresence mode="wait">
        {!reading ? (
          <motion.p
            key="prompt"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-[14%] px-6 text-center font-serif text-xl text-gradient-gold sm:text-2xl"
          >
            {t("fanPrompt")}
            <span className="mt-2 block text-sm font-sans text-muted-foreground">
              {picked.length}/{PICK} {t("cardsChosen")}
            </span>
          </motion.p>
        ) : (
          <motion.p
            key="reading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-[16%] flex items-center gap-3 px-6 text-center font-serif text-2xl text-gradient-gold"
          >
            <span className="animate-pulse">✦</span> {t("reading")}{" "}
            <span className="animate-pulse">✦</span>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="relative mt-24 h-[340px] w-full max-w-2xl">
        {deck.map((slot, i) => {
          const mid = (FAN_COUNT - 1) / 2;
          const angle = (i - mid) * 11;
          const x = (i - mid) * 42;
          const y = Math.abs(i - mid) * 12;
          const isPicked = picked.includes(slot.id);
          const order = pickedOrder(slot.id);
          const revealCard = isPicked ? drawn[order] : null;
          const discard = reading && !isPicked;

          return (
            <motion.button
              key={slot.id}
              type="button"
              onClick={() => pick(slot.id)}
              disabled={reading || isPicked}
              initial={{ y: 400, opacity: 0, rotate: 0 }}
              animate={
                discard
                  ? { x, y: y + 220, rotate: angle * 1.4, opacity: 0, scale: 0.85 }
                  : isPicked
                    ? {
                        x: (order - 1) * 118,
                        y: -170,
                        rotate: 0,
                        scale: 1.15,
                        opacity: 1,
                      }
                    : { x, y: y + 40, rotate: angle, opacity: 1, scale: 1 }
              }
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 16,
                delay: isPicked || discard ? 0 : i * 0.06,
              }}
              whileHover={!isPicked && !reading ? { y: y + 10, scale: 1.05 } : {}}
              className="absolute left-1/2 top-0 -ml-[52px] h-[176px] w-[104px] origin-bottom disabled:cursor-default"
              style={{ zIndex: isPicked ? 50 + order : i }}
            >
              {isPicked && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-[10px]"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.85 0.14 88 / 0.55), transparent 70%)",
                    animation: "aura-trail 0.9s ease-out",
                  }}
                />
              )}
              <CardFace revealed={isPicked} card={revealCard} lang={lang ?? "en"} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function CardFace({
  revealed,
  card,
  lang,
}: {
  revealed: boolean;
  card: TarotCard | null;
  lang: "ka" | "en";
}) {
  return (
    <div
      className="relative h-full w-full rounded-[10px]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[10px] border"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(145deg, oklch(0.22 0.1 300), oklch(0.1 0.03 305))",
            borderColor: "oklch(0.78 0.14 88 / 0.5)",
            boxShadow: "0 8px 24px -6px oklch(0 0 0 / 0.7)",
          }}
        >
          <div className="grid h-full place-items-center">
            <span className="text-3xl text-gold/80">✶</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-gold/50">RWS</span>
          </div>
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[10px] border bg-black"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: "oklch(0.78 0.14 88 / 0.65)",
            boxShadow: "0 0 28px -4px oklch(0.78 0.14 88 / 0.55)",
          }}
        >
          {card ? (
            <>
              <TarotCardArt card={card} className="h-full w-full" alt={card.names[lang]} />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1.5 pt-6 text-center font-serif text-[10px] font-semibold leading-tight text-gold">
                {card.names[lang]}
              </span>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
