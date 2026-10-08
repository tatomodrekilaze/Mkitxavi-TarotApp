/**
 * Silent memory helpers for Maria.
 * History is for NOT re-asking — never for dumping old people into a new topic.
 */

import { isBareCardDrawAsk, isTodayDayAsk } from "@/lib/day-ask";

export type MemoryTurn = { role: "user" | "nina" | "assistant"; text: string };

const LATIN_STOP = new Set([
  "maria",
  "the",
  "you",
  "and",
  "for",
  "not",
  "yes",
  "no",
  "ok",
  "okay",
  "hi",
  "hey",
  "hello",
  "what",
  "when",
  "who",
  "why",
  "how",
  "will",
  "this",
  "that",
  "with",
  "from",
  "your",
  "about",
  "love",
  "think",
  "duel",
  "ignore",
  "linux",
  "terminal",
]);

/** Common Georgian function words / question glue — not people. */
const KA_STOP = new Set(
  [
    "რას",
    "რა",
    "როდის",
    "როგორ",
    "რატომ",
    "ვინ",
    "სად",
    "თუ",
    "არა",
    "კი",
    "დიახ",
    "ჩემზე",
    "ჩემი",
    "ჩემს",
    "შენი",
    "შენს",
    "მისი",
    "მას",
    "მე",
    "შენ",
    "გამარჯობა",
    "მარია",
    "სულო",
    "ფიქრობს",
    "ფიქრობ",
    "უყვარს",
    "ვუყვარვარ",
    "ვუყვარ",
    "მიყვარს",
    "გეია",
    "გეი",
    "ენერგია",
    "კარტი",
    "კარტები",
    "ტარო",
    "სიზმარი",
    "მითხარი",
    "მოკლედ",
    "დღეს",
    "დღე",
    "ავიღებ",
    "მართვის",
    "მოწმობას",
    "მოწმობა",
    "პრავას",
    "შუაშია",
    "შუაში",
    "მანქანის",
    "გითხარი",
    "უკვე",
    "წლის",
    "აქ",
    "ან",
    "და",
    "რომ",
    "არ",
    "არის",
    "იქნება",
    "ვცემ",
  ].map((w) => w.toLowerCase()),
);

const PERSON_CTX =
  /ფიქრ|უყვ|გეი|ჩემზე|მიმართ|ვცემ|შევერ|დუელ|ბრძოლ|დავამარცხ|ქირია|boyfriend|girlfriend|love|think|gay|fight|duel|cheat|miss|return/i;

function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

/** Soft stem so ლაშას / ლაშა match — no short prefixes (avoids ნიკო false hits). */
function stemsOf(name: string): string[] {
  const n = normalizeToken(name);
  if (n.length < 3) return [];
  const out = new Set<string>([n]);
  for (const suf of ["სთან", "თან", "ზე", "ში", "სა", "მა", "ს", "მ", "ი"]) {
    if (n.length - suf.length >= 4 && n.endsWith(suf)) {
      out.add(n.slice(0, -suf.length));
    }
  }
  return [...out];
}

function isStop(token: string): boolean {
  const t = normalizeToken(token);
  if (!t || t.length < 3) return true;
  if (LATIN_STOP.has(t)) return true;
  if (KA_STOP.has(t)) return true;
  return false;
}

/** Pull likely person names from a single message. */
export function extractPersonMentions(text: string): string[] {
  const names = new Set<string>();
  const t = text ?? "";

  for (const m of t.matchAll(/\b([A-Z][a-z]{2,24})\b/g)) {
    const n = normalizeToken(m[1]);
    if (!isStop(n)) names.add(n);
  }

  // Name + age: "ლაშა 24", "Aleko 22"
  for (const m of t.matchAll(/([\p{Script=Georgian}A-Za-z]{3,20})\s+(\d{1,2})\b/gu)) {
    const n = normalizeToken(m[1]);
    if (!isStop(n)) names.add(n);
  }

  // Two-token Georgian full name (e.g. ნიკოლოზ ქირია)
  for (const m of t.matchAll(/([\p{Script=Georgian}]{3,15})\s+([\p{Script=Georgian}]{3,15})/gu)) {
    const a = normalizeToken(m[1]);
    const b = normalizeToken(m[2]);
    const bStem = stemsOf(b).sort((x, y) => y.length - x.length)[0] ?? b;
    if (!isStop(a) && PERSON_CTX.test(t)) names.add(a);
    if (!isStop(bStem) && /ია$|აძე$|შვილი$|ქირია/i.test(bStem)) {
      if (!isStop(a)) names.add(a);
      names.add(bStem);
    }
  }

  // Possessive / about-person patterns
  for (const m of t.matchAll(
    /(?:ვუყვარ\w*|უყვარს|ფიქრობს|მიმართ|გეი\u10d0?)\s+([\p{Script=Georgian}]{3,15})|([\p{Script=Georgian}]{3,15})\w*\s+(?:ჩემზე|მიმართ|გეი\u10d0?)/gu,
  )) {
    const n = normalizeToken(m[1] || m[2] || "");
    const stem = stemsOf(n).sort((x, y) => y.length - x.length)[0] ?? n;
    if (!isStop(stem)) names.add(stem);
  }

  // Person-context messages: collect remaining Georgian tokens as candidate names.
  if (PERSON_CTX.test(t)) {
    for (const m of t.matchAll(/[\p{Script=Georgian}]{4,15}/gu)) {
      const n = normalizeToken(m[0]);
      const stem = stemsOf(n).sort((x, y) => y.length - x.length)[0] ?? n;
      if (!isStop(stem) && stem.length >= 4) names.add(stem);
    }
  }

  return [...names];
}

function textHasPerson(text: string, person: string): boolean {
  const lower = text.toLowerCase();
  // Require longer stems so short fragments don't match inside normal words / card names.
  return stemsOf(person).some((s) => {
    if (s.length < 5)
      return (
        lower.includes(s) &&
        (lower === s || new RegExp(`(?:^|[^\\p{L}])${s}(?:$|[^\\p{L}])`, "u").test(lower))
      );
    return new RegExp(`(?:^|[^\\p{L}])${s}`, "u").test(lower);
  });
}

export function isShortMemoryFollowUp(text: string): boolean {
  const raw = text.trim();
  if (!raw) return true;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return true;
  if (/^(კი|არა|დიახ|ოქე|ოკე|მზად|რატომ|ok|okay|yes|no|yeah|why|ready)\b/i.test(raw)) {
    return true;
  }
  return false;
}

/**
 * Keep history useful for continuity, but drop unrelated old people-threads
 * when the seeker clearly changed topic.
 */
export function scopeHistoryForQuestion(
  history: MemoryTurn[] | undefined,
  question: string,
): MemoryTurn[] {
  const h = history ?? [];
  if (h.length === 0) return [];

  const q = question.trim();
  const qPeople = extractPersonMentions(q);
  const followUp = isShortMemoryFollowUp(q);

  // Fresh daily outlook / bare "draw cards" after a day ask:
  // do NOT let sticky people or old relationship threads rewrite the spread.
  if (isTodayDayAsk(q) || isBareCardDrawAsk(q)) {
    if (qPeople.length === 0) {
      // Keep at most the last matching day-ask turn for continuity; drop cast lists.
      const dayTurns = h.filter(
        (t) => t.role === "user" && (isTodayDayAsk(t.text) || isBareCardDrawAsk(t.text)),
      );
      return dayTurns.slice(-2);
    }
  }

  if (followUp) {
    // Short follow-up: keep the current thread only.
    return h.slice(-6);
  }

  // Cast list from earlier USER asks (silent memory). Never feed these into a new topic.
  const sticky = new Set<string>();
  for (const turn of h) {
    if (turn.role !== "user") continue;
    for (const n of extractPersonMentions(turn.text)) {
      for (const s of stemsOf(n)) {
        if (s.length >= 4 && !isStop(s)) sticky.add(s);
      }
    }
  }

  const kept = h.filter((turn) => {
    const hits = [...sticky].filter((s) => textHasPerson(turn.text, s));
    if (hits.length === 0) return true;
    if (qPeople.length === 0) return false;
    return hits.some((s) => qPeople.some((qp) => textHasPerson(qp, s) || stemsOf(qp).includes(s)));
  });

  // Prefer recent non-person context; hard-cap so old drama cannot dominate the prompt.
  return kept.slice(-4);
}

/**
 * People from earlier turns that must NOT appear unless the latest ask (or short follow-up thread) allows them.
 */
export function forbiddenHistoryPeople(
  history: MemoryTurn[] | undefined,
  question: string,
): string[] {
  const h = history ?? [];
  const q = question.trim();
  const allowed = new Set(extractPersonMentions(q).flatMap((n) => stemsOf(n)));

  // Fresh daily / bare-draw asks: never allow prior cast into the reading.
  if (!(isTodayDayAsk(q) || isBareCardDrawAsk(q)) && isShortMemoryFollowUp(q)) {
    // Allow people from the last 2 user messages (current thread).
    for (const turn of h.slice(-4)) {
      if (turn.role !== "user") continue;
      for (const n of extractPersonMentions(turn.text)) {
        for (const s of stemsOf(n)) allowed.add(s);
      }
    }
  }

  // ONLY user asks create the "cast list". Never mine Maria's tarot prose for fake "people".
  const sticky = new Set<string>();
  for (const turn of h) {
    if (turn.role !== "user") continue;
    if (!PERSON_CTX.test(turn.text) && !/\b\d{1,2}\b/.test(turn.text)) continue;
    for (const n of extractPersonMentions(turn.text)) {
      const full = normalizeToken(n);
      const allowedHere = stemsOf(full).some((s) => allowed.has(s)) || allowed.has(full);
      if (full.length >= 5 && !isStop(full) && !allowedHere) sticky.add(full);
    }
  }

  return [...sticky].sort((a, b) => b.length - a.length);
}

/** True if Maria dragged an old person into a new question. */
export function looksLikeHistoryTopicLeak(
  reply: string,
  question: string,
  history: MemoryTurn[] | undefined,
): string[] {
  const forbidden = forbiddenHistoryPeople(history, question);
  if (!forbidden.length || !reply.trim()) return [];
  return forbidden.filter((name) => textHasPerson(reply, name));
}

/** Drop sentences that mention leaked people. */
export function stripLeakedPeople(reply: string, leaked: string[]): string {
  if (!leaked.length) return reply;
  const parts = reply
    .split(/(?<=[.!?…؟])\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = parts.filter((p) => !leaked.some((name) => textHasPerson(p, name)));
  const out = kept.join(" ").replace(/\s+/g, " ").trim();
  return out;
}
