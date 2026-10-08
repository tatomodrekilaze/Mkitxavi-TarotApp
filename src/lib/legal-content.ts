import type { LegalSection } from "@/components/LegalPage";
import type { Lang } from "@/lib/i18n";

type Doc = { title: string; updated: string; intro: string; sections: LegalSection[] };

// Deployment operators must adapt these pages to their own service.
export const TERMS: Record<Lang, Doc> = {
  en: {
    title: "Using this app",
    updated: "Open-source edition · Update before deployment",
    intro:
      "Readings are for entertainment and reflection. Maria is an AI character and can make mistakes. Decide for yourself how to use a reading.",
    sections: [
      {
        heading: "Your account",
        body: [
          "Use an account you control. Keep your login details private and do not try to access another person’s account.",
        ],
      },
      {
        heading: "Paid features",
        body: [
          "A copy of this app may offer paid energy or subscriptions. Its operator must explain prices, renewal, cancellation, and refunds before accepting payment.",
        ],
      },
      {
        heading: "About this source release",
        body: [
          "The original project has been retired. These pages are starting text for people running their own copy, not a promise of service from the original developer.",
        ],
      },
    ],
  },
  ka: {
    title: "აპის გამოყენება",
    updated: "ღია კოდის ვერსია · განაახლე გაშვებამდე",
    intro:
      "წაკითხვები გასართობად და დასაფიქრებლადაა. მარია ხელოვნური ინტელექტის პერსონაჟია და შეიძლება შეცდეს. თავად გადაწყვიტე, როგორ გამოიყენებ მის პასუხს.",
    sections: [
      {
        heading: "შენი ანგარიში",
        body: [
          "გამოიყენე ანგარიში, რომელსაც თავად მართავ. დაიცავი შესვლის მონაცემები და ნუ ეცდები სხვის ანგარიშზე წვდომას.",
        ],
      },
      {
        heading: "ფასიანი ფუნქციები",
        body: [
          "აპის ვერსია შეიძლება ფასიან ენერგიას ან გამოწერას გთავაზობდეს. ოპერატორმა გადახდამდე უნდა განმარტოს ფასი, განახლება, გაუქმება და თანხის დაბრუნება.",
        ],
      },
      {
        heading: "ღია კოდის ვერსია",
        body: [
          "თავდაპირველი პროექტი დასრულებულია. ეს ტექსტი საკუთარი ვერსიის ოპერატორებისთვის საწყისი მასალაა და თავდაპირველი დეველოპერის მომსახურების დაპირება არ არის.",
        ],
      },
    ],
  },
};

export const PRIVACY: Record<Lang, Doc> = {
  en: {
    title: "Your information",
    updated: "Open-source edition · Update before deployment",
    intro:
      "Each deployment has its own operator and database. Before making this app public, its operator needs to explain who they are, how to contact them, and how they handle personal information.",
    sections: [
      {
        heading: "What the app can store",
        body: [
          "The code supports account details, birth dates, interests, uploaded avatars, saved chats, readings, energy balances, and subscription records. The staff console can store moderation notes, account restrictions, grants, IP-related security records, and audit events.",
        ],
      },
      {
        heading: "Who can receive it",
        body: [
          "Supabase hosts accounts and application records. AI requests go to the configured AI provider. Enabled email, payment, and advertising services may also receive information needed for those features. Authorized staff can view user records and chats through the console.",
        ],
      },
      {
        heading: "Before running your own copy",
        body: [
          "Replace this page with information that matches your services, staff access, retention settings, and process for account or data requests. Never publish real user records with the source code.",
        ],
      },
    ],
  },
  ka: {
    title: "შენი ინფორმაცია",
    updated: "ღია კოდის ვერსია · განაახლე გაშვებამდე",
    intro:
      "თითოეულ ვერსიას საკუთარი ოპერატორი და მონაცემთა ბაზა აქვს. საჯაროდ გაშვებამდე ოპერატორმა უნდა განმარტოს ვინ არის, როგორ დაუკავშირდე და როგორ ამუშავებს პირად ინფორმაციას.",
    sections: [
      {
        heading: "რა შეიძლება შეინახოს აპმა",
        body: [
          "კოდი მხარს უჭერს ანგარიშის მონაცემებს, დაბადების თარიღს, ინტერესებს, ავატარებს, საუბრებს, წაკითხვებს, ენერგიასა და გამოწერებს. კონსოლში შეიძლება ინახებოდეს მოდერაციის შენიშვნები, შეზღუდვები, გრანტები, IP-სთან დაკავშირებული უსაფრთხოების ჩანაწერები და მოქმედებების ისტორია.",
        ],
      },
      {
        heading: "ვის შეიძლება გადაეცეს ინფორმაცია",
        body: [
          "Supabase ინახავს ანგარიშებსა და აპის ჩანაწერებს. AI მოთხოვნები ეგზავნება არჩეულ AI პროვაიდერს. ჩართულმა ელფოსტის, გადახდისა და სარეკლამო სერვისებმაც შეიძლება მიიღონ ფუნქციისთვის საჭირო ინფორმაცია. უფლებამოსილ თანამშრომლებს კონსოლიდან მომხმარებლის ჩანაწერებისა და საუბრების ნახვა შეუძლიათ.",
        ],
      },
      {
        heading: "საკუთარი ვერსიის გაშვებამდე",
        body: [
          "ჩაანაცვლე ეს გვერდი შენი სერვისების, თანამშრომლების წვდომის, შენახვის ვადებისა და მონაცემებზე მოთხოვნების შესაბამისი ინფორმაციით. რეალური მომხმარებლის ჩანაწერები კოდთან ერთად არ გამოაქვეყნო.",
        ],
      },
    ],
  },
};

export const GUIDELINES: Record<Lang, Doc> = {
  en: {
    title: "Community guidelines",
    updated: "Open-source edition · Update before deployment",
    intro: "Use the app with care for yourself and other people.",
    sections: [
      {
        heading: "Respect privacy",
        body: [
          "Do not upload someone else’s private information or intimate images. Share only information you have permission to use.",
        ],
      },
      {
        heading: "Use accounts fairly",
        body: [
          "Do not harass people, impersonate another person, bypass payment or energy limits, or interfere with the service.",
        ],
      },
      {
        heading: "Report problems",
        body: [
          "Use the support contact configured by the operator to report account issues, harmful content, or security problems. Avoid including another person’s private information in public reports.",
        ],
      },
    ],
  },
  ka: {
    title: "გამოყენების წესები",
    updated: "ღია კოდის ვერსია · განაახლე გაშვებამდე",
    intro: "გამოიყენე აპი საკუთარი თავისა და სხვა ადამიანების პატივისცემით.",
    sections: [
      {
        heading: "პატივი ეცი პირად სივრცეს",
        body: [
          "არ ატვირთო სხვისი პირადი ინფორმაცია ან ინტიმური ფოტოები. გააზიარე მხოლოდ ის, რისი გამოყენების უფლებაც გაქვს.",
        ],
      },
      {
        heading: "გამოიყენე ანგარიში კეთილსინდისიერად",
        body: [
          "ნუ შეავიწროებ სხვებს, ნუ გაასაღებ თავს სხვა პირად, ნუ აუარებ გვერდს გადახდისა და ენერგიის ლიმიტებს და ნუ შეაფერხებ სერვისს.",
        ],
      },
      {
        heading: "შეგვატყობინე პრობლემის შესახებ",
        body: [
          "ანგარიშის პრობლემის, საზიანო მასალის ან უსაფრთხოების ხარვეზის შესახებ მიმართე ოპერატორის მითითებულ მხარდაჭერის მისამართს. საჯარო შეტყობინებაში სხვის პირად ინფორმაციას ნუ ჩართავ.",
        ],
      },
    ],
  },
};
