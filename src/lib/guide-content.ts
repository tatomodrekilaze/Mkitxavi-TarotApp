import { SITE_URL } from "@/lib/link-preview";

export type GuideSlug =
  | "online-tarot-georgia"
  | "love-tarot-reading"
  | "tarot-card-meanings"
  | "coffee-reading"
  | "how-to-ask-tarot"
  | "free-tarot-reading"
  | "everyday-tarot"
  | "zodiac-compatibility"
  | "personality-tests";

export interface GuideFaq {
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
}

export interface GuideDoc {
  slug: GuideSlug;
  titleKa: string;
  titleEn: string;
  descriptionKa: string;
  descriptionEn: string;
  sections: Array<{
    headingKa: string;
    headingEn: string;
    bodyKa: string[];
    bodyEn: string[];
  }>;
  faq?: GuideFaq[];
}

export const GUIDE_DOCS: GuideDoc[] = [
  {
    slug: "online-tarot-georgia",
    titleKa: "ონლაინ ტარო საქართველოში: უფასო მკითხაობა მარიასთან",
    titleEn: "Online tarot in Georgia: free reading with Maria",
    descriptionKa:
      "ონლაინ ტარო და უფასო მკითხაობა საქართველოში: ქართულად ან ინგლისურად, უფასო ყოველდღიური ენერგიით და პირადი ჩატით Mkitxavi.com-ზე.",
    descriptionEn:
      "Online tarot and free reading in Georgia: Georgian and English chat with Maria on Mkitxavi.com, with free daily energy to start.",
    sections: [
      {
        headingKa: "რატომ ეძებენ ონლაინ ტაროს საქართველოში",
        headingEn: "Why people search online tarot in Georgia",
        bodyKa: [
          "ონლაინ ტაროს საქართველოში ხშირად მაშინ ეძებენ, როცა გადაწყვეტილება გაჭიანურებულია: სიყვარული, სამსახური, ოჯახი ან შინაგანი დაძაბულობა. ონლაინ მკითხაობა უფრო ხელმისაწვდომია, ვიდრე ფიზიკური შეხვედრა. შეგიძლია კითხვა საღამოს, სახლიდან, ქართულად დაწერო.",
          "Mkitxavi.com სწორედ ამ მოთხოვნაზეა აგებული. მარია ჩატის მკითხავია: ტაროს ბარათებს Rider-Waite-Smith ტრადიციით ხატავს და პასუხს კონტექსტით გაძლევს, არა მხოლოდ ერთი სიტყვით „კი“ ან „არა“.",
        ],
        bodyEn: [
          "People in Georgia often search for online tarot when a decision feels stuck: love, work, family, or quiet tension. An online reading removes the friction of booking in person. You can ask in Georgian at night from home.",
          "Mkitxavi.com is built for that habit. Maria draws Rider-Waite-Smith cards in chat and answers with context, not a one-word yes or no.",
        ],
      },
      {
        headingKa: "როგორ იწყება უფასო მკითხაობა Mkitxavi-ზე",
        headingEn: "How a free reading starts on Mkitxavi",
        bodyKa: [
          "შედი მთავარ გვერდზე და დაიწყე ჩატი. უფასო ყოველდღიური ენერგია რამდენიმე შეტყობინებას გაძლევს, საკმარისს ერთი სერიოზული კითხვისთვის ან მოკლე დაზუსტებისთვის. თუ სამბარათიანი გაშლა გინდა, უბრალოდ დაწერე რა გაწუხებს. მარია ბარათებს გამოიტანს და ახსნის წარსულს, აწმყოს და შემდეგ ნაბიჯს.",
          "თუ ჯერ ბარათების ლექსიკონი გინდა და არა ჩატი, იხილე ტაროს ენციკლოპედია: ყველა 78 ბარათი ქართულად და ინგლისურად. სიყვარულზე მკითხაობისთვის ან ყოველდღიური ტაროსთვის შესაბამისი გზამკვლევებიც შეგიძლია წაიკითხო.",
        ],
        bodyEn: [
          "Open the home page and start chatting. Free daily energy covers a few messages, enough for one serious question or a short follow-up. Ask what is weighing on you and Maria can draw a three-card spread: past, present, and next step.",
          "If you want the card dictionary before chat, open the tarot encyclopedia: all 78 cards in Georgian and English. For love reading or everyday tarot habits, see the matching guides.",
        ],
      },
      {
        headingKa: "შეამოწმე საიტი პირადი ინფორმაციის გაზიარებამდე",
        headingEn: "Check the site before sharing personal details",
        bodyKa: [
          "ოფიციალური მისამართია მხოლოდ https://mkitxavi.com. სხვა დომენები, რომლებიც მსგავს სახელს იყენებენ (მათ შორის mkitxavi.ge), შეიძლება ჩვენთან არ იყოს დაკავშირებული. ყოველთვის შეამოწმე მისამართის ზოლი, სანამ ელფოსტას ან გადახდას გააგზავნი.",
        ],
        bodyEn: ["Check who operates the site before sharing personal or payment details."],
      },
    ],
    faq: [
      {
        questionKa: "რა არის ონლაინ ტარო Mkitxavi-ზე?",
        questionEn: "What is online tarot on Mkitxavi?",
        answerKa:
          "ონლაინ ტარო აქ ნიშნავს ჩატს მარიასთან: დასვი კითხვა, მიიღე ბარათები და კონტექსტური მკითხაობა ქართულად ან ინგლისურად.",
        answerEn:
          "Online tarot here means chat with Maria: ask a question, receive cards, and get a contextual reading in Georgian or English.",
      },
      {
        questionKa: "არის თუ არა მკითხაობა უფასო?",
        questionEn: "Is the reading free?",
        answerKa:
          "დიახ. უფასო ყოველდღიური ენერგია უფასო მკითხაობის დასაწყისს გაძლევს. როცა ენერგია ამოიწურება, შეგიძლია ხვალ დაბრუნდე, რეკლამა უყურო ან გეგმა აირჩიო.",
        answerEn:
          "Yes. Free daily energy lets you start a free reading. When energy runs out, return tomorrow, watch an ad, or choose a plan.",
      },
    ],
  },
  {
    slug: "love-tarot-reading",
    titleKa: "სიყვარულზე მკითხაობა: სიყვარულის ტარო ონლაინ",
    titleEn: "Love reading: love tarot online",
    descriptionKa:
      "სიყვარულზე მკითხაობა და სიყვარულის ტარო ქართულად: როგორ დავსვათ კითხვა, რას აჩვენებს სამბარათიანი გაშლა და როგორ ვესაუბროთ მარიას ურთიერთობაზე.",
    descriptionEn:
      "Love reading and love tarot in Georgian and English: how to ask, what a three-card spread shows, and how to talk to Maria about relationships.",
    sections: [
      {
        headingKa: "რა კითხვებს უძლებს სიყვარულზე მკითხაობა",
        headingEn: "What a love reading handles well",
        bodyKa: [
          "სიყვარულზე მკითხაობა კარგად მუშაობს მაშინ, როცა კითხვა დინამიკასა და არჩევანს ეხება: „რა ხდება ჩვენს შორის ახლა?“, „რისი აღიარება მეშინია?“, „რომელი ნაბიჯი იქნება პატიოსანი?“. ცუდად მუშაობს მაშინ, როცა მხოლოდ თარიღს ითხოვ ან სხვა ადამიანის თავისუფალი ნების დარღვევას ცდილობ.",
          "მარიასთან ჩატში საკმარისია მოკლე კონტექსტი: სახელი ან სიტუაცია, არა მთელი ისტორია. თუ სიყვარულის ლეინი გინდა, აირჩიე სერვისი „სიყვარული“ ან პირდაპირ დაწერე რა გტკივა.",
        ],
        bodyEn: [
          "A love reading works best on dynamics and choices: what is alive between you now, what you are afraid to admit, which next step is honest. It works poorly when you only demand a calendar date or try to override someone else's free will.",
          "In chat with Maria, a short context is enough: a name or situation, not a novel. Use the love service lane or simply write what hurts.",
        ],
      },
      {
        headingKa: "სიყვარულის ტარო: სამბარათიანი გაშლა",
        headingEn: "Love tarot: a three-card relationship spread",
        bodyKa: [
          "კლასიკური გაშლა ხშირად ასე იკითხება: საფუძველი ან წარსული გავლენა, აწმყო გადაკვეთა და შემდეგი რჩევა. თასების მასტი ხშირად ემოციებს აჩვენებს, ხმლები საუბარსა და შიშს, კვერთხები ინიციატივას, პენტაკლები პრაქტიკულ სტაბილურობას. მნიშვნელობები ცალკე შეგიძლია ნახო ენციკლოპედიაში.",
          "წაკითხვის შემდეგ სასარგებლოა ერთი პრაქტიკული ნაბიჯი: საუბარი, საზღვარი ან დრო საკუთარი თავისთვის, არა მხოლოდ კითხვა „რას ფიქრობს ის?“.",
        ],
        bodyEn: [
          "A classic spread often reads as foundation, present crossing, and counsel. Cups often speak to feeling, Swords to talk and fear, Wands to initiative, Pentacles to practical stability. Full card meanings live in the encyclopedia.",
          "After the reading, pick one practical step: a conversation, a boundary, or rest for yourself, not only what they think.",
        ],
      },
      {
        headingKa: "სიყვარულზე მკითხაობა ონლაინ საქართველოში",
        headingEn: "Love reading online in Georgia",
        bodyKa: [
          "თუ ქართულად ეძებ „სიყვარულზე მკითხაობას“ ან „სიყვარულის ტაროს“, Mkitxavi გაძლევს ჩატს მარიასთან და ცალკე ლექსიკონს 78 ბარათისთვის. დაიწყე მოკლე კითხვით მთავარ გვერდზე. უფასო ყოველდღიური ენერგიით შეგიძლია უფასო მკითხაობის დასაწყისი. ჯერ თასების მასტის ბარათებიც შეგიძლია გადახედო ენციკლოპედიაში.",
        ],
        bodyEn: [
          "Searching for a love reading or love tarot in Georgian? Mkitxavi gives you Maria in chat plus a 78-card dictionary. Start with a short question on the home page. Free daily energy covers a free reading entry. Or skim the Cups suit in the encyclopedia first.",
        ],
      },
    ],
    faq: [
      {
        questionKa: "როგორ დავიწყო სიყვარულზე მკითხაობა?",
        questionEn: "How do I start a love reading?",
        answerKa:
          "გახსენი mkitxavi.com, შედი ჩატში და მოკლედ აღწერე ურთიერთობა ან კითხვა. მარია გამოიტანს ტაროს ბარათებს და ახსნის კონტექსტს.",
        answerEn:
          "Open mkitxavi.com, enter chat, and briefly describe the relationship or question. Maria draws tarot cards and explains the context.",
      },
    ],
  },
  {
    slug: "tarot-card-meanings",
    titleKa: "ტაროს ბარათების მნიშვნელობები: 78 ბარათის გზამკვლევი",
    titleEn: "Tarot card meanings: a guide to all 78 cards",
    descriptionKa:
      "ტაროს ბარათების მნიშვნელობები ქართულად და ინგლისურად: მაჟორი, თასები, ხმლები, კვერთხები და პენტაკლები. ონლაინ ტაროს ლექსიკონი Mkitxavi-ზე.",
    descriptionEn:
      "Tarot card meanings in Georgian and English: Major Arcana plus Cups, Swords, Wands, and Pentacles. The online tarot dictionary on Mkitxavi.",
    sections: [
      {
        headingKa: "როგორ ვისწავლოთ ტაროს ბარათები პრაქტიკულად",
        headingEn: "How to learn tarot card meanings without overwhelm",
        bodyKa: [
          "სრული დეკი 78 ბარათია: 22 მაჟორი არკანა და 56 მინორი ოთხ მასტში. ახალბედებისთვის უმჯობესია ჯერ სამი ბარათი დღეში: სახელი, საკვანძო სიტყვები და ერთი პრაქტიკული აზრი. Mkitxavi-ის ენციკლოპედია სწორედ ასეა აგებული: თითო გვერდზე ქართული და ინგლისური მნიშვნელობა.",
          "მაჟორი ხშირად დიდ ცხოვრებისეულ თემებს აჩვენებს: დასაწყისი, არჩევანი, ტრანსფორმაცია. მინორი ყოველდღიურ დეტალებს: საუბარი, ფული, ემოცია, მოქმედება. ეს ყოველდღიური ტაროს პრაქტიკასაც ეხმარება.",
        ],
        bodyEn: [
          "A full deck is 78 cards: 22 Major Arcana and 56 Minors across four suits. Beginners learn faster with three cards a day: name, keywords, one practical takeaway. Mkitxavi's encyclopedia is built that way: Georgian and English on every card page.",
          "Majors often mark large life themes. Minors track daily texture: talk, money, feeling, action. Useful for an everyday tarot habit too.",
        ],
      },
      {
        headingKa: "სად იპოვო ყველა ბარათის მნიშვნელობა",
        headingEn: "Where to find every card meaning",
        bodyKa: [
          "გახსენი /tarot. იქ დაჯგუფებულია მაჟორი, კვერთხები, თასები, ხმლები და პენტაკლები. თითო ბარათს აქვს საკუთარი URL, რომ შეძლო გაზიარება ან დაბრუნება იმავე მნიშვნელებაზე. თუ ცოცხალი მკითხაობა გინდა და არა მხოლოდ ლექსიკონი, დაბრუნდი მთავარ ჩატზე უფასო ონლაინ ტაროსთვის.",
        ],
        bodyEn: [
          "Open /tarot for Majors, Wands, Cups, Swords, and Pentacles. Each card has its own URL so you can share or return to the same meaning. For a live free online tarot reading, go back to the home chat with Maria.",
        ],
      },
      {
        headingKa: "მნიშვნელობები და ცოცხალი გაშლა ერთად",
        headingEn: "Meanings plus a live reading",
        bodyKa: [
          "ბევრი ადამიანი ჯერ ბარათის მნიშვნელობას კითხულობს, შემდეგ ჩატში სვამს კითხვას, ან პირიქით. ორივე გზა სწორია. ლექსიკონი სიმბოლოების ენას გაძლევს; მარია კონტექსტს შენს სიტუაციაზე. შეგიძლია დააკავშირო სიყვარულზე მკითხაობა, ზოდიაქოების თავსებადობა ან პიროვნების არქეტიპი იმავე აპში.",
        ],
        bodyEn: [
          "Many people read a card meaning first, then ask in chat, or the reverse. Both work. The dictionary teaches symbol language; Maria applies it to your situation. You can also use love reading, zodiac compatibility, or the personality archetype tools in the same app.",
        ],
      },
    ],
  },
  {
    slug: "coffee-reading",
    titleKa: "ყავაზე მკითხაობა ონლაინ: ტრადიცია და ჩატი",
    titleEn: "Coffee-cup reading online: tradition meets chat",
    descriptionKa:
      "ყავაზე მკითხაობა ქართულ კულტურაში და როგორ მუშაობს ონლაინ გამოცდილება მარიასთან, უფასო მკითხაობის დასაწყისით Mkitxavi.com-ზე.",
    descriptionEn:
      "Coffee-ground reading in Georgian culture and how the online experience works with Maria on Mkitxavi.com, including a free reading entry via daily energy.",
    sections: [
      {
        headingKa: "რატომ რჩება ყავაზე მკითხაობა მნიშვნელოვანი",
        headingEn: "Why coffee reading still matters",
        bodyKa: [
          "ყავაზე მკითხაობა საქართველოში ხშირად ოჯახურ და მეგობრულ რიტუალს ჰგავს: ფინჯანი, ნალექი და საუბარი იმაზე, რაც გულში ზის. ონლაინ ვერსია ამ რიტუალს სრულად არ ანაცვლებს, მაგრამ გზას გაძლევს მაშინ, როცა სახლში მკითხავი გვერდით არ გყავს.",
          "Mkitxavi-ზე ყავის ლეინი გეხმარება სიტუაცია ჩატში აღწერო. მარია იგივე ტონით გიპასუხებს: სითბოთი და კონკრეტული რჩევით, არა შიშის გაყიდვით.",
        ],
        bodyEn: [
          "Coffee-cup reading in Georgia often feels like a family or friend ritual: the cup, the grounds, and a talk about what sits on the heart. An online lane cannot replace that fully, but it helps when no reader is sitting beside you.",
          "On Mkitxavi, the coffee service lets you describe the moment in chat. Maria answers with warmth and a concrete next step, not fear-selling.",
        ],
      },
      {
        headingKa: "ტარო და ყავაზე მკითხაობა ერთად",
        headingEn: "Coffee reading and tarot together",
        bodyKa: [
          "ზოგი ადამიანი ჯერ ყავას ირჩევს, შემდეგ ონლაინ ტაროს, ან პირიქით. ორივე გზა შეიძლება ერთმანეთს ავსებდეს: ყავა უფრო ატმოსფერული და ინტუიციურია, ტარო სტრუქტურირებული სიმბოლოებით. თუ ბარათების ზუსტი მნიშვნელობები გინდა, გამოიყენე ენციკლოპედია; თუ ახლა საუბარი გინდა, დაიწყე ჩატი.",
        ],
        bodyEn: [
          "Some people start with coffee, then online tarot, or the reverse. Coffee leans atmospheric and intuitive; tarot is structured symbol language. Use the encyclopedia for exact card meanings, or start chat when you want a conversation now.",
        ],
      },
      {
        headingKa: "ონლაინ ყავაზე მკითხაობა: რა მოელოდე",
        headingEn: "What to expect from online coffee reading",
        bodyKa: [
          "ონლაინ „ყავაზე მკითხაობა“ არ ნიშნავს, რომ ფინჯანს კამერაში აჩვენებ. უფრო იმას ნიშნავს, რომ იგივე ინტუიციური ტონით საუბრობ სიტუაციაზე. აღწერე რა გაწუხებს ან რა გრძნობა გაქვს; მარია კონტექსტით გიპასუხებს. თუ სტრუქტურა გინდა, გადაერთე ტაროზე იმავე ჩატში. უფასო ყოველდღიური ენერგიით შეგიძლია დაიწყო.",
        ],
        bodyEn: [
          "Online coffee reading here is not about filming a cup. It is the same intuitive tone applied to your situation. Describe what weighs on you; Maria answers with context. Want structure next? Switch to tarot in the same chat. Free daily energy lets you start.",
        ],
      },
    ],
  },
  {
    slug: "how-to-ask-tarot",
    titleKa: "როგორ დავსვათ კითხვა ტაროსთან: პრაქტიკული გზამკვლევი",
    titleEn: "How to ask tarot a clear question",
    descriptionKa:
      "როგორ ჩამოვაყალიბოთ კარგი ტაროს კითხვა ონლაინ მკითხაობისთვის: ფოკუსი, საზღვრები და მაგალითები ქართულად, უფასო ტაროს დასაწყისისთვისაც.",
    descriptionEn:
      "How to phrase a clear tarot question for an online reading: focus, boundaries, and examples, including for a free reading start.",
    sections: [
      {
        headingKa: "კარგი კითხვის ნიშნები ონლაინ ტაროში",
        headingEn: "Signs of a strong online tarot question",
        bodyKa: [
          "კარგი კითხვა კონკრეტულია, პატიოსანი და შენს არჩევანზე ორიენტირებული. მაგალითი: „რა ენერგიაა ჩემს გადაწყვეტილებაში სამსახურის შეცვლაზე და რა ნაბიჯი დამეხმარება?“ ცუდი მაგალითი: „როდის დამიბრუნდება ის?“ თარიღზე ფიქსაცია ხშირად შიშს ზრდის და არჩევანს არ აძლიერებს.",
          "დაამატე ერთი წინადადება კონტექსტი: რა მოხდა ბოლო კვირაში, რისი გეშინია, რისი შენარჩუნება გინდა. მარია ამით უფრო ზუსტად ხატავს ბარათებს, იქნება ეს სიყვარულზე მკითხაობა თუ ყოველდღიური ტარო.",
        ],
        bodyEn: [
          "A strong question is specific, honest, and aimed at your agency. Example: What energy surrounds my decision to change jobs, and what step helps me? Weak: When will they come back? Date-fixation often feeds fear instead of choice.",
          "Add one sentence of context: what happened this week, what you fear, what you want to protect. That helps Maria draw with more precision, whether it is a love reading or everyday tarot.",
        ],
      },
      {
        headingKa: "რა გააკეთო მკითხაობის შემდეგ",
        headingEn: "What to do after the reading",
        bodyKa: [
          "აირჩიე ერთი ქმედება 24 საათში: საუბარი, საზღვარი ან დასვენება. თუ ბარათის სიღრმე გინდა, გახსენი მისი გვერდი ენციკლოპედიაში და შეადარე საკვანძო სიტყვები შენს სიტუაციას. თუ კიდევ გაქვს კითხვა, დაბრუნდი ჩატში. უკეთესია ერთი გასაგები შემდეგი კითხვა, ვიდრე ათი გამეორება.",
        ],
        bodyEn: [
          "Pick one action in 24 hours: a talk, a boundary, or rest. For depth, open that card's encyclopedia page and match keywords to your situation. If you still have a question, return to chat. One clear follow-up beats ten repeats.",
        ],
      },
      {
        headingKa: "უფასო მკითხაობა და კარგი კითხვა",
        headingEn: "Free reading energy and a clear question",
        bodyKa: [
          "უფასო ყოველდღიური ენერგია შეზღუდულია, ამიტომ ერთი კარგად ჩამოყალიბებული კითხვა უფრო მეტს გაძლევს, ვიდრე ბევრი ბუნდოვანი. დაიწყე მთავარ გვერდზე. თუ თემატური გზამკვლევი გინდა, იხილე უფასო ტარო, სიყვარულზე მკითხაობა ან ყოველდღიური ტარო.",
        ],
        bodyEn: [
          "Free daily energy is limited, so one well-phrased question gives more than many vague ones. Start on the home page. For topical guides, see free tarot, love reading, or everyday tarot.",
        ],
      },
    ],
  },
  {
    slug: "free-tarot-reading",
    titleKa: "უფასო ტარო და უფასო მკითხაობა ონლაინ: როგორ მუშაობს",
    titleEn: "Free tarot reading online: how it works",
    descriptionKa:
      "უფასო ტარო და უფასო მკითხაობა Mkitxavi.com-ზე: უფასო ყოველდღიური ენერგია, ონლაინ ტარო მარიასთან და რა ხდება, როცა ენერგია ამოიწურება.",
    descriptionEn:
      "Free tarot and free taro reading on Mkitxavi.com: free daily energy, online tarot with Maria, and what happens when energy runs out.",
    sections: [
      {
        headingKa: "რას ნიშნავს უფასო ტარო Mkitxavi-ზე",
        headingEn: "What free tarot means on Mkitxavi",
        bodyKa: [
          "უფასო ტარო აქ არ არის „უსასრულო ჩატი უსასრულოდ“. ეს არის უფასო მკითხაობის დასაწყისი უფასო ყოველდღიური ენერგიით: რამდენიმე შეტყობინება დღეში, საკმარისი ერთი სერიოზული კითხვისთვის ან მოკლე გაშლისთვის მარიასთან.",
          "ინგლისურად ხშირად ეძებენ „free tarot“ ან შეცდომით „free taro“. ორივე იგივე იდეამდე მიგიყვანს: ონლაინ ტარო უფასო შესვლის წერტილით. ქართულად იგივეა: უფასო ტარო და უფასო მკითხაობა მთავარ გვერდზე.",
        ],
        bodyEn: [
          "Free tarot here is not unlimited chat forever. It is a free reading entry via free daily energy: a few messages per day, enough for one serious question or a short spread with Maria.",
          "People often search “free tarot” or misspell it “free taro”. Both point to the same idea: online tarot with a free starting point. On Mkitxavi that entry is the home chat.",
        ],
      },
      {
        headingKa: "როგორ დაიწყო უფასო მკითხაობა ახლა",
        headingEn: "How to start a free reading now",
        bodyKa: [
          "გახსენი https://mkitxavi.com, შექმენი ანგარიში ან შედი და დაწერე კითხვა ქართულად ან ინგლისურად. მარია გამოიტანს ტაროს ბარათებს და ახსნის კონტექსტს. თუ სიყვარულზე მკითხაობა, ზოდიაქოების თავსებადობა ან პიროვნების არქეტიპი გინდა, ეს სერვისები იმავე აპშია სერვისების პანელში.",
          "როცა ენერგია ამოიწურება: დაბრუნდი ხვალ უფასო ენერგიისთვის, უყურე რეკლამას (თუ ხელმისაწვდომია), ან აირჩიე გეგმა მეტი მკითხაობისთვის. ჩატის დასაწყებად ფარული გადახდა არ არის.",
        ],
        bodyEn: [
          "Open https://mkitxavi.com, sign in, and write your question in Georgian or English. Maria draws cards and explains context. Love reading, zodiac compatibility, and personality archetype tools live in the same app under Services.",
          "When energy runs out: come back tomorrow for free energy, watch an ad if available, or choose a plan for more readings. No hidden paywall just to start chat.",
        ],
      },
      {
        headingKa: "უფასო ტარო და სწავლა ერთად",
        headingEn: "Free tarot plus learning the cards",
        bodyKa: [
          "უფასო მკითხაობის გარდა შეგიძლია უფასოდ წაიკითხო 78 ბარათის მნიშვნელობები ენციკლოპედიაში. ეს ჩატის ენერგიას არ ხარჯავს. ბევრი ადამიანი აერთიანებს ყოველდღიურ ტაროს პრაქტიკას: დილით ერთი ბარათი ლექსიკონიდან, საღამოს კი მოკლე კითხვა ჩატში.",
        ],
        bodyEn: [
          "Besides a free reading in chat, you can browse all 78 card meanings in the encyclopedia for free. That does not spend chat energy. Many people pair everyday tarot study with a short evening question in chat.",
        ],
      },
    ],
    faq: [
      {
        questionKa: "უფასო ტარო ნამდვილად უფასოა?",
        questionEn: "Is free tarot / free taro actually free?",
        answerKa:
          "დიახ. უფასო ყოველდღიური ენერგია ყოველ კალენდარულ დღეს უფასო მკითხაობის დასაწყისს გაძლევს. დამატებითი ენერგია ხელმისაწვდომია რეკლამით ან გეგმით.",
        answerEn:
          "Yes. Free daily energy gives you a free reading start each calendar day. Extra energy is available via ads or a paid plan.",
      },
      {
        questionKa: "სად ვიპოვო უფასო ონლაინ ტარო საქართველოში?",
        questionEn: "Where can I find free online tarot in Georgia?",
        answerKa:
          "თითოეული ვერსია დამოუკიდებელია. შეამოწმე მისი საკონტაქტო ინფორმაცია და კონფიდენციალურობის პირობები.",
        answerEn:
          "Each deployment is independent. Check its contact details and privacy information.",
      },
    ],
  },
  {
    slug: "everyday-tarot",
    titleKa: "ყოველდღიური ტარო: დღის პრაქტიკა",
    titleEn: "Everyday tarot: a daily practice",
    descriptionKa:
      "ყოველდღიური ტარო: როგორ აირჩიო დღის ბარათი, როგორ დააკავშირო უფასო მკითხაობას მარიასთან და როგორ არ გადაიღალო.",
    descriptionEn:
      "Everyday tarot (also searched as everyday taro): how to pull a daily card, connect it to a free reading with Maria, and avoid overload.",
    sections: [
      {
        headingKa: "რატომ მუშაობს ყოველდღიური ტარო",
        headingEn: "Why everyday tarot works",
        bodyKa: [
          "ყოველდღიური ტარო პროგნოზების მარათონი არ არის. ეს მოკლე რიტუალია: ერთი ბარათი, ერთი კითხვა, ერთი პრაქტიკული ნაბიჯი. ასე ტარო სასარგებლო რჩება და შიშის წყაროდ არ იქცევა.",
          "ინგლისურად ხშირად წერენ „everyday tarot“ და ზოგჯერ „everyday taro“. იგივე პრაქტიკაა. ქართულად: ყოველდღიური ტარო ან დღის მკითხაობა.",
        ],
        bodyEn: [
          "Everyday tarot is not a marathon of predictions. It is a short ritual: one card, one question, one practical step. That keeps tarot useful instead of fear-inducing.",
          "Searchers often type “everyday tarot” and sometimes misspell “everyday taro”. Same practice. In Georgian: ყოველდღიური ტარო.",
        ],
      },
      {
        headingKa: "მარტივი რუტინა Mkitxavi-ზე",
        headingEn: "A simple routine on Mkitxavi",
        bodyKa: [
          "დილით გახსენი ტაროს ენციკლოპედია და აირჩიე ერთი ბარათი, ან სთხოვე მარიას „დღის ბარათი“ ჩატში. წაიკითხე საკვანძო სიტყვები ქართულად, შემდეგ ჰკითხე საკუთარ თავს: სად ვხედავ ამ ენერგიას დღეს?",
          "საღამოს, თუ უფრო ღრმა მკითხაობა გინდა, გამოიყენე უფასო ყოველდღიური ენერგია ერთი კონკრეტული კითხვისთვის. არ გაყავი ენერგია ათ უმნიშვნელო გამეორებაზე. ყოველდღიური ტარო სწორედ ფოკუსს ასწავლის.",
        ],
        bodyEn: [
          "In the morning open the tarot encyclopedia and pick one card, or ask Maria for a “card of the day” in chat. Read the keywords, then ask yourself where you see that energy today.",
          "In the evening, if you want a deeper reading, spend free daily energy on one concrete question. Do not burn energy on ten vague repeats. Everyday tarot trains focus.",
        ],
      },
      {
        headingKa: "ყოველდღიური ტარო და სხვა სერვისები",
        headingEn: "Everyday tarot alongside other tools",
        bodyKa: [
          "ზოგი კვირა უფრო ემოციურია; მაშინ სიყვარულზე მკითხაობა უფრო სასარგებლოა. სხვა კვირა ურთიერთობების შესახებას ეხება; მაშინ სცადე ზოდიაქოების თავსებადობა. თუ საკუთარი ტონის გაგება გინდა, სცადე პიროვნების არქეტიპი სერვისებში. ყოველდღიური ტარო ბაზად რჩება; დანარჩენი თემატური დამატებაა.",
        ],
        bodyEn: [
          "Some weeks are more emotional; then a love reading helps. Others are about partnership dynamics; try zodiac compatibility. For your own tone, open the personality archetype in Services. Everyday tarot stays the base; the rest are topical tools.",
        ],
      },
    ],
    faq: [
      {
        questionKa: "რამდენი ბარათი უნდა ავიღო დღეში?",
        questionEn: "How many cards per day for everyday tarot?",
        answerKa:
          "ახალბედებისთვის საკმარისია ერთი ბარათი დღეში. თუ სამბარათიანი გაშლა გინდა, გააკეთე ის კვირაში რამდენჯერმე და არა ყოველ საათში.",
        answerEn:
          "Beginners do well with one card a day. Save three-card spreads for a few times a week, not every hour.",
      },
    ],
  },
  {
    slug: "zodiac-compatibility",
    titleKa: "ზოდიაქოების თავსებადობა ონლაინ",
    titleEn: "Zodiac compatibility online with Maria",
    descriptionKa:
      "ზოდიაქოების თავსებადობა Mkitxavi-ზე: როგორ შეამოწმო ორი ნიშანი აპში, რას ნიშნავს ქულა და როგორ დააკავშირო ტაროს მკითხაობასთან.",
    descriptionEn:
      "Zodiac compatibility on Mkitxavi: how to check two signs in the app, what the score means, and how to pair it with a tarot reading.",
    sections: [
      {
        headingKa: "რა არის ზოდიაქოების თავსებადობა აპში",
        headingEn: "What zodiac compatibility is in the app",
        bodyKa: [
          "ზოდიაქოების თავსებადობა Mkitxavi-ზე სერვისების პანელის ინსტრუმენტია: ირჩევ ორ ზოდიაქოს ნიშანს და იღებ ქულას სიყვარულის, მეგობრობის და ზრდის განზომილებებით, პლუს მოკლე შეჯამებას. ეს სამედიცინო ან იურიდიული რჩევა არ არის. ასტროლოგიური სახელმძღვანელოა საუბრის დასაწყებად.",
          "ბევრი ადამიანი ჯერ თავსებადობას ამოწმებს, შემდეგ უფრო პირად კითხვას სვამს ონლაინ ტაროში ან სიყვარულზე მკითხაობაში მარიასთან.",
        ],
        bodyEn: [
          "Zodiac compatibility on Mkitxavi is a Services-panel tool: pick two signs and get a score across love, friendship, and growth, plus a short summary. It is not medical or legal advice. It is an astrology-style guide to start a conversation.",
          "Many people check compatibility first, then ask a more personal question in online tarot or a love reading with Maria.",
        ],
      },
      {
        headingKa: "როგორ გამოიყენო პრაქტიკულად",
        headingEn: "How to use it in practice",
        bodyKa: [
          "შედი აპში (მთავარი გვერდი, შემდეგ ჩატი), გახსენი სერვისები და აირჩიე ზოდიაქოს თავსებადობა. შეიყვანე შენი და მეორე ადამიანის ნიშანი. წაიკითხე შეჯამება, შემდეგ ჰკითხე საკუთარ თავს: რომელი წერტილი მეხება რეალურად?",
          "თუ სიღრმე გინდა, გადადი ჩატში და დაწერე კონკრეტული კითხვა, მაგალითად კომუნიკაციაზე ან საზღვრებზე. უფასო ყოველდღიური ენერგია უფასო მკითხაობის დასაწყისს გაძლევს.",
        ],
        bodyEn: [
          "Sign in on the home page, open Services, and choose Zodiac Compatibility. Enter both signs, read the summary, then ask which point actually resonates.",
          "For depth, switch to chat and ask a concrete question, for example about communication or boundaries. Free daily energy covers a free reading start.",
        ],
      },
      {
        headingKa: "თავსებადობა და ტარო ერთად",
        headingEn: "Compatibility plus tarot",
        bodyKa: [
          "ზოდიაქოების თავსებადობა ფართო რუკას გაძლევს; ტარო კონკრეტულ მომენტს. ერთად ისინი უფრო სასარგებლოა, ვიდრე ცალ-ცალკე. შეგიძლია ასევე ნახო პიროვნების არქეტიპი, თუ ურთიერთობაში საკუთარი რეაქციის სტილის გაგება გინდა.",
        ],
        bodyEn: [
          "Zodiac compatibility gives a broad map; tarot speaks to a concrete moment. Together they are more useful than either alone. You can also open the personality archetype tool if you want your own reaction style in relationships.",
        ],
      },
    ],
    faq: [
      {
        questionKa: "სად ვიპოვო ზოდიაქოების თავსებადობა?",
        questionEn: "Where is zodiac compatibility?",
        answerKa:
          "შედი mkitxavi.com-ზე, გახსენი სერვისები ჩატში და აირჩიე ზოდიაქოს თავსებადობა. ცალკე გარე კალკულატორი არ არის საჭირო.",
        answerEn:
          "Sign in at mkitxavi.com, open Services in chat, and choose Zodiac Compatibility. No separate external calculator is required.",
      },
    ],
  },
  {
    slug: "personality-tests",
    titleKa: "პიროვნების ტესტები და არქეტიპი მარიასთან",
    titleEn: "Personality tests and archetype reading with Maria",
    descriptionKa:
      "პიროვნების ტესტები Mkitxavi-ზე: პიროვნების არქეტიპის წაკითხვა სერვისებში. რას აჩვენებს და როგორ დააკავშირო ტაროს მკითხაობასთან.",
    descriptionEn:
      "Personality tests on Mkitxavi: the in-app personality archetype reading. What it shows and how to connect it to a tarot reading.",
    sections: [
      {
        headingKa: "რა არის პიროვნების ტესტი ამ აპში",
        headingEn: "What the personality test is in this app",
        bodyKa: [
          "Mkitxavi-ზე პიროვნების ტესტი ნიშნავს ტაროსა და მაგიის არქეტიპის წაკითხვას სერვისებში, არა გარე ფსიქოლოგიურ სერტიფიკატს. ათ კითხვაზე პასუხს სცემ და იღებ ტიპს: უზენაესი ქურუმი, მაგი, განდეგილი ან იმპერატრიცა. შედეგი ინახება, სანამ თავად არ აირჩევ თავიდან გავლას.",
          "ეს ინსტრუმენტი გეხმარება დაინახო, როგორ რეაგირებ სტრესზე, სიყვარულზე ან გადაწყვეტილებაზე. შემდეგ იგივე თემა შეგიძლია გააგრძელო ონლაინ ტაროში მარიასთან.",
        ],
        bodyEn: [
          "On Mkitxavi, “personality tests” means the in-app Tarot and Magic archetype reading under Services, not an external Big Five or certified MBTI. You answer ten questions and receive a major-arcana type (High Priestess, Magician, Hermit, or Empress) with suit vibe, strengths, and a short mystic description. The result is saved until you choose Redo.",
          "The tool helps you see how you react to stress, love, or decisions. Then you can continue the same theme in online tarot with Maria.",
        ],
      },
      {
        headingKa: "როგორ გაუშვა პიროვნების წაკითხვა",
        headingEn: "How to run the personality reading",
        bodyKa: [
          "შედი mkitxavi.com-ზე, გახსენი სერვისები და აირჩიე პიროვნების ტიპი. უპასუხე ათ კითხვას და წაიკითხე შედეგი. თუ უფრო ღრმად გინდა, ჩატში ჰკითხე მარიას, როგორ ჩანს ეს არქეტიპი შენს სიტუაციაში.",
        ],
        bodyEn: [
          "Sign in at https://mkitxavi.com, open Services, and choose Personality Reading. Follow the short steps and read your result. For depth, return to chat and ask Maria how that archetype shows up in your situation. Free daily energy covers a free reading start.",
        ],
      },
      {
        headingKa: "პიროვნება, ზოდიაქო და ტარო",
        headingEn: "Personality, zodiac, and tarot together",
        bodyKa: [
          "პიროვნების არქეტიპი შენს შიდა სტილზეა; ზოდიაქოების თავსებადობა ორ ნიშანს შორის დინამიკაზე; ტარო კონკრეტულ კითხვაზე. სამივე ერთ აპშია ხელმისაწვდომი. არ გჭირდება ცალკე საიტების ძებნა პიროვნების ტესტებისთვის. დაიწყე Mkitxavi-დან და შეინარჩუნე კონტექსტი ერთ ჩატში.",
        ],
        bodyEn: [
          "The personality archetype is about your inner style; zodiac compatibility is about two signs; tarot answers a concrete question. All three live in one app. You do not need separate sites for personality tests. Start on Mkitxavi and keep context in one place.",
        ],
      },
    ],
    faq: [
      {
        questionKa: "ეს არის კლასიკური ფსიქოლოგიური ტესტი?",
        questionEn: "Is this a clinical personality test?",
        answerKa:
          "არა. ეს არის მსუბუქი არქეტიპის წაკითხვა გართობისა და თვითშემეცნებისთვის აპში, არა დიაგნოზი და არა კლინიკური ინსტრუმენტი.",
        answerEn:
          "No. It is a light archetype reading for reflection and fun in the app, not a diagnosis or clinical instrument.",
      },
    ],
  },
];

export const GUIDE_SLUGS = GUIDE_DOCS.map((g) => g.slug);

export function getGuide(slug: string): GuideDoc | undefined {
  return GUIDE_DOCS.find((g) => g.slug === slug);
}

export function guideUrl(slug: GuideSlug): string {
  return `${SITE_URL}/guides/${slug}`;
}

export function buildGuideFaqJsonLd(guide: GuideDoc) {
  if (!guide.faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.questionKa,
      alternateName: item.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answerKa,
      },
    })),
  };
}

export function buildGuidesHubFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "რა არის უფასო ონლაინ ტარო Mkitxavi-ზე?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "უფასო ონლაინ ტარო ნიშნავს ჩატს მარიასთან უფასო ყოველდღიური ენერგიით: უფასო მკითხაობის დასაწყისი ქართულად ან ინგლისურად https://mkitxavi.com-ზე.",
        },
      },
      {
        "@type": "Question",
        name: "სად დავიწყო უფასო ტარო?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "დაიწყე https://mkitxavi.com-ზე. უფასო ყოველდღიური ენერგია უფასო მკითხაობის დასაწყისს გაძლევს. ბარათების მნიშვნელობები, სიყვარულზე მკითხაობა, ზოდიაქოების თავსებადობა და პიროვნების ტესტი იმავე აპშია.",
        },
      },
      {
        "@type": "Question",
        name: "როგორ ვიპოვო ზოდიაქოების თავსებადობა და პიროვნების ტესტები?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "შედი აპში, გახსენი სერვისები და აირჩიე ზოდიაქოს თავსებადობა ან პიროვნების ტიპი. დეტალები: /guides/zodiac-compatibility და /guides/personality-tests.",
        },
      },
    ],
  };
}
