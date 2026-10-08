import type { LocaleCode } from "./i18n";

/** Tarot & Magic archetypes — major-arcana energy + suit vibe. */
export type ArchetypeKey = "priestess" | "magician" | "hermit" | "empress";

export interface Archetype {
  key: ArchetypeKey;
  emoji: string;
  /** Suit / major vibe line shown under the title. */
  vibe: Record<LocaleCode, string>;
  names: Record<LocaleCode, string>;
  descs: Record<LocaleCode, string>;
  strengths: Record<LocaleCode, string[]>;
}

export const ARCHETYPE_KEYS: ArchetypeKey[] = ["priestess", "magician", "hermit", "empress"];

export function isArchetypeKey(v: unknown): v is ArchetypeKey {
  return typeof v === "string" && (ARCHETYPE_KEYS as string[]).includes(v);
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  priestess: {
    key: "priestess",
    emoji: "🌙",
    vibe: {
      en: "Cups · The High Priestess",
      ka: "თასები · მღვდელმთავარი",
      ru: "Кубки · Верховная Жрица",
    },
    names: {
      en: "The High Priestess",
      ka: "მღვდელმთავარი",
      ru: "Верховная Жрица",
    },
    descs: {
      en: "You move by moonlight — quiet knowing, deep feeling, and secrets that surface only when the veil thins. Cups energy: intuition before noise.",
      ka: "მთვარის შუქზე მოძრაობ — მშვიდი ცოდნა, ღრმა გრძნობა და საიდუმლოებები, რომლებიც მხოლოდ ფარდის გათხელებისას ჩნდება. თასების ენერგია: ინტუიცია ხმაურზე წინ.",
      ru: "Ты движешься при лунном свете — тихое знание, глубокое чувство и тайны, что всплывают, когда завеса тоньше. Энергия Кубков: интуиция прежде шума.",
    },
    strengths: {
      en: ["Inner sight", "Empathy", "Sacred stillness"],
      ka: ["შინაგანი ხედვა", "ემპათია", "წმინდა სიმშვიდე"],
      ru: ["Внутреннее зрение", "Эмпатия", "Священная тишина"],
    },
  },
  magician: {
    key: "magician",
    emoji: "✦",
    vibe: {
      en: "Wands · The Magician",
      ka: "კვერთხები · ჯადოქარი",
      ru: "Жезлы · Маг",
    },
    names: {
      en: "The Magician",
      ka: "ჯადოქარი",
      ru: "Маг",
    },
    descs: {
      en: "Will meets spark. You name what you want and pull it into form — Wands fire, tools on the table, as above so below.",
      ka: "ნება ხვდება ნაპერწკალს. ასახელებ რაც გინდა და ფორმაში იზიდავ — კვერთხების ცეცხლი, ხელსაწყოები მაგიდაზე, როგორც ზეცაში, ისე ქვეყანაზე.",
      ru: "Воля встречает искру. Ты называешь желаемое и притягиваешь его в форму — огонь Жезлов, инструменты на столе, как вверху, так и внизу.",
    },
    strengths: {
      en: ["Manifestation", "Focus", "Bold craft"],
      ka: ["გამოვლინება", "ფოკუსი", "თამამი ხელოვნება"],
      ru: ["Проявление", "Фокус", "Смелое мастерство"],
    },
  },
  hermit: {
    key: "hermit",
    emoji: "🜁",
    vibe: {
      en: "Swords · The Hermit",
      ka: "მახვილები · განდეგილი",
      ru: "Мечи · Отшельник",
    },
    names: {
      en: "The Hermit",
      ka: "განდეგილი",
      ru: "Отшельник",
    },
    descs: {
      en: "A lantern in fog. You cut through illusion with Swords clarity — solitude as study, truth as devotion, silence as spell.",
      ka: "ფარნი ნისლში. მახვილების სიწმინდით ჭრი ილუზიას — მარტოობა როგორც სწავლა, სიმართლე როგორც ერთგულება, სიჩუმე როგორც შელოცვა.",
      ru: "Фонарь в тумане. Ты рассекаешь иллюзию ясностью Мечей — одиночество как учение, истина как преданность, тишина как заклинание.",
    },
    strengths: {
      en: ["Discernment", "Patience", "Honest light"],
      ka: ["განჭვრეტა", "მოთმინება", "პატიოსანი შუქი"],
      ru: ["Проницательность", "Терпение", "Честный свет"],
    },
  },
  empress: {
    key: "empress",
    emoji: "🌿",
    vibe: {
      en: "Pentacles · The Empress",
      ka: "პენტაკლები · იმპერატრიცა",
      ru: "Пентакли · Императрица",
    },
    names: {
      en: "The Empress",
      ka: "იმპერატრიცა",
      ru: "Императрица",
    },
    descs: {
      en: "Earth-magic and abundance. You grow what you touch — beauty, body, craft, and the garden of ordinary miracles.",
      ka: "დედამიწის მაგია და სიუხვე. რასაც შეეხები, იზრდება — სილამაზე, სხეული, ხელობა და ჩვეულებრივი სასწაულების ბაღი.",
      ru: "Земная магия и изобилие. Ты взращиваешь то, к чему прикасаешься — красоту, тело, ремесло и сад обычных чудес.",
    },
    strengths: {
      en: ["Creation", "Nurture", "Embodied grace"],
      ka: ["შემოქმედება", "ზრუნვა", "ხორცშესხმული მადლი"],
      ru: ["Творчество", "Забота", "Воплощённая грация"],
    },
  },
};

export interface QuizOption {
  labels: Record<LocaleCode, string>;
  weights: Partial<Record<ArchetypeKey, number>>;
}

export interface QuizQuestion {
  q: Record<LocaleCode, string>;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    q: {
      en: "A sealed letter arrives by candlelight. What do you open first?",
      ka: "ანთებულ სანთელთან დალუქული წერილი მოდის. რას ხსნი პირველად?",
      ru: "При свече приходит запечатанное письмо. Что ты откроешь первым?",
    },
    options: [
      {
        labels: {
          en: "The silence between the lines",
          ka: "სტრიქონებს შორის სიჩუმეს",
          ru: "Тишину между строк",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "The will to rewrite the ending",
          ka: "ნებას, რომ დასასრული თავიდან დაწერო",
          ru: "Волю переписать финал",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "The truth hidden in the ink",
          ka: "მელანში დამალულ სიმართლეს",
          ru: "Истину, скрытую в чернилах",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "The life the words could grow",
          ka: "სიცოცხლეს, რაც სიტყვებს შეუძლია აღზარდოს",
          ru: "Жизнь, которую могут вырастить слова",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "Four tools lie on a velvet cloth. Your hand drifts to…",
      ka: "ოთხი ხელსაწყოა ხავერდის ქსოვილზე. შენი ხელი მიდის…",
      ru: "На бархате лежат четыре орудия. Твоя рука тянется к…",
    },
    options: [
      {
        labels: {
          en: "A silver cup of still water",
          ka: "ვერცხლის თასი მშვიდი წყლით",
          ru: "Серебряный кубок тихой воды",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "A wand tipped with living flame",
          ka: "კვერთხი ცოცხალი ალით",
          ru: "Жезл с живым пламенем",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "A blade that cuts fog clean",
          ka: "პირი, რომელიც ნისლს სუფთად ჭრის",
          ru: "Клинок, рассекающий туман",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "A pentacle warm as soil",
          ka: "პენტაკლი ნიადაგივით თბილი",
          ru: "Пентакль, тёплый как почва",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "At a crossroads under Orion, which path hums your name?",
      ka: "ორთავიან გზაჯვარედინზე ორიონის ქვეშ, რომელი გზა ჟღერს შენს სახელს?",
      ru: "На перекрёстке под Орионом какой путь зовёт твоё имя?",
    },
    options: [
      {
        labels: {
          en: "Down into the moonlit cave",
          ka: "მთვარიან გამოქვაბულში ქვემოთ",
          ru: "Вниз в лунную пещеру",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "Straight through the sparking gate",
          ka: "პირდაპირ ნაპერწკლებიან კარიბჭეში",
          ru: "Прямо через искрящиеся врата",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "Alone up the starlit ridge",
          ka: "მარტო ვარსკვლავიან ქედზე მაღლა",
          ru: "Вверх по звёздному хребту в одиночестве",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Into the orchard that never sleeps",
          ka: "ბაღში, რომელიც არასდროს სძინავს",
          ru: "В сад, который не спит",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "A friend asks for magic, not advice. You offer…",
      ka: "მეგობარი მაგიას ითხოვს, არა რჩევას. შენ სთავაზობ…",
      ru: "Друг просит магию, не совет. Ты предлагаешь…",
    },
    options: [
      {
        labels: {
          en: "A listening ritual by water",
          ka: "მოსმენის რიტუალს წყალთან",
          ru: "Ритуал слушания у воды",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "A spoken charm that moves the odds",
          ka: "ნათქვამ შელოცვას, რომელიც შანსებს ცვლის",
          ru: "Произнесённый заговор, что двигает шансы",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "A hard question that frees them",
          ka: "მკაცრ კითხვას, რომელიც ათავისუფლებს",
          ru: "Жёсткий вопрос, что освобождает",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Something handmade and nourishing",
          ka: "რაღაც ხელნაკეთს და მკვებავს",
          ru: "Что-то сделанное руками и питательное",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "What unsettles your magic most?",
      ka: "რა აშფოთებს შენს მაგიას ყველაზე მეტად?",
      ru: "Что сильнее всего тревожит твою магию?",
    },
    options: [
      {
        labels: {
          en: "Forced brightness that denies the dark",
          ka: "იძულებითი სიკაშკაშე, რომელიც სიბნელეს უარყოფს",
          ru: "Навязанный блеск, отрицающий тьму",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "Waiting forever and never casting",
          ka: "უკიდურესი ლოდინი და არასდროს შელოცვა",
          ru: "Вечное ожидание без заклинания",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "Pretty lies dressed as wisdom",
          ka: "ლამაზი ტყუილები სიბრძნის სახით",
          ru: "Красивая ложь под видом мудрости",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Sterile spaces with nothing living",
          ka: "უნაყოფო სივრცეები ცოცხალის გარეშე",
          ru: "Стерильные места без живого",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "The deck fans open. Which major arcana leans toward you?",
      ka: "კოლოდა იშლება. რომელი დიდი არკანი იხრება შენკენ?",
      ru: "Колода раскрывается веером. Какая старшая аркана склоняется к тебе?",
    },
    options: [
      {
        labels: {
          en: "II — High Priestess",
          ka: "II — მღვდელმთავარი",
          ru: "II — Верховная Жрица",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "I — The Magician",
          ka: "I — ჯადოქარი",
          ru: "I — Маг",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "IX — The Hermit",
          ka: "IX — განდეგილი",
          ru: "IX — Отшельник",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "III — The Empress",
          ka: "III — იმპერატრიცა",
          ru: "III — Императрица",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "Midnight finds you alone with the cards. You…",
      ka: "შუაღამე გპოულობს მარტოს კარტებთან. შენ…",
      ru: "Полночь застаёт тебя наедине с картами. Ты…",
    },
    options: [
      {
        labels: {
          en: "Close your eyes and let images rise",
          ka: "თვალებს ხუჭავ და გამოსახულებებს აღმოსვლას აძლევ",
          ru: "Закрываешь глаза и даёшь образам всплыть",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "Name an intention and shuffle with purpose",
          ka: "განზრახვას ასახელებ და მიზნით ურევ",
          ru: "Называешь намерение и мешаешь целенаправленно",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "Study one card until it answers",
          ka: "ერთ კარტს სწავლობ, სანამ გიპასუხებს",
          ru: "Изучаешь одну карту, пока она не ответит",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Arrange a small altar of beauty first",
          ka: "ჯერ პატარა სილამაზის სამსხვერპლოს აწყობ",
          ru: "Сначала устраиваешь маленький алтарь красоты",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "Someone doubts the unseen. Your reply is…",
      ka: "ვიღაც უხილავს ეჭვობს. შენი პასუხია…",
      ru: "Кто-то сомневается в невидимом. Твой ответ…",
    },
    options: [
      {
        labels: {
          en: "A soft story that opens a door",
          ka: "რბილი ამბავი, რომელიც კარს ხსნის",
          ru: "Мягкая история, открывающая дверь",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "Proof by doing — watch this work",
          ka: "მტკიცებულება ქმედებით — ნახე როგორ მუშაობს",
          ru: "Доказательство делом — смотри, как это работает",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "A precise distinction, then quiet",
          ka: "ზუსტი გამიჯვნა, შემდეგ სიჩუმე",
          ru: "Точное различие — и тишина",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Invite them to grow something together",
          ka: "იწვევ ერთად რაღაცის გაზრდაზე",
          ru: "Приглашаешь вырастить что-то вместе",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "Your spirit's favorite weather for workings?",
      ka: "შენი სულის საყვარელი ამინდი რიტუალებისთვის?",
      ru: "Любимая погода твоего духа для практик?",
    },
    options: [
      {
        labels: {
          en: "Fog and silver rain",
          ka: "ნისლი და ვერცხლის წვიმა",
          ru: "Туман и серебряный дождь",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "Dry heat and sudden lightning",
          ka: "მშრალი სიცხე და უეცარი ელვა",
          ru: "Сухой жар и внезапная молния",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "Clear frost and a hard sky",
          ka: "გამჭვირვალე ყინვა და მკაცრი ცა",
          ru: "Ясный мороз и жёсткое небо",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Warm earth after spring rain",
          ka: "თბილი მიწა გაზაფხულის წვიმის შემდეგ",
          ru: "Тёплая земля после весеннего дождя",
        },
        weights: { empress: 2 },
      },
    ],
  },
  {
    q: {
      en: "Choose the closing line of your personal grimoire.",
      ka: "აირჩიე შენი პირადი გრიმუარის დასკვნითი სტრიქონი.",
      ru: "Выбери финальную строку своего гримуара.",
    },
    options: [
      {
        labels: {
          en: "What is veiled will speak when ready.",
          ka: "რაც დაფარულია, მზადყოფნისას ისაუბრებს.",
          ru: "Сокрытое заговорит, когда будет готово.",
        },
        weights: { priestess: 2 },
      },
      {
        labels: {
          en: "I speak — and the world rearranges.",
          ka: "ვამბობ — და სამყარო გადააწყობს თავს.",
          ru: "Я говорю — и мир перестраивается.",
        },
        weights: { magician: 2 },
      },
      {
        labels: {
          en: "Seek the light that does not flatter.",
          ka: "ეძებე შუქი, რომელიც არ ლაქავს.",
          ru: "Ищи свет, который не льстит.",
        },
        weights: { hermit: 2 },
      },
      {
        labels: {
          en: "Tend the living thing until it blooms.",
          ka: "იზრუნე ცოცხალზე, სანამ აყვავდება.",
          ru: "Заботься о живом, пока оно не расцветёт.",
        },
        weights: { empress: 2 },
      },
    ],
  },
];

export function scoreQuiz(answers: number[]): ArchetypeKey {
  const totals: Record<ArchetypeKey, number> = {
    priestess: 0,
    magician: 0,
    hermit: 0,
    empress: 0,
  };
  answers.forEach((optIdx, qIdx) => {
    const opt = QUIZ[qIdx]?.options[optIdx];
    if (!opt) return;
    for (const [k, v] of Object.entries(opt.weights)) {
      totals[k as ArchetypeKey] += v ?? 0;
    }
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0] as ArchetypeKey;
}

const STORAGE_PREFIX = "mkitxavi_personality_v2:";

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}${userId?.trim() || "anon"}`;
}

/** Device-local result; prefer profile when signed in. */
export function loadPersonalityLocal(userId: string | null | undefined): ArchetypeKey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (isArchetypeKey(raw)) return raw;
    // Migrate anon → signed-in once if signed-in slot empty.
    if (userId) {
      const anon = window.localStorage.getItem(storageKey(null));
      if (isArchetypeKey(anon)) return anon;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function savePersonalityLocal(userId: string | null | undefined, key: ArchetypeKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), key);
    if (userId) window.localStorage.setItem(storageKey(null), key);
  } catch {
    /* ignore */
  }
}

export function clearPersonalityLocal(userId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
    if (userId) window.localStorage.removeItem(storageKey(null));
    else window.localStorage.removeItem(storageKey(null));
  } catch {
    /* ignore */
  }
}
