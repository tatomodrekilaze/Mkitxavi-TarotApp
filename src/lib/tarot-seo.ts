import { SITE_URL } from "@/lib/link-preview";
import { TAROT_DECK, type TarotCard, type TarotSuit } from "@/lib/tarot";

export const SUIT_ORDER: TarotSuit[] = ["major", "wands", "cups", "swords", "pentacles"];

export const SUIT_LABELS: Record<TarotSuit, { ka: string; en: string }> = {
  major: { ka: "მაჟორი არკანა", en: "Major Arcana" },
  wands: { ka: "კვერთხები", en: "Wands" },
  cups: { ka: "თასები", en: "Cups" },
  swords: { ka: "ხმლები", en: "Swords" },
  pentacles: { ka: "პენტაკლები", en: "Pentacles" },
};

export function getCardByKey(key: string): TarotCard | undefined {
  return TAROT_DECK.find((c) => c.key === key);
}

export function cardsGroupedBySuit(): Array<{ suit: TarotSuit; cards: TarotCard[] }> {
  return SUIT_ORDER.map((suit) => ({
    suit,
    cards: TAROT_DECK.filter((c) => c.suit === suit),
  }));
}

export function siblingCards(card: TarotCard): { prev?: TarotCard; next?: TarotCard } {
  const group = TAROT_DECK.filter((c) => c.suit === card.suit);
  const i = group.findIndex((c) => c.key === card.key);
  return {
    prev: i > 0 ? group[i - 1] : undefined,
    next: i >= 0 && i < group.length - 1 ? group[i + 1] : undefined,
  };
}

export function cardCanonical(key: string): string {
  return `${SITE_URL}/tarot/${key}`;
}

export function cardPageTitle(card: TarotCard): string {
  return `${card.names.ka} (${card.names.en}): ტაროს მნიშვნელობა | Mkitxavi`;
}

export function cardPageDescription(card: TarotCard): string {
  const kw = card.keywords.ka;
  const meaning = card.meanings.ka.slice(0, 140).replace(/\s+/g, " ").trim();
  return `${card.names.ka} / ${card.names.en}: ${kw}. ${meaning}… ონლაინ ტარო მარიასთან. mkitxavi.com`;
}

export function buildCardJsonLd(card: TarotCard) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${card.names.ka} / ${card.names.en}`,
    description: cardPageDescription(card),
    image: `${SITE_URL}${card.image}`,
    mainEntityOfPage: cardCanonical(card.key),
    inLanguage: "ka",
    about: {
      "@type": "Thing",
      name: card.names.en,
      alternateName: card.names.ka,
      description: card.meanings.en,
      image: `${SITE_URL}${card.image}`,
    },
    isPartOf: {
      "@type": "CollectionPage",
      name: "ტაროს ენციკლოპედია",
      url: `${SITE_URL}/tarot`,
    },
    publisher: {
      "@type": "Organization",
      name: "Mkitxavi",
      url: SITE_URL,
    },
  };
}

export function buildTarotHubJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ტაროს ენციკლოპედია: 78 ბარათი",
    url: `${SITE_URL}/tarot`,
    inLanguage: "ka",
    description:
      "ონლაინ ტარო და უფასო მკითხაობა: Rider-Waite-Smith ტაროს 78 ბარათის მნიშვნელობები ქართულად და ინგლისურად Mkitxavi.com-ზე.",
    hasPart: TAROT_DECK.map((c) => ({
      "@type": "ListItem",
      name: `${c.names.ka} / ${c.names.en}`,
      url: cardCanonical(c.key),
    })),
  };
}
