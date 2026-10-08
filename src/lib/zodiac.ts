import type { LocaleCode } from "./i18n";

export interface Zodiac {
  key: string;
  icon: string; // constellation glyph
  names: Record<LocaleCode, string>;
}

export const SIGNS: (Zodiac & { from: [number, number]; to: [number, number] })[] = [
  {
    key: "aries",
    icon: "♈",
    from: [3, 21],
    to: [4, 19],
    names: { en: "Aries", ka: "ვერძი", ru: "Овен" },
  },
  {
    key: "taurus",
    icon: "♉",
    from: [4, 20],
    to: [5, 20],
    names: { en: "Taurus", ka: "კურო", ru: "Телец" },
  },
  {
    key: "gemini",
    icon: "♊",
    from: [5, 21],
    to: [6, 20],
    names: { en: "Gemini", ka: "ტყუპები", ru: "Близнецы" },
  },
  {
    key: "cancer",
    icon: "♋",
    from: [6, 21],
    to: [7, 22],
    names: { en: "Cancer", ka: "კირჩხიბი", ru: "Рак" },
  },
  {
    key: "leo",
    icon: "♌",
    from: [7, 23],
    to: [8, 22],
    names: { en: "Leo", ka: "ლომი", ru: "Лев" },
  },
  {
    key: "virgo",
    icon: "♍",
    from: [8, 23],
    to: [9, 22],
    names: { en: "Virgo", ka: "ქალწული", ru: "Дева" },
  },
  {
    key: "libra",
    icon: "♎",
    from: [9, 23],
    to: [10, 22],
    names: { en: "Libra", ka: "სასწორი", ru: "Весы" },
  },
  {
    key: "scorpio",
    icon: "♏",
    from: [10, 23],
    to: [11, 21],
    names: { en: "Scorpio", ka: "მორიელი", ru: "Скорпион" },
  },
  {
    key: "sagittarius",
    icon: "♐",
    from: [11, 22],
    to: [12, 21],
    names: { en: "Sagittarius", ka: "მშვილდოსანი", ru: "Стрелец" },
  },
  {
    key: "capricorn",
    icon: "♑",
    from: [12, 22],
    to: [1, 19],
    names: { en: "Capricorn", ka: "თხის რქა", ru: "Козерог" },
  },
  {
    key: "aquarius",
    icon: "♒",
    from: [1, 20],
    to: [2, 18],
    names: { en: "Aquarius", ka: "მერწყული", ru: "Водолей" },
  },
  {
    key: "pisces",
    icon: "♓",
    from: [2, 19],
    to: [3, 20],
    names: { en: "Pisces", ka: "თევზები", ru: "Рыбы" },
  },
];

export function getZodiac(dateStr: string): Zodiac | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();

  for (const s of SIGNS) {
    const [fm, fd] = s.from;
    const [tm, td] = s.to;
    if (fm === tm) {
      if (month === fm && day >= fd && day <= td) return s;
    } else if (fm < tm) {
      if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm))
        return s;
    } else {
      // wraps year end (capricorn)
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return s;
    }
  }
  return null;
}
