import type { Lang, LocaleCode } from "./i18n";
import deckJson from "./tarot-deck.json";

export type TarotSuit = "major" | "wands" | "cups" | "swords" | "pentacles";

export interface TarotCard {
  key: string;
  glyph: string;
  suit: TarotSuit;
  image: string;
  names: Record<LocaleCode, string>;
  keywords: Record<LocaleCode, string>;
  meanings: Record<LocaleCode, string>;
}

export const TAROT_DECK = deckJson as TarotCard[];

/** Re-attach full deck fields (image path, names) after cloud/local restore. */
export function hydrateCards(raw: unknown): TarotCard[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: TarotCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const key = "key" in item ? String((item as { key: unknown }).key) : "";
    if (!key) continue;
    const full = TAROT_DECK.find((c) => c.key === key);
    if (full) out.push(full);
  }
  return out.length ? out : undefined;
}

export function cardsBySuit(suit: TarotSuit): TarotCard[] {
  return TAROT_DECK.filter((c) => c.suit === suit);
}

export function majorArcana(): TarotCard[] {
  return cardsBySuit("major");
}

/** Fisher–Yates shuffle, then take three. */
export function drawThree(): TarotCard[] {
  const pool = [...TAROT_DECK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Stable card of the day for a YYYY-MM-DD date. */
export function cardOfTheDay(dateISO: string): TarotCard {
  let hash = 0;
  for (let i = 0; i < dateISO.length; i++) {
    hash = (hash * 31 + dateISO.charCodeAt(i)) >>> 0;
  }
  return TAROT_DECK[hash % TAROT_DECK.length];
}

const POSITIONS: Record<LocaleCode, [string, string, string]> = {
  en: ["Past / foundation", "Present / crossing", "Future / counsel"],
  ka: [
    "\u10ec\u10d0\u10e0\u10e1\u10e3\u10da\u10d8 / \u10e1\u10d0\u10e4\u10e3\u10eb\u10d5\u10d4\u10da\u10d8",
    "\u10d0\u10ec\u10db\u10e7\u10dd / \u10d2\u10d0\u10d3\u10d0\u10d9\u10d5\u10d4\u10d7\u10d0",
    "\u10db\u10dd\u10db\u10d0\u10d5\u10d0\u10da\u10d8 / \u10e0\u10e9\u10d4\u10d5\u10d0",
  ],
  ru: [
    "\u041f\u0440\u043e\u0448\u043b\u043e\u0435 / \u043e\u0441\u043d\u043e\u0432\u0430",
    "\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0435\u0435 / \u043f\u0435\u0440\u0435\u0445\u043e\u0434",
    "\u0411\u0443\u0434\u0443\u0449\u0435\u0435 / \u0441\u043e\u0432\u0435\u0442",
  ],
};

const INTROS: Record<LocaleCode, string> = {
  en: "The cards are drawn in the classic three-card spread of the Rider–Waite–Smith tradition:",
  ka: "\u10d9\u10d0\u10e0\u10e2\u10d4\u10d1\u10d8 \u10d2\u10d0\u10e8\u10da\u10d8\u10da\u10d8\u10d0 Rider\u2013Waite\u2013Smith \u10e2\u10e0\u10d0\u10d3\u10d8\u10ea\u10d8\u10d8\u10e1 \u10d9\u10da\u10d0\u10e1\u10d8\u10d9\u10e3\u10e0 \u10e1\u10d0\u10db\u10d9\u10d0\u10e0\u10e2\u10d8\u10d0\u10dc \u10d2\u10d0\u10e8\u10da\u10d0\u10e8\u10d8:",
  ru: "\u041a\u0430\u0440\u0442\u044b \u0432\u044b\u043f\u0430\u043b\u0438 \u0432 \u043a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u043e\u043c \u0442\u0440\u0451\u0445\u043a\u0430\u0440\u0442\u043e\u0447\u043d\u043e\u043c \u0440\u0430\u0441\u043a\u043b\u0430\u0434\u0435 \u0442\u0440\u0430\u0434\u0438\u0446\u0438\u0438 \u0420\u0430\u0439\u0434\u0435\u0440\u0430\u2013\u0423\u044d\u0439\u0442\u0430\u2013\u0421\u043c\u0438\u0442:",
};

const OUTROS: Record<LocaleCode, string> = {
  en: "Read them together: what was sown, what is alive now, and what asks your next honest step.",
  ka: "\u10ec\u10d0\u10d8\u10d9\u10d8\u10d7\u10ee\u10d4 \u10d4\u10e0\u10d7\u10d0\u10d3: \u10e0\u10d0 \u10d3\u10d0\u10d8\u10d7\u10d4\u10e1\u10d0, \u10e0\u10d0 \u10ea\u10dd\u10ea\u10ee\u10da\u10dd\u10d1\u10e1 \u10d0\u10ee\u10da\u10d0 \u10d3\u10d0 \u10e0\u10d0 \u10d8\u10d7\u10ee\u10dd\u10d5\u10e1 \u10e8\u10d4\u10dc\u10e1 \u10e8\u10d4\u10db\u10d3\u10d4\u10d2 \u10d2\u10e3\u10da\u10ec\u10e0\u10e4\u10d4\u10da \u10dc\u10d0\u10d1\u10d8\u10ef\u10e1.",
  ru: "\u0427\u0438\u0442\u0430\u0439 \u0438\u0445 \u0432\u043c\u0435\u0441\u0442\u0435: \u0447\u0442\u043e \u0431\u044b\u043b\u043e \u043f\u043e\u0441\u0435\u044f\u043d\u043e, \u0447\u0442\u043e \u0436\u0438\u0432\u043e \u0441\u0435\u0439\u0447\u0430\u0441 \u0438 \u043a\u0430\u043a\u043e\u0439 \u0447\u0435\u0441\u0442\u043d\u044b\u0439 \u0448\u0430\u0433 \u043f\u0440\u043e\u0441\u0438\u0442 \u0431\u0443\u0434\u0443\u0449\u0435\u0435.",
};

/** Classic upright RWS three-card reading from each card's own meaning. */
export function buildReading(cards: TarotCard[], lang: Lang): string {
  const pos = POSITIONS[lang];
  const lines = cards.map((c, i) => {
    const name = c.names[lang];
    const kw = c.keywords[lang];
    const meaning = c.meanings[lang];
    return `${pos[i]}, ${name}: ${kw}. ${meaning}`;
  });
  return [INTROS[lang], "", ...lines, "", OUTROS[lang]].join("\n");
}
