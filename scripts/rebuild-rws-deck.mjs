/**
 * Rebuilds tarot-deck.json as classic Rider–Waite–Smith (78 cards):
 * - Public-domain Pamela Colman Smith scans in /public/tarot
 * - Upright meanings from the standard corpora RWS interpretations
 * - image path on every card
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MAJOR_META = [
  ["fool", "0", "ar00"],
  ["magician", "I", "ar01"],
  ["high-priestess", "II", "ar02"],
  ["empress", "III", "ar03"],
  ["emperor", "IV", "ar04"],
  ["hierophant", "V", "ar05"],
  ["lovers", "VI", "ar06"],
  ["chariot", "VII", "ar07"],
  ["strength", "VIII", "ar08"],
  ["hermit", "IX", "ar09"],
  ["wheel", "X", "ar10"],
  ["justice", "XI", "ar11"],
  ["hanged-man", "XII", "ar12"],
  ["death", "XIII", "ar13"],
  ["temperance", "XIV", "ar14"],
  ["devil", "XV", "ar15"],
  ["tower", "XVI", "ar16"],
  ["star", "XVII", "ar17"],
  ["moon", "XVIII", "ar18"],
  ["sun", "XIX", "ar19"],
  ["judgement", "XX", "ar20"],
  ["world", "XXI", "ar21"],
];

const RANK_FILE = {
  ace: "ac",
  two: "02",
  three: "03",
  four: "04",
  five: "05",
  six: "06",
  seven: "07",
  eight: "08",
  nine: "09",
  ten: "10",
  page: "pa",
  knight: "kn",
  queen: "qu",
  king: "ki",
};

const SUIT_FILE = { wands: "wa", cups: "cu", swords: "sw", pentacles: "pe" };
const SUIT_LABEL = { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pentacles" };
const RANK_LABEL = {
  ace: "Ace",
  two: "Two",
  three: "Three",
  four: "Four",
  five: "Five",
  six: "Six",
  seven: "Seven",
  eight: "Eight",
  nine: "Nine",
  ten: "Ten",
  page: "Page",
  knight: "Knight",
  queen: "Queen",
  king: "King",
};

const CORPUS_MAJOR = {
  fool: "The Fool",
  magician: "The Magician",
  "high-priestess": "The Papess/High Priestess",
  empress: "The Empress",
  emperor: "The Emperor",
  hierophant: "The Pope/Hierophant",
  lovers: "The Lovers",
  chariot: "The Chariot",
  strength: "Strength",
  hermit: "The Hermit",
  wheel: "The Wheel",
  justice: "Justice",
  "hanged-man": "The Hanged Man",
  death: "Death",
  temperance: "Temperance",
  devil: "The Devil",
  tower: "The Tower",
  star: "The Star",
  moon: "The Moon",
  sun: "The Sun",
  judgement: "Judgement",
  world: "The World",
};

const DISPLAY_MAJOR = {
  fool: "The Fool",
  magician: "The Magician",
  "high-priestess": "The High Priestess",
  empress: "The Empress",
  emperor: "The Emperor",
  hierophant: "The Hierophant",
  lovers: "The Lovers",
  chariot: "The Chariot",
  strength: "Strength",
  hermit: "The Hermit",
  wheel: "Wheel of Fortune",
  justice: "Justice",
  "hanged-man": "The Hanged Man",
  death: "Death",
  temperance: "Temperance",
  devil: "The Devil",
  tower: "The Tower",
  star: "The Star",
  moon: "The Moon",
  sun: "The Sun",
  judgement: "Judgement",
  world: "The World",
};

function L(en) {
  return { en, ka: en, ru: en };
}

function meaningFromCorpus(c) {
  const light = (c.meanings?.light ?? []).slice(0, 3).join("; ");
  const fortune = (c.fortune_telling ?? []).slice(0, 2).join(". ");
  const end = /[.!?]$/.test(fortune) ? "" : ".";
  return `${fortune}${end} In the upright Rider–Waite–Smith sense: ${light}.`;
}

function keywordsFromCorpus(c) {
  return (c.keywords ?? [])
    .slice(0, 4)
    .map((k) => k[0].toUpperCase() + k.slice(1))
    .join(" · ");
}

const res = await fetch(
  "https://raw.githubusercontent.com/dariusk/corpora/master/data/divination/tarot_interpretations.json",
);
const corpus = (await res.json()).tarot_interpretations;
const byName = Object.fromEntries(corpus.map((c) => [c.name, c]));

const deck = [];

for (const [key, glyph, file] of MAJOR_META) {
  const c = byName[CORPUS_MAJOR[key]];
  if (!c) throw new Error("Missing corpus major: " + key);
  const name = DISPLAY_MAJOR[key];
  deck.push({
    key,
    glyph,
    suit: "major",
    image: `/tarot/${file}.jpg`,
    names: L(name),
    keywords: L(keywordsFromCorpus(c)),
    meanings: L(meaningFromCorpus(c)),
  });
}

const ranks = Object.keys(RANK_FILE);
const suits = Object.keys(SUIT_FILE);

for (const suit of suits) {
  for (const rank of ranks) {
    const key = `${rank}-${suit}`;
    const corpusName = suit === "pentacles" ? `${rank} of coins` : `${rank} of ${suit}`;
    const c = byName[corpusName];
    if (!c) throw new Error("Missing corpus minor: " + corpusName);
    const name = `${RANK_LABEL[rank]} of ${SUIT_LABEL[suit]}`;
    const file = `${SUIT_FILE[suit]}${RANK_FILE[rank]}`;
    const n =
      rank === "page" || rank === "knight" || rank === "queen" || rank === "king"
        ? ""
        : rank === "ace"
          ? "A"
          : RANK_LABEL[rank].slice(0, 1) === "T" && rank === "ten"
            ? "10"
            : rank === "two"
              ? "2"
              : rank === "three"
                ? "3"
                : rank === "four"
                  ? "4"
                  : rank === "five"
                    ? "5"
                    : rank === "six"
                      ? "6"
                      : rank === "seven"
                        ? "7"
                        : rank === "eight"
                          ? "8"
                          : rank === "nine"
                            ? "9"
                            : "";
    const courtGlyph = { page: "P", knight: "Kn", queen: "Q", king: "K" }[rank];
    deck.push({
      key,
      glyph:
        courtGlyph ??
        (rank === "ace"
          ? "A"
          : rank === "ten"
            ? "10"
            : String(
                ["two", "three", "four", "five", "six", "seven", "eight", "nine"].indexOf(rank) + 2,
              )),
      suit,
      image: `/tarot/${file}.jpg`,
      names: L(name),
      keywords: L(keywordsFromCorpus(c)),
      meanings: L(meaningFromCorpus(c)),
    });
  }
}

const out = join(root, "src", "lib", "tarot-deck.json");
// Rebuild the deck structure without discarding edited copy or translations.
if (existsSync(out)) {
  const previous = JSON.parse(readFileSync(out, "utf8"));
  const copyByKey = new Map(previous.map((card) => [card.key, card]));
  for (const card of deck) {
    const copy = copyByKey.get(card.key);
    if (!copy) continue;
    card.names = copy.names;
    card.keywords = copy.keywords;
    card.meanings = copy.meanings;
  }
}
writeFileSync(out, JSON.stringify(deck, null, 2) + "\n", "utf8");
console.log("wrote", deck.length, "cards");
console.log(deck[0].key, deck[0].image, deck[0].keywords.en);
console.log(deck[22].key, deck[22].image);
console.log(deck[77].key, deck[77].image);
