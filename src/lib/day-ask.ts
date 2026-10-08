/**
 * Daily / "what kind of day" + short-horizon outcome detection —
 * shared by routing, prompts, memory, guards.
 * Kept in a tiny module to avoid import cycles with chat-text / hallucination.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[!.,…~?؟]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Daily / "what kind of day" asks — MUST draw (never plain chat).
 * e.g. "როგორი დღე მექნება დღეს?", "how will my day go?", "today's energy"
 */
export function isTodayDayAsk(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (
    /როგორი\s*დღე|რა\s*დღე\s*(მექნ|იქნ|მელოდ)|დღე\s*მექნ|დღეს\s*(რა|როგორ)|დღეს\s*რა\s*მელოდ|დღის\s*(ენერგ|პროგნოზ|განწყობ)|რა\s*მელოდება\s*დღეს|ამ\s*დღის|ღამით\s*რა|საღამოს\s*რა/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    /\bhow will my day\b|\bwhat kind of day\b|\btoday'?s?\s+(day|energy|outlook|vibe|mood)\b|\bdaily\s+(outlook|energy|horoscope|vibe)\b|\bhow'?s?\s+(my\s+)?day\b|\bwhat does (my )?day\b|\btonight'?s?\s+(energy|outlook)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/\bდღეს\b/.test(n) && /მექნ|იქნ|მელოდ|ენერგ|განწყობ|პროგნოზ|outlook|energy|vibe/.test(n)) {
    return true;
  }
  return false;
}

/**
 * Near-term outcome asks (tonight / viral / views / "will X happen soon").
 * Forces a three-card draw with Momentum → Block → Tonight's lean —
 * NEVER Past/Present/Future personal-therapy framing.
 * Day-outlook asks stay on Energy/Challenge/Advice via isTodayDayAsk.
 */
export function isShortHorizonOutcomeAsk(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  // Day outlook keeps its own framing.
  if (isTodayDayAsk(text)) return false;

  const nearTerm =
    /დღეს\s*საღამოს|ამ\s*საღამოს|დღეს\s*(ღამ|საღამ)|ამ\s*ღამ|უახლოეს\s*(დრო|საათ|ღამ)|მალევე|ახლო\s*დროში|\btonight\b|\bthis\s+evening\b|\blater\s+tonight\b|\btoday\s+(evening|night)\b|\bin\s+a\s+few\s+hours\b|\bby\s+(tonight|evening|morning)\b|\bthis\s+afternoon\b/.test(
      n,
    ) ||
    (/საღამოს|ღამით|\bsoon\b|\bმალე\b/.test(n) &&
      /გაპოპულარ|ვირუს|რეიჩ|ნახვ|ვიუ|პოპულარ|ტიკტოკ|ტიკ\s*ტოკ|\btiktok\b|\bviral\b|\breach\b|\bviews?\b|\bpop\b|\bblow\s+up\b/.test(
        n,
      ));

  const socialGrowth =
    /ტიკტოკ|ტიკ\s*ტოკ|ინსტაგრამ|რეილს|რეიჩი|რიჩი|ვიუები|ნახვები|გაპოპულარ|პოპულარ|ვირუს|გავრცელ|ალგორითმ|ფოლოვერ|\btiktok\b|\binstagram\b|\breels?\b|\bviral\b|\bvirality\b|\bviews?\b|\breach\b|\balgorithm\b|\bfollowers?\b|\bgo\s+viral\b|\bblow\s+up\b|\bpost(ed)?\b.{0,40}\b(viral|views?|reach)\b/.test(
      n,
    );

  const outcomeVerb =
    /გაპოპულარულდ|გავრცელდ|მოხდება|იქნება|მექნება|შემოვა|აიწევ|აწევს|გაივლის|წარმატ|შედეგი|გამოვა|\bwill\b.+\b(happen|work|succeed|pop|blow|take\s+off|go\s+viral)\b|\b(go|goes|going)\s+viral\b|\bdoes\s+it\s+(pop|blow|take)\b|\bhappen\s+(tonight|today|soon)\b/.test(
      n,
    );

  // Explicit social + outcome (even without "tonight"): "will my TikTok go viral?"
  if (socialGrowth && (outcomeVerb || /[?؟]/.test(text) || nearTerm)) return true;

  // Near-term + concrete outcome ask: "will X happen tonight / this evening?"
  if (nearTerm && outcomeVerb) return true;

  return false;
}

/**
 * Explicit "draw cards" / "გამიშალე კარტი" with no concrete life topic in the same message.
 */
export function isBareCardDrawAsk(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const n = normalize(raw);
  if (
    /(არ\s*მითქვია|არ\s*მითხოვია|არ\s*მინდოდა|არ\s*მინდა).{0,50}(კარტ|გაშალ)|didn'?t (ask|tell).{0,40}(card|draw)|don'?t draw|no cards/.test(
      n,
    )
  ) {
    return false;
  }
  if (
    !/კარტ|ტარო|გადაშალ|გაშალ|გამიშალ|გადმოვ|წაიკითხ|tarot|cards?|spread|shuffle|гадай|карты/.test(
      n,
    )
  ) {
    return false;
  }
  if (isTodayDayAsk(raw) || isShortHorizonOutcomeAsk(raw)) return false;
  if (
    /სიყვარულ|უყვ|მიყვ|ღალატ|ტრავმ|კარიერ|სამსახურ|ფულ|ფინანს|მართვ|პრავ|მოწმობ|გამოცდ|მომავალ|პირად|ოჯახ|ურთიერთ|ტიკტოკ|გაპოპულარ|love|cheat|job|money|license|exam|future|relationship|trauma|tiktok|viral/.test(
      n,
    )
  ) {
    return false;
  }
  const words = n.split(" ").filter(Boolean);
  if (words.length <= 6) return true;
  return /^(გთხოვ\s*)?(გამიშალე|გადაშალე|გაშალე|გადმოვიშალოთ|draw|shuffle|spread)\b/.test(n);
}
