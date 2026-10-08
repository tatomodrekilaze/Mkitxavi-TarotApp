import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ContentChrome } from "./ContentChrome";
import { FreeReadingCta } from "./FreeReadingCta";
import { TarotCardArt } from "./TarotCardArt";
import { useApp } from "@/context/AppContext";
import { cardsGroupedBySuit, SUIT_LABELS } from "@/lib/tarot-seo";

export function TarotHubPage() {
  return (
    <ContentChrome>
      <TarotHubBody />
    </ContentChrome>
  );
}

function TarotHubBody() {
  const { lang, t } = useApp();
  const isKa = (lang ?? "ka") !== "en";
  const groups = cardsGroupedBySuit();

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-purple rounded-[28px] p-6 sm:p-9"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">Mkitxavi</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-gradient-gold sm:text-4xl">
        {isKa ? "ონლაინ ტარო: 78 ბარათის მნიშვნელობები" : "Online tarot encyclopedia: 78 cards"}
      </h1>
      <p className="mt-5 text-sm leading-relaxed text-foreground/90">
        {isKa
          ? "Rider-Waite-Smith დეკის ყველა ბარათი ქართულად და ინგლისურად: საკვანძო სიტყვები და მნიშვნელობები. ყოველდღიური ტაროსთვის ან ცოცხალი უფასო მკითხაობისთვის დაბრუნდი მარიასთან ჩატში."
          : "Browse all Major Arcana and four suits. Each card has its own page. For a free online tarot reading, open chat with Maria on the home page."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <FreeReadingCta className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-soft px-7 text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_44px_-16px_oklch(0.72_0.14_88_/_0.85)]">
          {isKa ? "უფასო მკითხაობა მარიასთან" : t("landingCta")}
        </FreeReadingCta>
        <Link
          to="/guides"
          className="glass-dark inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-foreground/90 ring-1 ring-white/10 hover:text-gold hover:ring-gold/30"
        >
          {isKa ? "გზამკვლევები" : t("navGuides")}
        </Link>
      </div>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.suit}>
            <h2 className="font-serif text-xl text-gold/95">
              {isKa ? SUIT_LABELS[group.suit].ka : SUIT_LABELS[group.suit].en}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {group.cards.map((card) => (
                <li key={card.key}>
                  <Link
                    to="/tarot/$cardKey"
                    params={{ cardKey: card.key }}
                    className="glass-dark group flex h-full flex-col overflow-hidden rounded-xl ring-1 ring-white/10 transition-colors hover:ring-gold/35"
                  >
                    <TarotCardArt
                      card={card}
                      alt={isKa ? card.names.ka : card.names.en}
                      className="aspect-[2/3] w-full"
                    />
                    <span className="px-2 py-2 text-center text-[11px] font-medium leading-snug text-foreground/90 group-hover:text-gold">
                      {isKa ? card.names.ka : card.names.en}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </motion.article>
  );
}
