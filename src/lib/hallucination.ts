/**
 * Anti-hallucination guards for Maria.
 * Prompt rules alone are not enough — we block/rewrite after generation.
 */

import type { NinaCardPayload } from "@/lib/nina-ai";
import { isShortHorizonOutcomeAsk, isTodayDayAsk } from "@/lib/day-ask";
import { looksLikeHistoryTopicLeak, stripLeakedPeople, type MemoryTurn } from "@/lib/chat-memory";

/** Model pretending it didn't hear a clear message. */
export function looksLikeDeafFallback(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /გაიმეორებ|ვერ\s*მოვისმინე|კარგად\s*ვერ\s*მოვისმინე|ვერ\s*გავიგე|say that again|didn'?t catch|didn'?t hear|come again\?/i.test(
    t,
  );
}

export function deafFallbackReplacement(lang: "ka" | "en" | "ru"): string {
  if (lang === "en") {
    return "I'm here with you. Tell me what's weighing on you most, and we'll look at it together.";
  }
  if (lang === "ru") {
    return "Я рядом. Скажи, что сильнее всего давит сейчас, и разберём вместе.";
  }
  return "აქ ვარ შენთან. თქვი რა გაწუხებს ყველაზე მეტად, და ერთად შევხედავთ.";
}

const DRAW_CLAIM =
  /(გადავშალ|გავიშალ|გადავშალე|დავიწყე\s*კარტ|კარტები\s*გადმოვ|შევრიყ|კარტები\s*აჩვენ|კარტებმა|კარტები\s*მეტყ|ბარათებ|drew\s+(three\s+|the\s+)?cards?|pulled\s+(the\s+)?cards?|shuffled|the\s+cards\s+(show|say|reveal)|cards\s+show|i\s+(just\s+)?drew|i\s+pulled)/i;

const SUIT_RANK_KA =
  /(?:მახვილების|თასების|პენტაკლების|კვერთხების|დისკების)\s+(?:ტუზი|რაინდი|დედოფალ\w*|მეფე|ვალეტი?|პაჟი|გვერდი|რვი(?:ანი)?|ცხრი(?:ანი)?|ათი(?:ანი)?|ორი|ორმაგი?|სამი(?:ანი)?|ოთხი(?:ანი)?|ხუთი(?:ანი)?|ექვსი(?:ანი)?|შვიდი(?:ანი)?)/;

const MINOR_EN =
  /\b(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)\s+of\s+(cups|swords|wands|pentacles|coins)\b/i;

/** Ambiguous English majors that appear in normal speech — only count with "the X" or draw claim. */
const AMBIGUOUS_MAJOR_EN =
  /\b(the\s+)?(sun|moon|star|world|death|lovers|strength|justice|tower|fool|devil|hermit|magician|empress|emperor|chariot|temperance|judgement|hanged(?:\s+man)?)\b/i;

const CLEAR_MAJOR_KA =
  /კოშკი|სულელ[იი]?|ეტლი|ეშმაკი?|ერემიტი?|იმპერატორი?|იმპერატრიცა|ქურუმი?|მაგუსი?|ბორბალ\w*|უმაღლესი\s*ქურუმ\w*|სასამართლ|სამართალ\w*/i;

/**
 * Detect when the model invents a tarot spread without a real client draw.
 * Tight: common words like sun/moon/world/"მზე" alone must NOT trip this.
 */
export function looksLikeInventedTarotSpread(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const hasDrawClaim = DRAW_CLAIM.test(t);
  const hasSuitRank = SUIT_RANK_KA.test(t) || MINOR_EN.test(t);
  const hasClearMajorKa = CLEAR_MAJOR_KA.test(t);
  const hasAmbiguousMajor = AMBIGUOUS_MAJOR_EN.test(t);

  // Explicit "I drew / cards show…" plus any card-like token → invented spread.
  if (hasDrawClaim && (hasSuitRank || hasClearMajorKa || hasAmbiguousMajor)) return true;
  // Suit+rank without draw claim still means they're naming a spread in chat.
  if (hasSuitRank) return true;
  // Clear Georgian majors (not everyday words) in chat mode.
  if (hasClearMajorKa && /კარტ|ტარო|გაშლ|spread|reading/i.test(t)) return true;
  // "the Tower / the Devil" style with draw framing
  if (
    hasDrawClaim &&
    /\bthe\s+(tower|fool|devil|hermit|magician|empress|emperor|chariot)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Claims to see a cup/palm/photo when no image was sent. */
export function looksLikeFakePhotoSight(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /(ფოტოზე|ფოტოში|ნალექში\s*ვხედავ|ნალექში\s*ჩანს|ხელზე\s*ვხედავ|ხელისგულ|in the (photo|cup|image)|on your palm|in your cup|i (can )?see in the (photo|cup|palm)|looking at (your )?photo)/i.test(
    t,
  );
}

/** Hard invented biography not grounded in a short user message (high precision). */
export function looksLikeUngroundedLifeClaim(text: string, userQuestion: string): boolean {
  const t = text.trim();
  const q = userQuestion.trim().toLowerCase();
  if (!t) return false;

  if (
    /(ორსულ|დაორსულ|ბავშვს\s*შეეძინ|pregnant|pregnancy|you('re| are) pregnant)/i.test(t) &&
    !/(ორსულ|დაორსულ|ბავშვ|pregnant|pregnancy|baby|child)/i.test(q)
  ) {
    return true;
  }

  if (
    /(გაქვს\s*კიბო|გაქვს\s*ავადმყოფ|you have cancer|diagnosed with|შენ\s*მოკვდები|you will die)/i.test(
      t,
    )
  ) {
    return true;
  }

  return false;
}

/** English majors that are too common in prose to use for extra-card detection alone. */
const AMBIGUOUS_EXTRA_EN = new Set([
  "sun",
  "moon",
  "star",
  "world",
  "death",
  "lovers",
  "strength",
  "justice",
  "tower",
  "fool",
  "devil",
  "hermit",
  "magician",
  "empress",
  "emperor",
  "chariot",
  "temperance",
  "judgement",
  "hanged",
  "hanged man",
]);

const MINOR_EN_G =
  /\b(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)\s+of\s+(cups|swords|wands|pentacles|coins)\b/gi;
const SUIT_KA_G = /(?:მახვილების|თასების|პენტაკლების|კვერთხების|დისკების)\s+\S+/g;
const CLEAR_MAJOR_KA_G =
  /კოშკი|სულელ[იი]?|ეტლი|ეშმაკი?|ერემიტი?|იმპერატორი?|იმპერატრიცა|ქურუმი?|მაგუსი?|ბორბალ\w*|უმაღლესი\s*ქურუმ\w*|სასამართლ|სამართალ\w*/g;

const STOP = new Set(["the", "of", "and", "a", "an", "card", "cards"]);

function distinctiveTokens(name: string, key: string): string[] {
  const parts = `${name} ${key}`
    .toLowerCase()
    .split(/[^a-zა-ჰ0-9]+/)
    .filter((s) => s.length > 3 && !STOP.has(s));
  const full = name.toLowerCase().trim();
  return full.length > 3 ? [full, ...parts] : parts;
}

function isAllowedToken(token: string, allowed: string[]): boolean {
  const core = token
    .replace(/^the\s+/, "")
    .trim()
    .toLowerCase();
  return allowed.some((a) => a === core || a.includes(core) || core.includes(a));
}

/** True if the reading invents card names that were not in the drawn three. */
export function readingInventedExtraCards(
  text: string,
  cards: NinaCardPayload[] | undefined,
): boolean {
  if (!cards?.length || !text.trim()) return false;
  const allowed = cards.flatMap((c) => distinctiveTokens(c.name || "", c.key || ""));
  if (allowed.length === 0) return false;

  const found: string[] = [];

  // Only unambiguous minor suits (Ace of Cups etc.)
  MINOR_EN_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MINOR_EN_G.exec(text)) !== null) {
    found.push(m[0].toLowerCase());
  }

  SUIT_KA_G.lastIndex = 0;
  while ((m = SUIT_KA_G.exec(text)) !== null) {
    found.push(m[0].toLowerCase());
  }

  CLEAR_MAJOR_KA_G.lastIndex = 0;
  while ((m = CLEAR_MAJOR_KA_G.exec(text)) !== null) {
    found.push(m[0].toLowerCase());
  }

  // English majors: only "the Tower" / "the Devil" style, skip bare sun/moon/strength.
  const enMajor =
    /\bthe\s+(tower|fool|chariot|sun|moon|star|devil|death|hermit|magician|empress|emperor|lovers|strength|justice|temperance|judgement|world|hanged(?:\s+man)?)\b/gi;
  enMajor.lastIndex = 0;
  while ((m = enMajor.exec(text)) !== null) {
    const name = m[0].toLowerCase().replace(/^the\s+/, "");
    if (!AMBIGUOUS_EXTRA_EN.has(name) || /\bthe\s+/.test(m[0])) {
      // Still skip if it's a common prose word used without card framing —
      // require "the X" already matched.
      found.push(name);
    }
  }

  if (found.length === 0) return false;

  // Need at least one clear extra card that isn't in the drawn three.
  const extras = found.filter((token) => !isAllowedToken(token, allowed));
  // Ambiguous singles like "strength" alone shouldn't kill a reading.
  const serious = extras.filter((token) => {
    const core = token.replace(/^the\s+/, "");
    if (AMBIGUOUS_EXTRA_EN.has(core) && !token.includes(" of ")) return false;
    return true;
  });
  return serious.length > 0;
}

/**
 * High-precision: today-only ask answered with past/present/future + multi-month horizon.
 * e.g. "წარსულში… მომავალში… 1–2 თვის განმავლობაში"
 */
export function looksLikeInventedLongHorizonOnTodayAsk(text: string, question: string): boolean {
  if (!isTodayDayAsk(question)) return false;
  const t = text.trim();
  if (!t) return false;

  const hasLongHorizon =
    /1\s*[-–—]?\s*2\s*თვ|1\s*[-–—]?\s*2\s*months?|within\s+(the\s+)?(next\s+)?(few\s+)?months?|რამდენიმე\s*თვ|ორი\s*თვ|2\s*[-–—]?\s*6\s*weeks|2\s*[-–—]?\s*6\s*კვირ/i.test(
      t,
    );
  const hasPpf =
    /წარსულში|მომავალში|in the past\b|in the future\b|past\s*[/→-].*present|PAST\s*[/→-].*PRESENT/i.test(
      t,
    );

  // Require a clear long horizon; PPF alone can appear in other languages innocently.
  return hasLongHorizon && (hasPpf || /თვ|month/i.test(t));
}

/**
 * Short-horizon outcome ask (TikTok/tonight/viral) answered with Past/Present/Future
 * personal-therapy framing — the exact failure mode users complain about.
 */
export function looksLikePastPresentFutureOnShortHorizonAsk(
  text: string,
  question: string,
): boolean {
  if (!isShortHorizonOutcomeAsk(question)) return false;
  const t = text.trim();
  if (!t) return false;

  const hasPpf =
    /წარსულში|აწმყოში|მომავალში|in the past\b|in the present\b|in the future\b|past\s*[/→-].*present|PAST\s*[/→-].*PRESENT/i.test(
      t,
    );
  const hasTherapyAutobio =
    /დაუფასებ|undervalued|unnoticed|შეუმჩნეველ|გაფიქრებინა|what made you (think|feel)|რამ\s*გაფიქრებინა|თავს\s*დაუფასებ/i.test(
      t,
    );
  const hasLongHorizon =
    /1\s*[-–—]?\s*2\s*თვ|1\s*[-–—]?\s*2\s*months?|within\s+(the\s+)?(next\s+)?(few\s+)?months?|რამდენიმე\s*თვ/i.test(
      t,
    );

  return hasPpf || (hasTherapyAutobio && /წარსულ|past|შიშ|fear|გრძნობ/i.test(t)) || hasLongHorizon;
}

/** Soft-repair PPF / therapy framing on a short-horizon outcome ask. */
export function repairPastPresentFutureOnShortHorizonAsk(opts: {
  text: string;
  question: string;
  lang: "ka" | "en" | "ru";
}): string {
  const original = opts.text.trim();
  if (!looksLikePastPresentFutureOnShortHorizonAsk(original, opts.question)) return original;

  const parts = original
    .split(/(?<=[.!?…؟])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = parts.filter(
    (p) =>
      !/წარსულში|აწმყოში|მომავალში|in the past\b|in the present\b|in the future\b|1\s*[-–—]?\s*2\s*თვ|1\s*[-–—]?\s*2\s*months?|რამ\s*გაფიქრებინა|what made you (think|feel)|დაუფასებ|undervalued|unnoticed|შეუმჩნეველ/i.test(
        p,
      ),
  );
  const cleaned = kept.join(" ").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 40) return cleaned;
  if (opts.lang === "en") {
    return "The cards speak to tonight's lean: momentum, what blocks reach, and where the energy points this evening. Want another draw on a sharper angle?";
  }
  return "კარტები დღეს საღამოს მიმართულებას აჩვენებს: ენერგია, დაბრკოლება და სად მიდის რეიჩი ამ საღამოს. გინდა კიდევ ერთი გაშლა უფრო მკაფიო კუთხით?";
}

/** Strip sentences that invent multi-month timing on a today-only ask. */
export function repairInventedLongHorizonOnTodayAsk(opts: {
  text: string;
  question: string;
  lang: "ka" | "en" | "ru";
}): string {
  const original = opts.text.trim();
  if (!looksLikeInventedLongHorizonOnTodayAsk(original, opts.question)) return original;

  const parts = original
    .split(/(?<=[.!?…؟])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = parts.filter(
    (p) =>
      !/1\s*[-–—]?\s*2\s*თვ|1\s*[-–—]?\s*2\s*months?|within\s+(the\s+)?(next\s+)?(few\s+)?months?|რამდენიმე\s*თვ|ორი\s*თვ|2\s*[-–—]?\s*6\s*weeks/i.test(
        p,
      ),
  );
  const cleaned = kept.join(" ").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 40) return cleaned;
  if (opts.lang === "en") {
    return "Today's cards stay with this day: the energy, the challenge, and one clear move for tonight. Ask if you want a longer-horizon spread next.";
  }
  return "დღევანდელი კარტები ამ დღეს რჩება: ენერგია, გამოწვევა და ერთი მკაფიო ნაბიჯი საღამომდე. თუ უფრო შორ ჰორიზონტს გინდა, ცალკე მკითხე.";
}

const STOCK_MONTH_WINDOW =
  /1\s*[-–—]?\s*2\s*თვ|1\s*[-–—]?\s*2\s*months?|2\s*[-–—]?\s*3\s*თვ|2\s*[-–—]?\s*3\s*months?|მომდევნო\s*1\s*[-–—]?\s*2\s*თვ|within\s+(the\s+)?(next\s+)?(couple of|1\s*[-–—]?\s*2|two)\s*months?|უახლოესი\s*1\s*[-–—]?\s*2\s*თვ|couple of months/i;

/** True when the seeker actually asked for timing. */
export function isTimingAsk(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q) return false;
  return /როდის|რა\s*დროში|როდემდე|when will|how soon|how long|what month|which month|რომელ\s*თვ|exact(ly)?\s*(when|date|month)/i.test(
    q,
  );
}

/**
 * Lazy "always 1–2 months" stock timing — ban when they didn't ask when,
 * or when it's the canned phrase even on timing asks (rewrite toward condition).
 */
export function looksLikeStockMonthWindow(text: string, question: string): boolean {
  const t = text.trim();
  if (!t || !STOCK_MONTH_WINDOW.test(t)) return false;
  // Always flag the canned phrase; repair differs by whether they asked when.
  return true;
}

/** Soft-remove or rewrite canned 1–2 / 2–3 month countdowns. */
export function repairStockMonthWindow(opts: {
  text: string;
  question: string;
  lang: "ka" | "en" | "ru";
}): string {
  const original = opts.text.trim();
  if (!looksLikeStockMonthWindow(original, opts.question)) return original;

  const parts = original
    .split(/(?<=[.!?…؟])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = parts.filter((p) => !STOCK_MONTH_WINDOW.test(p));
  let cleaned = kept.join(" ").replace(/\s+/g, " ").trim();

  // Also scrub inline clauses inside kept sentences.
  cleaned = cleaned
    .replace(/[,.]?\s*(მომდევნო|უახლოესი)?\s*1\s*[-–—]?\s*2\s*თვ\w*(?:\s*განმავლობაში)?/gi, "")
    .replace(/[,.]?\s*within\s+(the\s+)?(next\s+)?(1\s*[-–—]?\s*2|couple of)\s*months?/gi, "")
    .replace(/[,.]?\s*2\s*[-–—]?\s*3\s*(თვ\w*|months?)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 40) return cleaned;

  const askedWhen = isTimingAsk(opts.question);
  if (opts.lang === "en") {
    return askedWhen
      ? "The future card points to movement after a clear condition. Watch for the next honest shift, not a fixed month stamp."
      : "The cards speak to the energy and the next move, not a canned month countdown.";
  }
  return askedWhen
    ? "მომავლის კარტი მოძრაობას აჩვენებს კონკრეტული პირობის შემდეგ. თვეების მზა შტამპს არ დავადებ."
    : "კარტები ენერგიასა და შემდეგ ნაბიჯს მეტყველებენ, არა ყოველთვის ერთსა და იმავე თვეების შტამპს.";
}

export type HallucinationHit =
  | "deaf"
  | "fake_spread"
  | "fake_photo"
  | "ungrounded_life"
  | "extra_cards"
  | "topic_leak"
  | "today_long_horizon"
  | "short_horizon_ppf"
  | "stock_month_window";

export function detectHallucination(opts: {
  mode: string;
  text: string;
  question: string;
  hasImage?: boolean;
  cards?: NinaCardPayload[];
  history?: MemoryTurn[];
}): HallucinationHit | null {
  const { mode, text, question, hasImage, cards, history } = opts;
  if (looksLikeDeafFallback(text)) return "deaf";

  if (mode === "chat" || mode === "clarify" || mode === "dream") {
    // Continuing an active spread: only flag cards outside the three on the table.
    if (cards?.length) {
      if (readingInventedExtraCards(text, cards)) return "extra_cards";
    } else if (looksLikeInventedTarotSpread(text)) {
      return "fake_spread";
    }
    if (!hasImage && looksLikeFakePhotoSight(text)) return "fake_photo";
    if (looksLikeUngroundedLifeClaim(text, question)) return "ungrounded_life";
  }

  if ((mode === "coffee" || mode === "hand") && looksLikeInventedTarotSpread(text)) {
    return "fake_spread";
  }

  if (mode === "reading" && readingInventedExtraCards(text, cards)) {
    return "extra_cards";
  }

  if (mode === "reading" && looksLikeInventedLongHorizonOnTodayAsk(text, question)) {
    return "today_long_horizon";
  }

  if (
    (mode === "reading" || mode === "chat") &&
    looksLikePastPresentFutureOnShortHorizonAsk(text, question)
  ) {
    return "short_horizon_ppf";
  }

  if ((mode === "reading" || mode === "chat") && looksLikeStockMonthWindow(text, question)) {
    return "stock_month_window";
  }

  if (
    (mode === "chat" || mode === "clarify" || mode === "dream" || mode === "reading") &&
    looksLikeHistoryTopicLeak(text, question, history).length > 0
  ) {
    return "topic_leak";
  }

  return null;
}

/** Soft-clean a reply that dragged unrelated history people into a new topic. */
export function repairTopicLeak(opts: {
  text: string;
  question: string;
  history?: MemoryTurn[];
  lang: "ka" | "en" | "ru";
}): string {
  const original = opts.text.trim();
  const leaked = looksLikeHistoryTopicLeak(original, opts.question, opts.history);
  if (!leaked.length) return original;
  const cleaned = stripLeakedPeople(original, leaked).trim();
  if (cleaned.length >= 40) return cleaned;
  return original;
}

/** Shared prompt block injected into every generative mode. */
export function antiHallucinationPromptRules(
  mode: string,
  opts?: { hasCards?: boolean },
): string[] {
  const base = [
    "GROUNDING / NO HALLUCINATION (critical — never break):",
    "- ONLY use: the seeker's latest message, relevant prior chat about THIS same topic, profile fields given to you, and (if provided) the attached photo or the three listed cards.",
    "- FORBIDDEN: inventing people, names, pregnancies, jobs, illnesses, money amounts, secrets, or events they never mentioned.",
    "- FORBIDDEN: name-dropping people from earlier unrelated chat. History is silent memory (don't re-ask) — not a cast list to recycle.",
    "- FORBIDDEN: 'I sense that…' biography facts that are not grounded in what they said or in the cards/photo.",
    "- FORBIDDEN: pretending you did not hear / asking them to repeat a clear message.",
    "- Use Maria’s voice: warm, direct, and grounded in the question. Be honest about being an AI character if asked.",
    "- If a fact is missing, ask ONE short question — do not invent the answer.",
  ];

  if (mode === "chat" && opts?.hasCards) {
    return [
      ...base,
      "- ACTIVE SPREAD: you may name ONLY the three listed cards. Never invent a fourth card or a new shuffle.",
      "- Answer like a reader deepening the same spread — not like a therapist without cards.",
      "- FORBIDDEN: claiming you see a cup, palm, or photo when none was attached.",
    ];
  }

  if (mode === "chat" || mode === "clarify" || mode === "dream") {
    return [
      ...base,
      "- NO cards listed this turn: do NOT invent card titles or claim you just shuffled/drew a full spread.",
      "- Stay in tarot-reader voice (deck / table / energy). The app opens the deck when they ask a real question.",
      "- FORBIDDEN: claiming you see a cup, palm, or photo when none was attached.",
      "- FORBIDDEN: long psychology/CBT essays with zero tarot framing.",
    ];
  }

  if (mode === "reading") {
    return [
      ...base,
      "- You may ONLY interpret the three cards listed in the user prompt. Do not name any other card.",
      "- Do not invent a fourth card. Do not invent biography they did not give.",
      "- Speak as a reader who already shuffled and laid the spread — not as a chatbot summarizing advice.",
      "- If the question is about TODAY / this day / tonight's day-outlook: use day positions (energy/challenge/advice or morning/afternoon/evening). NEVER default to past→present→future months. FORBIDDEN: any თვე/month window on a today ask.",
      "- If the question is a SHORT-HORIZON OUTCOME (TikTok/viral/views/tonight will-it-happen): use Momentum → Block → Tonight's lean (ენერგია → დაბრკოლება → დღეს საღამოს მიმართულება). Answer the ask first. FORBIDDEN: წარსულში/PAST therapy autobiography and therapist follow-ups.",
      "- FORBIDDEN stock timing: never default to '1–2 months' / '1-2 თვე' / '2–3 months'. If they didn't ask when, give no month countdown.",
    ];
  }

  if (mode === "coffee" || mode === "hand") {
    return [
      ...base,
      "- ONLY describe shapes/lines you can actually see in the attached photo. If unclear, ask for a better photo — do not invent.",
      "- No tarot card names in photo readings.",
    ];
  }

  return base;
}
