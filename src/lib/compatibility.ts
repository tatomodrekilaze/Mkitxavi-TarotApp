import type { Lang, LocaleCode } from "./i18n";

// Element groupings, the backbone of astrological compatibility.
const ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> = {
  aries: "fire",
  leo: "fire",
  sagittarius: "fire",
  taurus: "earth",
  virgo: "earth",
  capricorn: "earth",
  gemini: "air",
  libra: "air",
  aquarius: "air",
  cancer: "water",
  scorpio: "water",
  pisces: "water",
};

// Modality (cardinal/fixed/mutable), same modality = friction.
const MODALITY: Record<string, "cardinal" | "fixed" | "mutable"> = {
  aries: "cardinal",
  cancer: "cardinal",
  libra: "cardinal",
  capricorn: "cardinal",
  taurus: "fixed",
  leo: "fixed",
  scorpio: "fixed",
  aquarius: "fixed",
  gemini: "mutable",
  virgo: "mutable",
  sagittarius: "mutable",
  pisces: "mutable",
};

const COMPLEMENT: Record<string, string> = {
  fire: "air",
  air: "fire",
  earth: "water",
  water: "earth",
};

export interface Compatibility {
  score: number; // 0-100
  label: string;
  summary: string;
  bars: { love: number; friendship: number; growth: number };
}

const LABELS: Record<LocaleCode, { levels: string[]; tone: (s: string) => string }> = {
  en: {
    levels: ["Turbulent", "Curious", "Balanced", "Magnetic", "Cosmic Twin Flame"],
    tone: (s) => s,
  },
  ka: {
    levels: ["მშფოთვარე", "ცნობისმოყვარე", "დაბალანსებული", "მაგნიტური", "კოსმიური ტყუპისულები"],
    tone: (s) => s,
  },
  ru: {
    levels: ["Бурное", "Любопытное", "Уравновешенное", "Магнетическое", "Космические близнецы"],
    tone: (s) => s,
  },
};

const SUMMARIES: Record<LocaleCode, (a: string, b: string, level: number) => string> = {
  en: (a, b, l) =>
    [
      `${a} and ${b} strike sparks, passionate, but volatile. Handle with care.`,
      `${a} and ${b} share curiosity. There's warmth, if you both stay open.`,
      `${a} and ${b} move in harmony. A grounded, honest bond.`,
      `${a} and ${b} pull toward each other like moon and tide. Deep chemistry.`,
      `${a} and ${b} are cosmic twin flames, a rare, luminous union.`,
    ][l],
  ka: (a, b, l) =>
    [
      `${a} და ${b} - მათ შორის ნაპერწკლები დაფრინავს, ვნებიანი, მაგრამ ცვალებადი.`,
      `${a} და ${b} იზიარებენ ცნობისმოყვარეობას. სითბოა, თუ ორივე გულღიაა.`,
      `${a} და ${b} მოძრაობენ ჰარმონიაში. მიწიერი, გულწრფელი კავშირი.`,
      `${a} და ${b} ერთმანეთისკენ იზიდებიან, როგორც მთვარე და მოქცევა. ღრმა ქიმია.`,
      `${a} და ${b} კოსმიური ტყუპისულებია - იშვიათი, განათებული კავშირი.`,
    ][l],
  ru: (a, b, l) =>
    [
      `${a} и ${b} высекают искры, страстно, но неустойчиво.`,
      `${a} и ${b} разделяют любопытство. Есть тепло, если оба открыты.`,
      `${a} и ${b} движутся в гармонии. Заземлённая, честная связь.`,
      `${a} и ${b} тянутся друг к другу как луна и прилив. Глубокая химия.`,
      `${a} и ${b}, космические близнецы. Редкий, светящийся союз.`,
    ][l],
};

export function computeCompatibility(
  aKey: string,
  bKey: string,
  aName: string,
  bName: string,
  lang: Lang,
): Compatibility {
  const eA = ELEMENTS[aKey];
  const eB = ELEMENTS[bKey];
  const mA = MODALITY[aKey];
  const mB = MODALITY[bKey];

  let score = 55;
  if (eA === eB) score += 20;
  else if (COMPLEMENT[eA] === eB) score += 30;
  else score -= 5;

  if (mA === mB && mA === "fixed")
    score -= 15; // fixed x fixed = stubborn clash
  else if (mA === mB) score -= 5;
  else score += 5;

  if (aKey === bKey) score = Math.max(score, 78); // mirrored souls

  score = Math.max(12, Math.min(99, score));

  const levelIdx = Math.min(4, Math.floor(score / 20));
  const labels = LABELS[lang];

  return {
    score,
    label: labels.levels[levelIdx],
    summary: SUMMARIES[lang](aName, bName, levelIdx),
    bars: {
      love: Math.min(99, score + (COMPLEMENT[eA] === eB ? 8 : 0)),
      friendship: Math.min(99, eA === eB ? score + 10 : score - 3),
      growth: Math.min(99, mA !== mB ? score + 6 : score - 8),
    },
  };
}
