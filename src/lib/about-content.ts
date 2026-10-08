import type { Lang } from "@/lib/i18n";
import type { LegalSection } from "@/components/LegalPage";

interface AboutDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const ABOUT_DOCS: Record<Lang, AboutDoc> = {
  en: {
    title: "About Mkitxavi",
    updated: "Open-source edition",
    intro:
      "Mkitxavi is a tarot and astrology app in Georgian and English. Maria, an AI character, helps you explore a question through cards and conversation.",
    sections: [
      {
        heading: "What you can explore",
        body: [
          "Ask about a relationship, reflect on a dream, or try a tarot reading. You can also browse all 78 cards, compare zodiac signs, and save your conversations.",
        ],
      },
      {
        heading: "A little perspective",
        body: [
          "Readings are for entertainment and reflection. Maria can make mistakes and cannot know the future. Use your own judgment when making decisions.",
        ],
      },
      {
        heading: "Run your own copy",
        body: [
          "The original project has been retired and its source shared. Each deployment uses its own accounts, services, and contact details.",
        ],
      },
    ],
  },
  ka: {
    title: "Mkitxavi-ს შესახებ",
    updated: "ღია კოდის ვერსია",
    intro:
      "Mkitxavi არის ტაროსა და ასტროლოგიის აპი ქართულად და ინგლისურად. მარია, ხელოვნური ინტელექტის პერსონაჟი, ბარათებისა და საუბრის საშუალებით გეხმარება შენს კითხვაზე დაფიქრებაში.",
    sections: [
      {
        heading: "რისი გამოცდა შეგიძლია",
        body: [
          "დასვი კითხვა ურთიერთობაზე, დაფიქრდი სიზმარზე ან სცადე ტაროს გაშლა. შეგიძლია გაეცნო 78 ბარათს, შეადარო ზოდიაქოს ნიშნები და შეინახო საუბრები.",
        ],
      },
      {
        heading: "რას უნდა ელოდო",
        body: [
          "წაკითხვები გასართობად და დასაფიქრებლადაა. მარია შეიძლება შეცდეს და მომავლის ცოდნა არ შეუძლია. გადაწყვეტილებების მიღებისას საკუთარ განსჯას დაეყრდენი.",
        ],
      },
      {
        heading: "საკუთარი ვერსია",
        body: [
          "თავდაპირველი პროექტი დასრულებულია და მისი კოდი ღიაა. თითოეული ვერსია საკუთარ ანგარიშებს, სერვისებსა და საკონტაქტო ინფორმაციას იყენებს.",
        ],
      },
    ],
  },
};
