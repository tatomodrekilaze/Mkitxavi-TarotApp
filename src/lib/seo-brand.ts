import { OG_IMAGE_URL, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/link-preview";

/** Shared site metadata for search results and link previews. */
export const BRAND = {
  name: "Mkitxavi",
  nameKa: "მკითხავი",
  domain: "mkitxavi.com",
  url: SITE_URL,
  email: "support@mkitxavi.com",
  product: "Maria",
  /** Explicitly not the competitor. */
  notAffiliatedWith: "mkitxavi.ge",
  taglineKa: "ონლაინ მკითხაობა ტაროზე მარიასთან",
  disambiguationEn:
    "Mkitxavi is a Georgian and English tarot app with Maria, an AI character. Explore readings, card meanings, and astrology.",
  disambiguationKa:
    "Mkitxavi არის ტაროსა და ასტროლოგიის აპი ქართულად და ინგლისურად, მარიასთან, ხელოვნური ინტელექტის პერსონაჟთან.",
  social: {
    tiktok: "https://www.tiktok.com/@mkitxavii",
    instagram: "https://www.instagram.com/mkitxavii/",
    facebook: "https://www.facebook.com/mkitxavi",
  },
} as const;

export function buildSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: BRAND.name,
        alternateName: [BRAND.nameKa, "Mkitxavi.com", "მკითხავი.com", "Maria tarot"],
        url: `${SITE_URL}/`,
        inLanguage: ["ka", "en"],
        description: SITE_DESCRIPTION,
        disambiguatingDescription: BRAND.disambiguationEn,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND.name,
        legalName: "Mkitxavi",
        alternateName: [BRAND.nameKa, "Mkitxavi.com"],
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand-icon.png`,
        image: OG_IMAGE_URL,
        email: BRAND.email,
        sameAs: [BRAND.social.tiktok, BRAND.social.instagram, BRAND.social.facebook],
        description: BRAND.disambiguationEn,
        disambiguatingDescription: BRAND.disambiguationEn,
        foundingLocation: {
          "@type": "Place",
          name: "Georgia",
          address: { "@type": "PostalAddress", addressCountry: "GE" },
        },
        knowsAbout: [
          "ტარო",
          "tarot",
          "taro",
          "მკითხაობა",
          "reading",
          "ონლაინ ტარო",
          "online tarot",
          "უფასო ტარო",
          "free tarot",
          "free taro",
          "უფასო მკითხაობა",
          "free reading",
          "სიყვარულზე მკითხაობა",
          "love reading",
          "love tarot",
          "ზოდიაქოების თავსებადობა",
          "zodiac compatibility",
          "პერსონალიტის ტესტები",
          "personality tests",
          "ყოველდღიური ტარო",
          "everyday tarot",
          "everyday taro",
          "ტაროს ბარათების მნიშვნელობები",
          "tarot card meanings",
          "ყავაზე მკითხაობა",
          "coffee cup reading",
          "ასტროლოგია",
          "astrology",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: BRAND.email,
          contactType: "customer support",
          availableLanguage: ["ka", "en"],
          url: `${SITE_URL}/support`,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Mkitxavi - Maria",
        alternateName: ["მკითხავი მარია", "Maria tarot chat"],
        url: `${SITE_URL}/`,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: ["ka", "en"],
        description: SITE_DESCRIPTION,
        disambiguatingDescription: BRAND.disambiguationEn,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free daily energy for a free reading start (free tarot / free taro)",
        },
        provider: { "@id": `${SITE_URL}/#organization` },
        featureList: [
          "უფასო ონლაინ ტარო და მკითხაობა ჩატში მარიასთან",
          "უფასო ყოველდღიური ენერგია უფასო მკითხაობის დასაწყისისთვის",
          "სიყვარულზე მკითხაობა",
          "ზოდიაქოების თავსებადობა",
          "პერსონალიტის / პიროვნების არქეტიპის წაკითხვა",
          "ყოველდღიური ტარო და 78 ბარათის მნიშვნელობები",
          "ყავაზე მკითხაობა",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is mkitxavi.com?",
            acceptedAnswer: {
              "@type": "Answer",
              text: BRAND.disambiguationEn,
            },
          },
          {
            "@type": "Question",
            name: "Who operates this copy of Mkitxavi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "This is an independent open-source project. Each deployment is operated separately.",
            },
          },
          {
            "@type": "Question",
            name: "რა არის Mkitxavi.com?",
            acceptedAnswer: {
              "@type": "Answer",
              text: BRAND.disambiguationKa,
            },
          },
          {
            "@type": "Question",
            name: "ვინ მართავს Mkitxavi-ს ამ ვერსიას?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "ეს დამოუკიდებელი ღია კოდის პროექტია. თითოეულ ვერსიას საკუთარი ოპერატორი ჰყავს.",
            },
          },
          {
            "@type": "Question",
            name: "არის თუ არა ონლაინ ტარო უფასო?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "დიახ. Mkitxavi.com გაძლევს უფასო ყოველდღიურ ენერგიას უფასო მკითხაობის დასაწყისისთვის. შეგიძლია ონლაინ ტარო, სიყვარულზე მკითხაობა, ზოდიაქოების თავსებადობა და პიროვნების არქეტიპი იმავე აპში.",
            },
          },
          {
            "@type": "Question",
            name: "Is there free tarot / free taro reading?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Free daily energy on https://mkitxavi.com covers a free online tarot (also searched as free taro) reading start with Maria each day.",
            },
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: SITE_TITLE,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        description: SITE_DESCRIPTION,
        inLanguage: "ka",
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#tarot-encyclopedia`,
        name: "ტაროს ენციკლოპედია / Tarot encyclopedia",
        description:
          "78 Rider–Waite–Smith tarot card meanings in Georgian and English on Mkitxavi.com.",
        url: `${SITE_URL}/tarot`,
        numberOfItems: 78,
        itemListOrder: "https://schema.org/ItemListUnordered",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Tarot encyclopedia hub",
            url: `${SITE_URL}/tarot`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guides for tarot seekers",
            url: `${SITE_URL}/guides`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Chat with Maria",
            url: `${SITE_URL}/`,
          },
        ],
      },
    ],
  };
}
