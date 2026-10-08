/**
 * Fix assistant self-name slips only.
 * Do NOT rewrite every "Nina/ნინა" - seekers often ask about a person named Nina.
 */
export function sanitizeAssistantName(text: string): string {
  return text
    .replace(/\bI(?:'m| am)\s+Nina\b/gi, "I am Maria")
    .replace(/\b[Mm]y name is Nina\b/g, "my name is Maria")
    .replace(/\bThis is Nina\b/gi, "This is Maria")
    .replace(/\bI'm Nina\b/gi, "I'm Maria")
    .replace(/მე\s+ნინა\s+ვარ/g, "მე მარია ვარ")
    .replace(/მქვია\s+ნინა/g, "მქვია მარია")
    .replace(/ჩემი\s+სახელია\s+ნინა/g, "ჩემი სახელია მარია")
    .replace(/меня зовут Нина/gi, "меня зовут Мария")
    .replace(/\bя Нина\b/gi, "я Мария")
    .replace(/([ - \-–,]\s*)Nina\b/g, "$1Maria")
    .replace(/([ - \-–,]\s*)ნინა\b/g, "$1მარია")
    .replace(/([ - \-–,]\s*)Нина\b/g, "$1Мария");
}

/** Strip markdown / AI formatting so chat stays human. */
export function stripAiMarkup(text: string): string {
  return sanitizeAssistantName(
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/_([^_\n]+)_/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*•–, ]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\u2014/g, ",")
      .replace(/ ,/g, ",")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

/** Re-export anti-hallucination helpers used by older call sites. */
export { deafFallbackReplacement, looksLikeDeafFallback } from "@/lib/hallucination";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[!.,…~?؟]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hint for Maria’s reply language, never blocks a language. */
export type ReplyLang = "ka" | "en" | "match";

/**
 * Latin-letter Georgian (keyboard transliteration), e.g.
 * "Ara sxvarame vigulisxme shen chems shekitxvas ver xvdebi"
 */
export function looksLikeLatinGeorgian(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\p{Script=Georgian}/u.test(text)) return false;

  const markers =
    n.match(
      /\b(ara|ar|ki|diakh|unda|ver|rom|rogor|ratom|raitom|vin|sad|shen|me|chemi|chems|sheni|misi|chven|tkven|aris|xar|khar|iqo|ikneba|gamarjoba|madloba|madlobt|tu|sxva|rame|magari|kargi|kargia|dzalian|xo|ho|aba|nu|netavi|miutxari|mainteresebs|vigulisxm\w*|gulisxm\w*|shekitxv\w*|xvdeb\w*|shegidzl\w*|mogewon\w*|miyvar\w*|uyvar\w*|momecer\w*|gtxov\w*|mind\w*|vich\w*|vapir\w*|vapikr\w*|vapikr\w*)\b/gi,
    ) ?? [];

  // Stronger bar: short English words (me/ar/ki/rom) alone must not flip language to KA.
  const strong =
    n.match(
      /\b(gamarjoba|madloba|madlobt|mainteresebs|miutxari|raitom|rogor|rodis|vigulisxm\w*|shekitxv\w*|xvdeb\w*|geia|dzmakac|megobari|prava|martvis)\b/gi,
    ) ?? [];
  if (strong.length >= 1 && markers.length >= 2) return true;
  if (markers.length >= 3) return true;

  // Dense transliteration cues (x/q/w for ხ/ქ/ვ, sh/ch/gh/kh/dz/ts clusters).
  const cueHits =
    (n.match(/\b\w*(sh|ch|gh|kh|dz|ts|ph)\w*\b/gi) ?? []).length +
    (n.match(/\b\w*[xq]\w*\b/gi) ?? []).length;
  const words = n.split(" ").filter(Boolean);
  if (words.length >= 4 && markers.length >= 2 && cueHits >= 3) return true;
  if (words.length >= 5 && strong.length >= 1 && cueHits >= 2) return true;

  return false;
}

/**
 * Detect script for reply guidance. Always allow any language;
 * "match" means reply in whatever the user just used (e.g. Russian).
 */
export function detectReplyLanguage(text: string): ReplyLang {
  const t = text.trim();
  if (!t) return "en";

  const georgian = (t.match(/\p{Script=Georgian}/gu) ?? []).length;
  const cyrillic = (t.match(/\p{Script=Cyrillic}/gu) ?? []).length;
  const latin = (t.match(/[A-Za-z]/g) ?? []).length;

  if (georgian > 0 && georgian >= cyrillic && georgian >= latin) return "ka";
  // Latin-script Georgian must win over the generic "latin → English" rule.
  if (latin > 0 && georgian === 0 && looksLikeLatinGeorgian(t)) return "ka";
  if (latin > 0 && latin >= cyrillic && georgian === 0) return "en";
  if (cyrillic > 0 || georgian > 0) return "match";
  return "match";
}

/** Questions about Maria herself / AI / human, never a card reading. */
export function isMetaAboutAssistant(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;

  if (
    /ხელოვნური\s*ინტელექტ|ინტელექტი\s*ხარ|რობოტი|ბოტი\s*ხარ|ნამდვილი\s*(ადამიანი|ხარ)|ადამიანი\s*ხარ|ვინ\s*ხარ|რა\s*ხარ|შენ\s*ვინ|ნამდვილი\s*ადამიანი\s*ტარო/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    /\b(are you (an? )?(ai|artificial|bot|robot|real|human|chatgpt)|who are you|what are you|are you real|you an ai|real (person|human)|human or ai)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/\b(artificial intelligence|chatgpt|gemini|llm)\b/.test(n)) return true;
  // Language / "why English" complaints — chat only, never cards.
  if (
    /ინგლისურ|რატომ\s*მესაუბრ|რატომ\s*ინგლ|why\s*(are you|do you)\s*(speak|talking|reply)|speak(ing)?\s*english|in english|на\s*английск/.test(
      n,
    )
  ) {
    return true;
  }
  return false;
}

/** Coffee-cup / tasseography, not tarot cards. */
export function isCoffeeReadingAsk(text: string): boolean {
  const n = normalize(text);
  if (
    /ნალექიან|ყავაზე\s*მკითხ|ჭიქაზე\s*მკითხ|coffee\s*reading|cup\s*reading|tasseograph|coffee\s*grounds|coffee\s*cup/.test(
      n,
    )
  ) {
    return true;
  }
  const hasCup = /ყავ|ნალექ|ჭიქა|ფინჯან|кофе/.test(n);
  const hasRead = /მკითხ|წაიკითხ|гадан|შეგიძლია/.test(n);
  return hasCup && hasRead;
}

/** Palmistry / hand reading, not tarot cards. */
export function isHandReadingAsk(text: string): boolean {
  const n = normalize(text);
  // Avoid English idiom "on the other hand".
  if (/\bon the other hand\b/.test(n)) return false;
  if (
    /ხელზე\s*მკითხ|ხელისგულ|პალმისტ|palm\s*read|palmistry|hand\s*read|chiromanc|гадан.*ладон|по\s*руке/.test(
      n,
    )
  ) {
    return true;
  }
  const hasHand = /ხელი|ხელისგულ|ხელზე|palmistry|\bpalm\b|ладон|по\s*руке/.test(n);
  const hasRead = /მკითხ|წაიკითხ|гадан|შეგიძლია/.test(n);
  return hasHand && hasRead && !isCoffeeReadingAsk(text);
}

/** User is describing / asking about a dream (stay in dream lane). */
export function isDreamNarrative(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  return /სიზმ|ძილში|მეძინა|დამეძინა|ვოცნებ|ოცნებ|nightmare|dream(t|ed)?|dreaming|кошмар|приснил|\bсон\b|снилось|снится/.test(
    n,
  );
}

/**
 * Clear life/love/person asks that should open the tarot deck,
 * even if the user previously tapped "Dream interpretation".
 */
/** Vague "something else" / hasn't named the topic yet — chat, do NOT draw. */
export function isUnspecifiedTopicAsk(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  // Already named a concrete life topic → not unspecified.
  if (
    /მართვ|პრავ|მოწმობ|სიყვარულ|უყვ|გეი|სამსახურ|კარიერ|ფულ|ფინანს|სიზმ|ძმა|ალეკო|ლაშა|ნინ|license|exam|love|job|money|dream/.test(
      n,
    )
  ) {
    return false;
  }
  return /სხვა\s*რამე|სხვა\s*თემა|ჯერ\s*(კიდევ\s*)?არ\s*მითქვ|არ\s*მითქვამს|რაც\s*ჯერ\s*არ|something else|another thing|different topic|haven'?t (said|told)|i (still )?haven'?t|not (told|said) yet/.test(
    n,
  );
}

/** User is complaining they did NOT ask for a draw — chat, do NOT reshuffle. */
export function isCardDrawRefusal(text: string): boolean {
  const n = normalize(text);
  return /(არ\s*მითქვია|არ\s*მითხოვია|არ\s*მინდოდა|არ\s*მინდა|არ\s*მთხოვია).{0,50}(კარტ|გაშალ|გაგეშალ|წაიკითხ)|didn'?t (ask|tell).{0,40}(card|draw|spread)|don'?t draw|no cards|without cards|კარტი?\s*არ\s*(მინდა|მითხოვ)/.test(
    n,
  );
}

export { isTodayDayAsk, isBareCardDrawAsk, isShortHorizonOutcomeAsk } from "@/lib/day-ask";
import { isTodayDayAsk, isBareCardDrawAsk, isShortHorizonOutcomeAsk } from "@/lib/day-ask";

/**
 * Last user message that is a concrete life/day ask (not bare "draw cards").
 * Used so "გამიშალე კარტი" draws for the prior today/life question.
 */
export function findLastConcreteLifeQuestion(
  history: Array<{ role: string; text: string }> | undefined,
): string | null {
  const h = history ?? [];
  for (let i = h.length - 1; i >= 0; i--) {
    const turn = h[i];
    if (turn.role !== "user") continue;
    const t = (turn.text ?? "").trim();
    if (!t) continue;
    if (isBareCardDrawAsk(t)) continue;
    if (isTodayDayAsk(t) || isShortHorizonOutcomeAsk(t) || isLikelyCardReadingAsk(t)) return t;
  }
  return null;
}

export function isLikelyCardReadingAsk(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (
    isDreamNarrative(raw) ||
    isCoffeeReadingAsk(raw) ||
    isHandReadingAsk(raw) ||
    isMetaAboutAssistant(raw)
  ) {
    return false;
  }
  if (isOffTopicOrJailbreak(raw)) return false;
  if (isUnspecifiedTopicAsk(raw) || isCardDrawRefusal(raw)) return false;

  const n = normalize(raw);

  // Daily outlook / "what kind of day" — MUST draw before answering.
  if (isTodayDayAsk(raw)) return true;

  // Near-term outcome / viral / tonight — MUST draw (Momentum/Block/Tonight's lean).
  if (isShortHorizonOutcomeAsk(raw)) return true;

  // Explicit deck / reading language (but not "I didn't ask you to draw")
  if (/კარტ|ტარო|გადაშალ|წაიკითხ|მკითხ|tarot|cards?|spread|гадай|карты|таро/.test(n)) {
    if (/არ\s*მითქვია|არ\s*მინდ|გაგეშალე|didn'?t ask|don'?t draw/.test(n)) return false;
    return true;
  }

  // Love / person clarity / hard yes-no (must redraw — never soft therapy chat)
  if (
    /რას\s*ფიქრობს|რას\s*ფიქრობ|ვუყვარვარ|ვუყვარ\s*ვარ|მიყვარს|უყვარს|მოსწონს|დამიბრუნ|დაბრუნდ|მეღალატ|ღალატ|გეი\s*არის|მინდა\s*ვიცოდე|ვინმე\s*ყავ|სხვა\s*ყავ|სხვა\s*ქალ|სხვა\s*კაც|გამოყენებ|გამოსწორდ|გაუმჯობეს|რა\s*სიმართლე|რას\s*მირჩევ|როგორ\s*მოვიქც|რამე\s*აწუხებ|რატომ\s*ხდება|უყვარვარ|კიდე\s*უყვ|ჯერ\s*კიდე\s*უყვ/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    /\b(does|do|is|are|will)\b.+\b(love|like|cheat|gay|miss|return|think|fix|improve)\b|\bwhat does\b.+\bthink\b|\blove me\b|\bstill love\b|\bsomeone else\b|\bother (woman|man|girl|guy)\b|\bwhat should i do\b|\bhow should i\b|\bwhat('?s| is) the truth\b|\bwhy is this\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/любит|думает обо мне|верн[её]тся|измен|есть ли кто|любит ли/.test(n)) return true;

  // Named person + "about me" / age marker + question (e.g. "ალეკო 22 ჩემზე?")
  if (
    (/ჩემზე|about me|обо мне/.test(n) || /\b\d{1,2}\b/.test(n)) &&
    (/[?؟]/.test(raw) || /ფიქრ|think|love|უყვ|მიყვ|მოსწონ/.test(n))
  ) {
    return true;
  }

  // Self / life / psyche / fate / future asks — must draw cards
  // e.g. "ჩემი ყველაზე ძლიერი ფსიქოლოგიური ტრავმა რა არის?"
  // e.g. "ზოგადად რა მოხდება", "მომავალი მაინტერესებს", "პირადში რა იქნება"
  if (
    /ტრავმ|ფსიქოლოგ|წარსულ|ბედისწერ|\bბედი\b|კარიერ|სამსახურ|ოჯახ|ფინანს|\bფულ|ჯანმრთელ|მომავალ|რა\s*მოხდ|რა\s*იქნ|მექნებ|პირად|ზოგადად|სიყვარულ|განქორწინ|ყოფილ|შეხვედრ|ურთიერთ|ბიჭ|გოგო|ქმარ|ცოლ|ექსი|\bex\b|trauma|psycholog|anxiety|depression|career|financ|family|destiny|fate|purpose|childhood|future|what will happen|when will|license|exam|divorce|relationship|boyfriend|girlfriend/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    /ჩემი\s+\S+/.test(n) &&
    /რა\s*(არის|იყო|იქნება|მემუქრ|მიშლის)|რატომ|როგორ|როდის|what('?s| is| was| will)|why\b|how\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    /\b(what('?s| is)|tell me)\b.+\bmy\b.+\b(trauma|fear|block|wound|problem|path|purpose|future)\b/.test(
      n,
    )
  ) {
    return true;
  }
  // Timing / license / exam / "I want an answer"
  if (
    /როდის|რა\s*დროში|პასუხი\s*მინდა|მართვ|პრავ|მოწმობ|გამოცდ|ჩავიჭრ|when will|driving license|driver'?s license|\blicense\b|\bexam\b/.test(
      n,
    )
  ) {
    return true;
  }
  return false;
}

/** Jailbreak / off-topic code tricks, stay in character, no cards. */
export function isOffTopicOrJailbreak(text: string): boolean {
  const n = normalize(text);
  if (
    /\b(python|javascript|typescript|code|script|print\s*\(|hello world|ignore (all |previous )?instructions|system prompt|jailbreak)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/დაწერე|კოდი|პროგრამ|hello world|print\(/.test(n) && /python|კოდ|script|პროგრამ/.test(n)) {
    return true;
  }
  return false;
}

/**
 * Soft follow-ups after a reading: rewrite/ack only — stay on the SAME three cards.
 * Anything denser (facts, fears, yes/no) is NOT soft — redraw or continue-on-cards elsewhere.
 * e.g. "მოკლედ მითხარი", "კი", "ok"
 */
export function isConversationFollowUp(text: string): boolean {
  const raw = text.trim();
  if (!raw) return true;
  if (
    isMetaAboutAssistant(raw) ||
    isCoffeeReadingAsk(raw) ||
    isHandReadingAsk(raw) ||
    isOffTopicOrJailbreak(raw)
  ) {
    return false;
  }
  // Hard divinatory asks are never "soft"
  if (isLikelyCardReadingAsk(raw) || isTodayDayAsk(raw) || isShortHorizonOutcomeAsk(raw))
    return false;

  const n = normalize(raw);
  const words = n.split(" ").filter(Boolean);
  if (words.length === 0) return true;

  if (
    words.length <= 8 &&
    /^(მოკლედ|მოკლედ\s*მითხარი|უფრო\s*მოკლე|შემოკლე|გაიმეორე|უფრო\s*მარტივად|რას\s*ნიშნავს|explain|shorter|briefly|summarize|tl;dr|in short|simpler)\b/.test(
      n,
    )
  ) {
    return true;
  }

  if (words.length <= 3) {
    if (
      /^(კი|კარგი|ოქე|ოკე|დიახ|არა|მადლობა|thanks|thank you|ok|okay|yes|yeah|yep|no|hmm|მმ|აბა|continue|go on|მზად(?:\s+ვარ)?)$/.test(
        n,
      )
    ) {
      return true;
    }
  }

  return false;
}

/** Question-shaped follow-up that needs a fresh draw (not soft therapy chat). */
export function isDivinatoryQuestion(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (isConversationFollowUp(raw) || isChatOnly(raw, [])) return false;
  if (isLikelyCardReadingAsk(raw) || isTodayDayAsk(raw) || isShortHorizonOutcomeAsk(raw))
    return true;
  if (/[?؟]/.test(raw)) return true;
  const n = normalize(raw);
  return /^(რა|რატომ|როგორ|როდის|ვინ|არის|ხომ|გაინტერეს|მაინტერეს|does|is|are|will|what|why|how|who|should)\b/.test(
    n,
  );
}

/** True for greetings / thanks / bye / meta / coffee / jailbreak, never open the deck. */
export function isChatOnly(text: string, greetings: string[]): boolean {
  const raw = text.trim();
  if (!raw) return true;
  if (isMetaAboutAssistant(raw)) return true;
  if (isCoffeeReadingAsk(raw)) return true;
  if (isHandReadingAsk(raw)) return true;
  if (isOffTopicOrJailbreak(raw)) return true;
  return isSmallTalk(raw, greetings);
}

/** True only for greetings / thanks / bye / wellbeing — NEVER real life asks. */
export function isSmallTalk(text: string, greetings: string[]): boolean {
  const raw = text.trim();
  if (!raw) return true;
  if (isMetaAboutAssistant(raw)) return true;

  const normalized = normalize(raw);
  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 0) return true;

  // Real life / timing asks are never small talk.
  if (isLikelyCardReadingAsk(raw) || isLifeQuestionLike(normalized, words)) return false;

  // Wellbeing / greeting questions stay chat (never burn a reading).
  if (
    /^(how are you|how's it going|how r u|როგორ ხარ|როგორა ხარ|როგორ ხართ|როგორაა|what's up|wassup)[\s!?؟.]*$/i.test(
      normalized,
    )
  ) {
    return true;
  }

  // Only pure greetings / thanks / bye count as small talk.
  if (words.length <= 4) {
    const joined = words.join(" ");
    if (
      greetings.some((g) => joined === g || joined.startsWith(`${g} `) || joined.endsWith(` ${g}`))
    ) {
      return true;
    }
    if (
      /^(გამარჯობა|სალამი|მადლობა|გმადლობ|ნახვამდის|hello|hi|hey|thanks|thank you|bye|ok|okay|კი|დიახ|არა)[\s!.?؟]*$/i.test(
        joined,
      )
    ) {
      return true;
    }
  }

  return false;
}

function isLifeQuestionLike(normalized: string, words: string[]): boolean {
  // Long messages alone are NOT life questions ("I didn't ask for cards…" is long).
  const en =
    /\b(is|are|am|was|were|will|can|could|should|would|does|did|do|what|why|how|when|who|whom|whose|which|where|whether|if my|about my|tell me|read for|gay|cheat|pregnant|love me|does he|does she|likes me|license|exam)\b/i;
  const kaRe =
    /არის|იქნება|რა |რატომ|როგორ|როდის|ვინ |სად |თუ არა|გეი|გეია|მეგობარი|ძმა|ძმაკაც|სიყვარული|მითხარი|წაიკითხ|მოსწონს|მართვ|პრავ|მოწმობ|გამოცდ|ავიღ|ჩავიჭრ|პასუხი|მინდა/;
  const kaLat =
    /\b(mainteresebs|mismine|geia|gei|brati|dzma|dzmakac|megobari|tu ara|miutxari|raitom|rogor|rodis|moscons|gamarjoba|prava|martvis)\b/i;

  if (en.test(normalized) || kaRe.test(normalized) || kaLat.test(normalized)) return true;
  if (
    words.length >= 6 &&
    /[?؟]|როდის|რა |რატომ|როგორ|მინდა|tell me|when |will i/.test(normalized)
  ) {
    return true;
  }
  return false;
}

/** True when the ask is clearly NOT a love/relationship question. */
export function isNonLoveLifeAsk(text: string): boolean {
  const n = normalize(text);
  if (
    /სიყვარულ|უყვ|მიყვ|ღალატ|ყოფილ|ბიჭ|გოგო|ქმარ|ცოლ|ექსი|love|cheat|\bex\b|boyfriend|girlfriend|husband|wife/.test(
      n,
    )
  ) {
    return false;
  }
  return /მართვ|პრავ|მოწმობ|გამოცდ|სამსახურ|კარიერ|ფულ|ფინანს|ბიზნეს|ტიკტოკ|გაპოპულარ|რეიჩ|ნახვ|license|exam|job|money|career|driving|tiktok|viral|views?|reach/.test(
    n,
  );
}
