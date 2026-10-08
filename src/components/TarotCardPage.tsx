import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ContentChrome } from "./ContentChrome";
import { FreeReadingCta } from "./FreeReadingCta";
import { TarotCardArt } from "./TarotCardArt";
import { useApp } from "@/context/AppContext";
import type { TarotCard } from "@/lib/tarot";
import { siblingCards, SUIT_LABELS } from "@/lib/tarot-seo";

interface Props {
  card: TarotCard;
}

export function TarotCardPageView({ card }: Props) {
  return (
    <ContentChrome
      extraLinks={[
        { to: "/tarot", label: "ტაროს ენციკლოპედია" },
        { to: "/guides", label: "გზამკვლევები" },
      ]}
    >
      <TarotCardBody card={card} />
    </ContentChrome>
  );
}

function TarotCardBody({ card }: Props) {
  const { lang, t } = useApp();
  const isKa = (lang ?? "ka") !== "en";
  const { prev, next } = siblingCards(card);
  const suit = SUIT_LABELS[card.suit];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-purple rounded-[28px] p-6 sm:p-9"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
        {isKa ? suit.ka : suit.en}
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-gradient-gold sm:text-4xl">
        {isKa ? card.names.ka : card.names.en}
      </h1>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-xl border border-gold/35 bg-black/30 shadow-[0_18px_40px_-20px_oklch(0.55_0.14_85_/_0.55)] sm:mx-0 sm:w-48">
          <TarotCardArt
            card={card}
            alt={isKa ? card.names.ka : card.names.en}
            className="aspect-[2/3] w-full"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          <section>
            <h2 className="font-serif text-lg text-gold/95">
              {isKa ? "საკვანძო სიტყვები" : "Keywords"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {isKa ? card.keywords.ka : card.keywords.en}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-lg text-gold/95">{isKa ? "მნიშვნელობა" : "Meaning"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {isKa ? card.meanings.ka : card.meanings.en}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-lg text-gold/95">
              {isKa ? "როგორ გამოვიყენოთ" : "How to use"}
            </h2>
            {isKa ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                თუ ეს ბარათი გამოგივიდა გაშლაში, შეადარე საკვანძო სიტყვები შენს კითხვას და ერთი
                პრაქტიკული ნაბიჯი აირჩიე. სრული დეკისთვის იხილე{" "}
                <Link to="/tarot" className="text-gold/90 underline-offset-2 hover:underline">
                  ტაროს ენციკლოპედია
                </Link>
                , ხოლო კითხვის ფორმულირებისთვის იხილე{" "}
                <Link
                  to="/guides/$slug"
                  params={{ slug: "how-to-ask-tarot" }}
                  className="text-gold/90 underline-offset-2 hover:underline"
                >
                  გზამკვლევი
                </Link>
                .
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                If this card appears in a spread, match its keywords to your question and pick one
                practical next step. Browse the full deck in the encyclopedia, or chat with Maria
                for a live reading.
              </p>
            )}
          </section>
        </div>
      </div>

      <FreeReadingCta className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-soft px-7 text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_44px_-16px_oklch(0.72_0.14_88_/_0.85)]">
        {isKa ? "უფასო მკითხაობა მარიასთან" : t("landingCta")}
      </FreeReadingCta>

      <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm">
        {prev ? (
          <Link
            to="/tarot/$cardKey"
            params={{ cardKey: prev.key }}
            className="text-gold/85 hover:text-gold"
          >
            ← {isKa ? prev.names.ka : prev.names.en}
          </Link>
        ) : (
          <span />
        )}
        <Link to="/tarot" className="text-muted-foreground hover:text-gold">
          {isKa ? "ყველა ბარათი" : "All cards"}
        </Link>
        {next ? (
          <Link
            to="/tarot/$cardKey"
            params={{ cardKey: next.key }}
            className="text-gold/85 hover:text-gold"
          >
            {isKa ? next.names.ka : next.names.en} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </motion.article>
  );
}
