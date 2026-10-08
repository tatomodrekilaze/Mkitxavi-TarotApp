import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Send, ImagePlus, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { canUsePhotoUpload } from "@/lib/photo-access";
import { greetingWords, type Lang, type LocaleCode } from "@/lib/i18n";
import { drawThree, hydrateCards, type TarotCard } from "@/lib/tarot";
import { resolveMoonPhase } from "@/lib/moon";
import {
  findLastConcreteLifeQuestion,
  isBareCardDrawAsk,
  isChatOnly,
  isCoffeeReadingAsk,
  isConversationFollowUp,
  isDivinatoryQuestion,
  isDreamNarrative,
  isHandReadingAsk,
  isCardDrawRefusal,
  isLikelyCardReadingAsk,
  isNonLoveLifeAsk,
  isOffTopicOrJailbreak,
  isShortHorizonOutcomeAsk,
  isTodayDayAsk,
  isUnspecifiedTopicAsk,
  stripAiMarkup,
} from "@/lib/chat-text";
import { ninaReply } from "@/lib/nina-reply";
import {
  deafFallbackReplacement,
  detectHallucination,
  looksLikeDeafFallback,
  looksLikeInventedTarotSpread,
  repairTopicLeak,
} from "@/lib/hallucination";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadCloudChat, saveCloudChat } from "@/lib/chat-persist";
import { TarotCardArt } from "./TarotCardArt";

type BusyKind = "thinking" | "reading" | "coffee" | "hand";
type PhotoService = "coffee" | "hand";

const NINA_AVATAR = "/maria-avatar.jpg";

const CHAT_STORAGE_PREFIX = "mkitxavi.maria-chat.v5.";

type ChatService = "general" | "love" | "coffee" | "hand" | "advice" | "dream";

interface Message {
  id: number;
  role: "user" | "nina";
  text: string;
  streaming?: boolean;
  cards?: TarotCard[];
  imageUrl?: string;
  /** Show the service offer buttons under this Maria message. */
  showOffers?: boolean;
  /** ISO time — stored for ops transcript + history. */
  createdAt?: string;
}

interface ReadingSession {
  originalQuestion: string;
  notes: string[];
  awaitingClarify: boolean;
}

interface Props {
  onOpenPaywall: () => void;
  onOpenServices: () => void;
}

let idCounter = 1;

/** Short busy hold - real latency comes from the model, don't pad heavily. */
function replyHoldMs(question: string, kind: BusyKind): number {
  const len = question.trim().length;
  let min = 900;
  let max = 1600;
  if (kind === "reading" || kind === "coffee" || kind === "hand") {
    min = 1400;
    max = 2200;
  } else if (len > 80) {
    min = 1100;
    max = 1800;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function waitReplyHold(startedAt: number, question: string, kind: BusyKind) {
  const remaining = Math.max(0, replyHoldMs(question, kind) - (Date.now() - startedAt));
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

async function clientContext(lang: Lang) {
  try {
    const moon = await resolveMoonPhase();
    return {
      timeZone: moon.timeZone,
      country: moon.country,
      city: moon.city,
      localTime: moon.localTime,
      localDate: moon.localDate,
      moonName: moon.names[lang],
      moonIllumination: moon.illumination,
    };
  } catch {
    return undefined;
  }
}

function cardsPayload(cards: TarotCard[], lang: Lang) {
  return cards.map((c) => ({
    key: c.key,
    name: c.names[lang],
    glyph: c.glyph,
    suit: c.suit,
    keywords: c.keywords[lang],
    meaning: c.meanings[lang],
  }));
}

function composeQuestion(session: ReadingSession | null, latest: string): string {
  if (!session) return latest;
  const parts = [session.originalQuestion, ...session.notes.map((n, i) => `Detail ${i + 1}: ${n}`)];
  if (!session.notes.includes(latest) && latest !== session.originalQuestion) {
    parts.push(`Detail ${session.notes.length + 1}: ${latest}`);
  }
  return parts.join("\n");
}

function historyPayload(messages: Message[]) {
  return (
    messages
      .filter((m) => m.text.trim() && !m.streaming)
      // Keep enough for silent continuity; server scopes to the current ask.
      .slice(-20)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 1200) }))
  );
}

function parseService(value: string | null | undefined): ChatService | null {
  if (
    value === "general" ||
    value === "love" ||
    value === "coffee" ||
    value === "hand" ||
    value === "advice" ||
    value === "dream"
  ) {
    return value;
  }
  return null;
}

function serviceLabel(service: ChatService, t: (k: string) => string): string {
  if (service === "general") return t("chatSvcGeneral");
  if (service === "love") return t("chatSvcLove");
  if (service === "coffee") return t("chatSvcCoffee");
  if (service === "hand") return t("chatSvcHand");
  if (service === "dream") return t("chatSvcDream");
  return t("chatSvcAdvice");
}

type StoredChat = {
  messages: Message[];
  service?: ChatService | null;
};

function loadStoredChat(userKey: string): StoredChat | null {
  if (typeof window === "undefined") return null;
  const keys = [
    CHAT_STORAGE_PREFIX + userKey,
    `mkitxavi.maria-chat.v4.${userKey}`,
    `mkitxavi.nina-chat.v3.${userKey}`,
  ];
  try {
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Message[] | StoredChat;
      const messages = Array.isArray(parsed) ? parsed : parsed.messages;
      const service = Array.isArray(parsed) ? null : parseService(parsed.service);
      if (!Array.isArray(messages) || messages.length === 0) continue;
      idCounter = Math.max(idCounter, ...messages.map((m) => m.id)) + 1;
      const bundle: StoredChat = {
        messages: messages.map((m) => ({ ...m, streaming: false })),
        service,
      };
      // Migrate legacy keys forward.
      if (key !== CHAT_STORAGE_PREFIX + userKey) {
        persistChat(userKey, bundle.messages, service);
      }
      return bundle;
    }
    return null;
  } catch {
    return null;
  }
}

function msgStamp(): string {
  return new Date().toISOString();
}

function slimMessages(messages: Message[]) {
  return messages
    .filter((m) => !m.streaming)
    .slice(-200)
    .map(({ id, role, text, cards, imageUrl, showOffers, createdAt }) => ({
      id,
      role,
      text,
      cards,
      imageUrl,
      showOffers,
      createdAt: createdAt || msgStamp(),
    }));
}

function persistChat(userKey: string, messages: Message[], service: ChatService | null) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredChat = { messages: slimMessages(messages), service };
    window.localStorage.setItem(CHAT_STORAGE_PREFIX + userKey, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function withSeekerName(template: string, name: string | undefined, lang: LocaleCode) {
  const seeker = name?.trim() || (lang === "ka" ? "სულო" : lang === "ru" ? "друг" : "friend");
  return template.replaceAll("{name}", seeker);
}

export function Chat({ onOpenPaywall, onOpenServices }: Props) {
  const {
    t,
    lang,
    energy,
    energyUnlimited,
    accountBanned,
    accountRestricted,
    opsFlags,
    sub,
    subPlan,
    isComp,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    refreshWallet,
    applyEnergy,
    email,
    user,
    authenticated,
  } = useApp();
  const hasEnergy = energyUnlimited || energy > 0;
  const L = (lang ?? "ka") as Lang;
  const storageKey = email || "guest";
  const hasPhotoSub = canUsePhotoUpload({
    energyUnlimited,
    plan: subPlan,
    status: sub,
    isComp,
    periodEnd: currentPeriodEnd,
    cancelAtPeriodEnd,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [locked, setLocked] = useState(false);
  const [busyKind, setBusyKind] = useState<BusyKind | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ReadingSession | null>(null);
  const awaitingPhotoRef = useRef<PhotoService | null>(null);
  const hadReadingRef = useRef(false);
  /** Last drawn three cards — used to continue a spread without inventing new cards. */
  const lastCardsRef = useRef<TarotCard[] | null>(null);
  /** Original question of the last full draw — for composing follow-up draws. */
  const lastReadingQuestionRef = useRef<string | null>(null);
  const chatServiceRef = useRef<ChatService | null>(null);
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const hiddenAtRef = useRef<number | null>(null);
  const refusalRef = useRef<
    | "energy"
    | "subscription"
    | "maintenance"
    | "chat_off"
    | "coffee_off"
    | "banned"
    | "restricted"
    | "invalid_image"
    | "rate_limited"
    | null
  >(null);

  const offerGreetingText = (continuing: boolean) => {
    if (continuing) {
      return L === "ka"
        ? "აქ ვარ. თუ სხვა გზით გინდა გავაგრძელოთ, ქვემოთ აირჩიე."
        : "I'm here. If you want a different path, pick one below.";
    }
    return `${withSeekerName(t("ninaGreeting"), user.name, L)}\n\n${t("ninaOfferPrompt")}`;
  };

  /** Keep history, but always surface the path picker (reload / return). */
  const withFreshOffers = (msgs: Message[]): Message[] => {
    const cleaned = msgs.map((m) => (m.showOffers ? { ...m, showOffers: false } : m));
    const hasHistory = cleaned.some((m) => m.role === "user" || (m.cards?.length ?? 0) > 0);
    const text = offerGreetingText(hasHistory);
    const last = cleaned[cleaned.length - 1];
    if (last?.role === "nina" && last.text === text && !last.cards?.length) {
      return [...cleaned.slice(0, -1), { ...last, showOffers: true, streaming: false }];
    }
    return [
      ...cleaned,
      {
        id: idCounter++,
        role: "nina",
        text,
        showOffers: true,
        createdAt: msgStamp(),
      },
    ];
  };

  useEffect(() => {
    messagesRef.current = messages;
    if (!messages.length) return;
    persistChat(storageKey, messages, chatServiceRef.current);
    if (!authenticated) return;
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(() => {
      void saveCloudChat({
        messages: slimMessages(messages),
        service: chatServiceRef.current,
      });
    }, 700);
    return () => {
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    };
  }, [messages, storageKey, authenticated]);

  useEffect(() => {
    if (!busyKind) {
      setElapsedSec(0);
      return;
    }
    const started = Date.now();
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 200);
    return () => window.clearInterval(id);
  }, [busyKind]);

  const releaseBusy = () => {
    setBusyKind(null);
    setLocked(false);
  };

  /**
   * The server, not the client, decides whether a reply was paid for. When it
   * refuses, drop the fallback text and show the seeker what to do instead.
   */
  const handledRefusal = (): boolean => {
    const refusal = refusalRef.current;
    if (!refusal) return false;
    refusalRef.current = null;
    releaseBusy();
    if (refusal === "energy") {
      streamNina(t("outOfEnergy"));
      onOpenPaywall();
    } else if (refusal === "subscription") {
      onOpenPaywall();
    } else if (refusal === "maintenance") {
      streamNina("Maintenance mode is on. Readings are paused.");
    } else if (refusal === "chat_off") {
      streamNina("AI chat is temporarily offline.");
    } else if (refusal === "coffee_off") {
      streamNina("Photo readings are temporarily unavailable.");
    } else if (refusal === "banned") {
      streamNina("This account is suspended.");
    } else if (refusal === "restricted") {
      streamNina("Chat is temporarily restricted on this account.");
    } else if (refusal === "invalid_image") {
      streamNina(
        L === "en"
          ? "That photo format is not supported. Use a JPEG, PNG, or WebP."
          : "ფოტოს ფორმატი არ არის მხარდაჭერილი. გამოიყენე JPEG, PNG ან WebP.",
      );
    } else if (refusal === "rate_limited") {
      streamNina(
        L === "en"
          ? "Slow down a little. Try again in a few seconds."
          : "ცოტა ნელა. რამდენიმე წამში სცადე თავიდან.",
      );
    }
    return true;
  };

  const busyLabel =
    busyKind === "reading"
      ? t("shuffleListening")
      : busyKind === "coffee"
        ? t("coffeeReadingStatus")
        : busyKind === "hand"
          ? t("handReadingStatus")
          : busyKind === "thinking"
            ? t("thinkingStatus")
            : null;

  const applyChatBundle = (bundle: StoredChat, opts?: { freshOffers?: boolean }) => {
    const hydrated = bundle.messages.map((m) => ({
      ...m,
      cards: hydrateCards(m.cards) ?? m.cards,
    }));
    idCounter = Math.max(idCounter, ...hydrated.map((m) => m.id), idCounter) + 1;
    const messages = opts?.freshOffers === false ? hydrated : withFreshOffers(hydrated);
    setMessages(messages);
    hadReadingRef.current = messages.some((m) => (m.cards?.length ?? 0) > 0);
    const withCards = [...messages].reverse().find((m) => (m.cards?.length ?? 0) > 0);
    if (withCards?.cards?.length) lastCardsRef.current = withCards.cards;
    // Fresh visit → let them pick a path again.
    chatServiceRef.current = null;
    awaitingPhotoRef.current = null;
    sessionRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const bootLen = loadStoredChat(storageKey)?.messages.length ?? 0;
    const local = loadStoredChat(storageKey);

    const bootLocal = () => {
      if (local?.messages.length) {
        applyChatBundle(local, { freshOffers: true });
        return;
      }
      setMessages([
        {
          id: idCounter++,
          role: "nina",
          text: offerGreetingText(false),
          showOffers: true,
          createdAt: msgStamp(),
        },
      ]);
      hadReadingRef.current = false;
      lastCardsRef.current = null;
      lastReadingQuestionRef.current = null;
      chatServiceRef.current = null;
      awaitingPhotoRef.current = null;
      sessionRef.current = null;
    };

    bootLocal();

    if (!authenticated) return;

    void loadCloudChat().then((cloud) => {
      if (cancelled || !cloud?.messages.length) return;
      // User already typed while cloud was loading — don't wipe their messages.
      if (messagesRef.current.length > bootLen) return;
      const cloudMsgs = cloud.messages.map((m) => ({
        ...m,
        role: m.role === "user" ? ("user" as const) : ("nina" as const),
        streaming: false,
      }));
      const localLen = local?.messages.length ?? 0;
      // Prefer the longer transcript so neither side silently wipes memory.
      if (cloudMsgs.length >= localLen) {
        applyChatBundle(
          {
            messages: cloudMsgs as Message[],
            service: parseService(cloud.service),
          },
          { freshOffers: true },
        );
      } else if (local?.messages.length) {
        void saveCloudChat({
          messages: slimMessages(messagesRef.current),
          service: null,
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // Do not depend on `lang` — language changes rewrite the offer text elsewhere
    // and must not reboot chat / clear coffee-hand waits.
  }, [storageKey, authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh offer greeting text once the profile name loads.
  useEffect(() => {
    const n = user.name?.trim();
    if (!n) return;
    setMessages((m) => {
      const last = m[m.length - 1];
      if (!last || last.role !== "nina" || !last.showOffers) return m;
      const next = offerGreetingText(false);
      if (last.text === next) return m;
      return [...m.slice(0, -1), { ...last, text: next }];
    });
  }, [user.name, lang, L, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leave & come back after a while → show the path picker again.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;
      // ~10 minutes away counts as a fresh return.
      if (Date.now() - hiddenAt < 10 * 60 * 1000) return;
      setMessages((m) => {
        if (!m.length) return m;
        const last = m[m.length - 1];
        if (last.showOffers) return m;
        return withFreshOffers(m);
      });
      chatServiceRef.current = null;
      awaitingPhotoRef.current = null;
      sessionRef.current = null;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busyKind]);

  const streamNina = (fullText: string, cards?: TarotCard[]) => {
    const clean = stripAiMarkup(fullText);
    const id = idCounter++;
    setMessages((m) => [
      ...m,
      { id, role: "nina", text: "", streaming: true, cards, createdAt: msgStamp() },
    ]);
    const parts = clean.split(/(\s+)/).filter((p) => p.length > 0);
    let i = 0;
    const tick = () => {
      i++;
      setMessages((m) =>
        m.map((msg) => (msg.id === id ? { ...msg, text: parts.slice(0, i).join("") } : msg)),
      );
      if (i >= parts.length) {
        setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
        return;
      }
      const just = (parts[i - 1] ?? "").trim();
      // Snappy typing with light pauses on punctuation.
      let delay = 55 + Math.floor(Math.random() * 45);
      if (/[.?!:…]$/.test(just)) delay += 140 + Math.floor(Math.random() * 120);
      else if (/[,;]$/.test(just)) delay += 50 + Math.floor(Math.random() * 60);
      window.setTimeout(tick, delay);
    };
    window.setTimeout(tick, 120 + Math.floor(Math.random() * 120));
  };

  const pickService = (service: ChatService) => {
    if (locked) return;
    const label = serviceLabel(service, t);

    setMessages((m) => [
      ...m.map((msg) => (msg.showOffers ? { ...msg, showOffers: false } : msg)),
      { id: idCounter++, role: "user", text: label, createdAt: msgStamp() },
    ]);

    chatServiceRef.current = service;
    sessionRef.current = null;
    persistChat(storageKey, messagesRef.current, service);

    if (service === "coffee" || service === "hand") {
      if (!opsFlags.coffeeReadingEnabled) {
        awaitingPhotoRef.current = null;
        streamNina("Photo readings are temporarily unavailable.");
        return;
      }
      if (!hasPhotoSub) {
        awaitingPhotoRef.current = null;
        onOpenPaywall();
        return;
      }
      awaitingPhotoRef.current = service;
      streamNina(
        withSeekerName(
          service === "hand" ? t("chatSvcHandAskPhoto") : t("chatSvcCoffeeAskPhoto"),
          user.name,
          L,
        ),
      );
      return;
    }

    awaitingPhotoRef.current = null;
    if (service === "general") streamNina(withSeekerName(t("chatSvcAskGeneral"), user.name, L));
    else if (service === "love") streamNina(withSeekerName(t("chatSvcAskLove"), user.name, L));
    else if (service === "dream") streamNina(withSeekerName(t("chatSvcAskDream"), user.name, L));
    else streamNina(withSeekerName(t("chatSvcAskAdvice"), user.name, L));
  };

  const askNina = async (
    mode: "chat" | "reading" | "intent" | "clarify" | "coffee" | "hand" | "dream",
    question: string,
    opts?: {
      cards?: TarotCard[];
      session?: ReadingSession | null;
      history?: Message[];
      imageBase64?: string;
      imageMime?: "image/jpeg" | "image/jpg" | "image/png" | "image/webp" | "image/gif";
    },
  ) => {
    try {
      if (!isSupabaseConfigured) return null;
      const {
        data: { session },
      } = await getSupabaseBrowserClient().auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        console.warn("ninaReply skipped: no access token");
        return null;
      }

      const client =
        mode === "reading" || mode === "coffee" || mode === "hand"
          ? await clientContext(L)
          : undefined;
      const hist = historyPayload(opts?.history ?? messagesRef.current);
      const result = await ninaReply({
        data: {
          mode,
          lang: L === "en" ? "en" : "ka",
          question,
          accessToken,
          cards: opts?.cards ? cardsPayload(opts.cards, L) : undefined,
          history: hist,
          imageBase64: opts?.imageBase64,
          imageMime: opts?.imageMime,
          client,
          session: opts?.session
            ? {
                originalQuestion: opts.session.originalQuestion,
                notes: opts.session.notes,
                phase: opts.session.awaitingClarify ? "awaiting_clarify" : "open",
              }
            : undefined,
        },
      });
      if (result.ok) {
        if (typeof result.energy === "number") applyEnergy(result.energy);
        return result;
      }
      const failure = "error" in result ? result.error : "unknown";
      if (failure === "needs_reading") return { ok: false as const, error: "needs_reading" };
      if (failure === "invented_spread") return { ok: false as const, error: "invented_spread" };
      if (failure === "insufficient_energy") refusalRef.current = "energy";
      else if (failure === "subscription_required") refusalRef.current = "subscription";
      else if (failure === "maintenance") refusalRef.current = "maintenance";
      else if (failure === "chat_disabled") refusalRef.current = "chat_off";
      else if (failure === "coffee_disabled") refusalRef.current = "coffee_off";
      else if (failure === "account_banned") refusalRef.current = "banned";
      else if (failure === "account_restricted") refusalRef.current = "restricted";
      else if (failure === "invalid_image") refusalRef.current = "invalid_image";
      else if (failure === "rate_limited") refusalRef.current = "rate_limited";
      console.warn("ninaReply not ok", failure);
    } catch (err) {
      console.warn("ninaReply failed", err);
    }
    return null;
  };

  const performReading = async (fullQuestion: string) => {
    setBusyKind("reading");
    const startedAt = Date.now();
    sessionRef.current = null;
    const cards = drawThree();
    try {
      const reply = await askNina("reading", fullQuestion, { cards });
      if (handledRefusal()) return;
      const aiText = reply && "text" in reply ? reply.text : null;
      // Never ship a free local reading after AI failure/refund — that bypasses the paywall.
      if (!aiText || /Only answering what you just asked/i.test(aiText)) {
        await waitReplyHold(startedAt, fullQuestion, "reading");
        setBusyKind(null);
        streamNina(
          L === "en"
            ? "The cards are restless right now. Try again in a moment. I will not invent a free reading."
            : "კარტები ახლა ვერ გაიშალა სრულად. ცოტა ხანში სცადე თავიდან. უფასო გამოგონილ მკითხაობას არ გავაკეთებ.",
        );
        return;
      }
      await waitReplyHold(startedAt, fullQuestion, "reading");
      setBusyKind(null);
      hadReadingRef.current = true;
      lastCardsRef.current = cards;
      lastReadingQuestionRef.current = fullQuestion;
      streamNina(aiText, cards);
    } catch {
      await waitReplyHold(startedAt, fullQuestion, "reading");
      setBusyKind(null);
      streamNina(
        L === "en"
          ? "Something interrupted the reading. Try again. Energy was not kept for a failed draw."
          : "მკითხაობა შეწყდა. თავიდან სცადე. წარუმატებელ გაშლაზე ენერგია არ ჩაგეჭრება.",
      );
    }
  };

  /** Keep the same three cards — tarot method, never plain therapy chat. */
  const continueOnCards = async (text: string) => {
    const cards = lastCardsRef.current;
    if (!cards?.length) {
      await performReading(text);
      return;
    }
    const prior = lastReadingQuestionRef.current?.trim();
    const composed = prior
      ? `[Continue the same spread on the table]\nPrior question: ${prior}\nSeeker now says: ${text}`
      : `[Continue the same spread on the table]\nSeeker now says: ${text}`;
    setBusyKind("thinking");
    const startedAt = Date.now();
    const reply = await askNina("chat", composed, { cards });
    if (reply && "error" in reply && reply.error === "needs_reading") {
      await performReading(prior ? `${prior}\nFollow-up: ${text}` : text);
      return;
    }
    if (handledRefusal()) return;
    const body =
      (reply && "text" in reply ? reply.text : null) ??
      (L === "en"
        ? "The same three cards still speak. Tell me the one detail that shifted."
        : "იგივე სამი კარტი ჯერ კიდევ მეტყველებს. მითხარი ერთი დეტალი, რაც შეიცვალა.");
    if (
      looksLikeInventedTarotSpread(body) &&
      !cards.some((c) => body.includes(c.names.ka) || body.includes(c.names.en))
    ) {
      // Invented cards outside the spread → redraw for honesty
      await performReading(prior ? `${prior}\nFollow-up: ${text}` : text);
      return;
    }
    await waitReplyHold(startedAt, text, "thinking");
    setBusyKind(null);
    streamNina(body, cards);
  };

  const runChat = async (text: string, mode: "chat" | "dream" = "chat") => {
    setBusyKind("thinking");
    const startedAt = Date.now();
    const continueCards =
      mode === "chat" && hadReadingRef.current && lastCardsRef.current?.length
        ? lastCardsRef.current
        : undefined;
    const reply = await askNina(mode, text, continueCards ? { cards: continueCards } : undefined);
    if (reply && "error" in reply && reply.error === "needs_reading") {
      if (isLikelyCardReadingAsk(text)) {
        await performReading(text);
        return;
      }
    }
    if (handledRefusal()) return;
    let body =
      (reply && "text" in reply ? reply.text : null) ??
      (mode === "dream" ? t("dreamFallback") : t("chatFallback"));

    if (reply && "error" in reply && reply.error === "needs_reading") {
      body =
        L === "en"
          ? "Tell me the exact question on your mind, and I will draw for that."
          : "მითხარი ზუსტად რა გაწუხებს, და იმაზე გავშლი კარტებს.";
    } else if (reply && "error" in reply && reply.error === "invented_spread") {
      body =
        L === "en"
          ? "Ask your real question clearly, and I will draw cards for that. I will not invent a spread in chat."
          : "მკაფიოდ მითხარი შენი კითხვა და იმაზე გავშლი კარტებს. ჩატში ჰაერიდან სპრედს არ გამოვიგონებ.";
    }

    // Never promote a broken English stub into a new card draw.
    const isBrokenStub = /Only answering what you just asked/i.test(body);

    const hit = detectHallucination({
      mode,
      text: body,
      question: text,
      history: historyPayload(messagesRef.current),
    });
    if (
      !isBrokenStub &&
      (hit === "fake_spread" || looksLikeInventedTarotSpread(body)) &&
      isLikelyCardReadingAsk(text)
    ) {
      await performReading(text);
      return;
    }
    if (
      !isBrokenStub &&
      (hit === "fake_spread" || looksLikeInventedTarotSpread(body)) &&
      !isLikelyCardReadingAsk(text)
    ) {
      body =
        L === "en"
          ? "Tell me the exact question on your mind, and we will go from there."
          : "მითხარი ზუსტად რა გაწუხებს ახლა, და იქიდან გავაგრძელებთ.";
    } else if (hit === "deaf" || looksLikeDeafFallback(body) || isBrokenStub) {
      body = deafFallbackReplacement(L === "en" ? "en" : "ka");
    } else if (hit === "topic_leak") {
      body = repairTopicLeak({
        text: body,
        question: text,
        history: historyPayload(messagesRef.current),
        lang: L === "en" ? "en" : "ka",
      });
    } else if (hit === "fake_photo" || hit === "ungrounded_life") {
      body =
        L === "en"
          ? "I stay with what you actually shared. Tell me the one detail that matters most."
          : "მხოლოდ იმას ვეყრდნობი, რაც ნამდვილად გითქვამს. მითხარი ერთი ყველაზე მნიშვნელოვანი დეტალი.";
    }

    await waitReplyHold(startedAt, text, "thinking");
    setBusyKind(null);
    streamNina(body);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || locked) return;

    if (accountBanned) {
      streamNina("This account is suspended.");
      return;
    }
    if (accountRestricted) {
      streamNina("Chat is temporarily restricted on this account.");
      return;
    }
    if (opsFlags.maintenanceMode) {
      streamNina("Maintenance mode is on. Readings are paused.");
      return;
    }
    if (!opsFlags.chatEnabled) {
      streamNina("AI chat is temporarily offline.");
      return;
    }

    if (!hasEnergy) {
      onOpenPaywall();
      return;
    }

    setLocked(true);
    setBusyKind("thinking");

    setMessages((m) => [
      ...m.map((msg) => (msg.showOffers ? { ...msg, showOffers: false } : msg)),
      { id: idCounter++, role: "user", text, createdAt: msgStamp() },
    ]);
    setInput("");

    const greetings = greetingWords(L);
    const inClarify = Boolean(sessionRef.current?.awaitingClarify);

    // Photo services → need a paid plan before upload
    const photoAsk: PhotoService | null = isCoffeeReadingAsk(text)
      ? "coffee"
      : isHandReadingAsk(text)
        ? "hand"
        : null;
    if (photoAsk) {
      sessionRef.current = null;
      chatServiceRef.current = photoAsk;
      if (!opsFlags.coffeeReadingEnabled) {
        awaitingPhotoRef.current = null;
        setBusyKind(null);
        streamNina("Photo readings are temporarily unavailable.");
        setLocked(false);
        return;
      }
      if (!hasPhotoSub) {
        awaitingPhotoRef.current = null;
        setBusyKind(null);
        setLocked(false);
        onOpenPaywall();
        return;
      }
      // Local ask-photo only — never bill chat energy just to request an upload.
      awaitingPhotoRef.current = photoAsk;
      setBusyKind(null);
      streamNina(
        withSeekerName(
          photoAsk === "hand" ? t("chatSvcHandAskPhoto") : t("chatSvcCoffeeAskPhoto"),
          user.name,
          L,
        ),
      );
      setLocked(false);
      return;
    }

    let activeService = chatServiceRef.current;

    // Photo lanes: life/future typed instead of upload → switch to cards.
    // Short other replies while awaiting photo → re-ask (never invent a spread).
    if (activeService === "hand" || activeService === "coffee") {
      const wantsCards =
        isLikelyCardReadingAsk(text) ||
        /მომავალ|რა\s*მოხდ|პირად|სიყვარულ|ზოგადად|future|love|will |should /i.test(text);
      if (wantsCards) {
        activeService = /სიყვარულ|უყვ|მიყვ|love/i.test(text) ? "love" : "general";
        chatServiceRef.current = activeService;
        awaitingPhotoRef.current = null;
        sessionRef.current = null;
      } else if (awaitingPhotoRef.current) {
        setBusyKind(null);
        streamNina(
          withSeekerName(
            activeService === "hand" ? t("chatSvcHandAskPhoto") : t("chatSvcCoffeeAskPhoto"),
            user.name,
            L,
          ),
        );
        setLocked(false);
        return;
      }
    }

    // Dream lane: only stay dream-chat while they are actually telling a dream.
    if (activeService === "dream") {
      const wantsCards = isLikelyCardReadingAsk(text) || isDivinatoryQuestion(text);
      const stayDream =
        !wantsCards &&
        (isDreamNarrative(text) ||
          isChatOnly(text, greetings) ||
          (hadReadingRef.current && isConversationFollowUp(text)));
      if (stayDream) {
        if (hadReadingRef.current && isConversationFollowUp(text) && lastCardsRef.current?.length) {
          await continueOnCards(text);
        } else {
          await runChat(text, isDreamNarrative(text) ? "dream" : "chat");
        }
        setLocked(false);
        return;
      }
      activeService = /სიყვარულ|უყვ|მიყვ|love/i.test(text) ? "love" : "general";
      chatServiceRef.current = activeService;
      sessionRef.current = null;
    }

    // Advice lane: greetings only stay chat; personal → cards / continue spread.
    if (activeService === "advice") {
      if (isChatOnly(text, greetings)) {
        await runChat(text);
        setLocked(false);
        return;
      }
      if (hadReadingRef.current && isConversationFollowUp(text) && lastCardsRef.current?.length) {
        await continueOnCards(text);
        setLocked(false);
        return;
      }
      activeService = /სიყვარულ|უყვ|მიყვ|love/i.test(text) ? "love" : "general";
      chatServiceRef.current = activeService;
      sessionRef.current = null;
    }

    // Vague "something else" / "I didn't ask for cards" → ask what they want. Never auto-draw.
    if (isUnspecifiedTopicAsk(text) || isCardDrawRefusal(text)) {
      sessionRef.current = null;
      await runChat(text);
      setLocked(false);
      return;
    }

    // Bare "გამიშალე კარტი" / "draw cards" → reuse the last concrete life/day ask.
    // Without this, a today-question answered in chat, then "draw cards", becomes a vague PPF spread.
    let readingFocus = text;
    if (isBareCardDrawAsk(text)) {
      const prior = findLastConcreteLifeQuestion(historyPayload(messagesRef.current));
      if (prior) readingFocus = prior;
    }

    // Concrete life / timing / today-day / divinatory follow-up → draw.
    const demandsAnswer =
      isLikelyCardReadingAsk(text) ||
      isTodayDayAsk(text) ||
      isShortHorizonOutcomeAsk(text) ||
      isDivinatoryQuestion(text) ||
      (isBareCardDrawAsk(text) && isLikelyCardReadingAsk(readingFocus));

    // After a spread: soft ack/shorter → continue SAME cards (tarot method, not therapy).
    if (
      !inClarify &&
      !demandsAnswer &&
      hadReadingRef.current &&
      isConversationFollowUp(text) &&
      lastCardsRef.current?.length
    ) {
      sessionRef.current = null;
      await continueOnCards(text);
      setLocked(false);
      return;
    }

    // Greetings / jailbreaks / meta → tarot-voiced chat (still Maria the reader).
    if (
      !inClarify &&
      !demandsAnswer &&
      (isChatOnly(text, greetings) || isOffTopicOrJailbreak(text))
    ) {
      sessionRef.current = null;
      await runChat(text);
      setLocked(false);
      return;
    }

    // After a spread: new yes/no or question → FRESH draw with prior context.
    if (!inClarify && hadReadingRef.current && demandsAnswer) {
      sessionRef.current = null;
      const prior = lastReadingQuestionRef.current?.trim();
      const focus = prior ? `${prior}\nFollow-up question: ${readingFocus}` : readingFocus;
      const loveLike =
        !isNonLoveLifeAsk(focus) &&
        !isTodayDayAsk(focus) &&
        !isShortHorizonOutcomeAsk(focus) &&
        (activeService === "love" ||
          /სიყვარულ|უყვ|მიყვ|ღალატ|ყოფილ|love|cheat|ex\b|ქმარ|ცოლ|husband|wife/i.test(focus));
      const tag = loveLike ? "Love reading" : "General reading";
      chatServiceRef.current = loveLike ? "love" : "general";
      await performReading(`[${tag}]\n${focus}`);
      setLocked(false);
      return;
    }

    // After a spread: new detail/statement (not a soft ack) → continue SAME three cards.
    if (
      !inClarify &&
      !demandsAnswer &&
      hadReadingRef.current &&
      lastCardsRef.current?.length &&
      !isChatOnly(text, greetings)
    ) {
      sessionRef.current = null;
      await continueOnCards(text);
      setLocked(false);
      return;
    }

    // Clarify path: they answered a follow-up with enough detail → draw.
    if (inClarify && sessionRef.current) {
      const clarified = {
        ...sessionRef.current,
        notes: [...sessionRef.current.notes, text],
        awaitingClarify: false,
      };
      sessionRef.current = clarified;
      const tag =
        activeService === "love" && !isNonLoveLifeAsk(readingFocus)
          ? "Love reading"
          : "General reading";
      await performReading(`[${tag}]\n${composeQuestion(clarified, readingFocus)}`);
      setLocked(false);
      return;
    }

    // ONLY draw when the ask is concrete. Never invent a reading for vibes / half-asks.
    if (
      !demandsAnswer &&
      !isLikelyCardReadingAsk(text) &&
      !isTodayDayAsk(text) &&
      !isShortHorizonOutcomeAsk(text)
    ) {
      sessionRef.current = null;
      await runChat(text);
      setLocked(false);
      return;
    }

    const session = sessionRef.current;
    // Picked "love" but asked about license/job/money/day → general, not a fake love spread.
    const loveLike =
      !isNonLoveLifeAsk(readingFocus) &&
      !isTodayDayAsk(readingFocus) &&
      !isShortHorizonOutcomeAsk(readingFocus) &&
      (activeService === "love" ||
        /სიყვარულ|უყვ|მიყვ|ღალატ|ყოფილ|love|cheat|ex\b/i.test(readingFocus));
    const readingService: "love" | "general" = loveLike ? "love" : "general";
    chatServiceRef.current = readingService;
    const tag = readingService === "love" ? "Love reading" : "General reading";
    await performReading(`[${tag}]\n${composeQuestion(session, readingFocus)}`);
    setLocked(false);
  };

  const onPickImage = async (file: File | null) => {
    if (!file || locked) return;
    const photoKind = awaitingPhotoRef.current ?? "coffee";
    const fresh = await refreshWallet();
    if (!(fresh.canPhoto || hasPhotoSub)) {
      onOpenPaywall();
      return;
    }
    awaitingPhotoRef.current = photoKind;

    if (accountBanned) {
      streamNina("This account is suspended.");
      return;
    }
    if (accountRestricted) {
      streamNina("Chat is temporarily restricted on this account.");
      return;
    }
    if (opsFlags.maintenanceMode) {
      streamNina("Maintenance mode is on. Readings are paused.");
      return;
    }
    if (!opsFlags.coffeeReadingEnabled) {
      streamNina("Photo readings are temporarily unavailable.");
      return;
    }

    if (!hasEnergy) {
      onOpenPaywall();
      return;
    }

    setLocked(true);
    setBusyKind(photoKind);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) {
      releaseBusy();
      return;
    }

    const comma = dataUrl.indexOf(",");
    const meta = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    let mime = (/data:([^;]+)/.exec(meta)?.[1] || file.type || "image/jpeg").toLowerCase();
    if (mime === "image/jpg") mime = "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) {
      releaseBusy();
      streamNina(
        L === "en"
          ? "That photo format is not supported. Use a JPEG, PNG, or WebP."
          : "ფოტოს ფორმატი არ არის მხარდაჭერილი. გამოიყენე JPEG, PNG ან WebP.",
      );
      return;
    }

    const isHand = photoKind === "hand";
    setMessages((m) => [
      ...m,
      {
        id: idCounter++,
        role: "user",
        text: isHand
          ? L === "ka"
            ? "აი ხელის ფოტო"
            : "Here's my palm photo"
          : L === "ka"
            ? "აი ფინჯნის ფოტო"
            : "Here's the cup photo",
        imageUrl: dataUrl,
        createdAt: msgStamp(),
      },
    ]);

    const photoQ = isHand
      ? L === "ka"
        ? "წაიკითხე ეს ხელი"
        : "Read this palm"
      : L === "ka"
        ? "წაიკითხე ეს ყავის ნალექი"
        : "Read these coffee grounds";
    const startedAt = Date.now();
    const reply = await askNina(photoKind, photoQ, {
      imageBase64: base64,
      imageMime: mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
    });
    const photoRefusal = refusalRef.current;
    if (handledRefusal()) {
      // Hard refusals clear the lane; soft AI failures keep waiting for a new photo.
      if (
        photoRefusal === "banned" ||
        photoRefusal === "restricted" ||
        photoRefusal === "subscription" ||
        photoRefusal === "coffee_off" ||
        photoRefusal === "maintenance" ||
        photoRefusal === "energy"
      ) {
        awaitingPhotoRef.current = null;
      }
      return;
    }
    await waitReplyHold(startedAt, photoQ, photoKind);
    setBusyKind(null);
    const body = reply && "text" in reply ? reply.text : null;
    if (!body) {
      // AI failed after charge was refunded server-side — keep waiting for a new photo.
      streamNina(
        withSeekerName(
          isHand ? t("chatSvcHandAskPhoto") : t("chatSvcCoffeeAskPhoto"),
          user.name,
          L,
        ),
      );
      setLocked(false);
      return;
    }
    awaitingPhotoRef.current = null;
    streamNina(body);
    setLocked(false);
  };

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col px-2 sm:px-3">
      <div className="glass mt-2 flex shrink-0 items-center gap-3 rounded-[18px] px-3 py-2.5 sm:mt-3 sm:gap-3.5 sm:rounded-[22px] sm:px-4 sm:py-3.5">
        <div className="relative shrink-0">
          <img
            src={NINA_AVATAR}
            alt="Maria"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-gold/50 shadow-[0_0_24px_-6px_var(--gold)] sm:h-12 sm:w-12"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-gold animate-pulse-glow sm:h-3.5 sm:w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-lg leading-tight text-gradient-gold sm:text-xl">
            {t("chatWith")}
          </p>
          <p className="truncate text-[10px] tracking-wide text-muted-foreground sm:text-[11px]">
            {t("chatRole")}
            <span className="mx-1.5 text-gold/40">·</span>
            <span className="text-gold/80">{busyLabel ? t("working") : t("online")}</span>
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-3 scrollbar-thin sm:py-5"
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            msg={m}
            avatar={NINA_AVATAR}
            lang={L}
            t={t}
            locked={locked}
            onPickService={pickService}
            onOpenServices={onOpenServices}
          />
        ))}
      </div>

      <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
        {busyLabel && (
          <div className="mb-2 flex items-center justify-center gap-2 px-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            <p className="text-[11px] tracking-wide text-muted-foreground">
              <span className="text-foreground/85">{busyLabel}</span>
              <span className="mx-1.5 text-gold/35">·</span>
              <span className="tabular-nums text-gold/75">
                {t("statusElapsed").replace("{n}", String(elapsedSec))}
              </span>
            </p>
          </div>
        )}

        <div className="glass flex items-end gap-1.5 rounded-[18px] p-1.5 ring-1 ring-white/5 sm:gap-2 sm:rounded-[22px] sm:p-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onPickImage(f);
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              void (async () => {
                const fresh = await refreshWallet();
                const ok = fresh.canPhoto || hasPhotoSub;
                if (!ok) {
                  onOpenPaywall();
                  return;
                }
                if (!awaitingPhotoRef.current) awaitingPhotoRef.current = "coffee";
                fileRef.current?.click();
              })();
            }}
            aria-label={t("uploadImage")}
            title={
              hasPhotoSub
                ? awaitingPhotoRef.current === "hand"
                  ? t("chatSvcHandAskPhoto")
                  : t("chatSvcCoffeeAskPhoto")
                : t("uploadLocked")
            }
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gold/70 transition-colors hover:text-gold glass-dark sm:h-11 sm:w-11"
          >
            <ImagePlus className="block h-5 w-5" />
            {!hasPhotoSub && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-soft text-obsidian">
                <Lock className="block h-2.5 w-2.5" />
              </span>
            )}
          </motion.button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={locked}
            rows={1}
            placeholder={t("inputPlaceholder")}
            className="max-h-28 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/55 disabled:opacity-50 sm:px-3 sm:py-2.5"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => void send()}
            disabled={locked || !input.trim()}
            aria-label={t("send")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-soft text-obsidian shadow-[0_0_22px_-4px_var(--gold)] transition-opacity disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <Send className="block h-5 w-5" />
          </motion.button>
        </div>

        <p className="mt-2 px-1 text-center text-[9px] leading-relaxed text-muted-foreground/75 sm:mt-2.5 sm:text-[10px]">
          {t("chatDisclaimerBefore")}{" "}
          <Link to="/terms" className="text-gold/80 underline-offset-2 hover:underline">
            {t("termsOfService")}
          </Link>
          {" & "}
          <Link to="/privacy" className="text-gold/80 underline-offset-2 hover:underline">
            {t("privacyPolicy")}
          </Link>
          {t("chatDisclaimerAfter")}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  avatar,
  lang,
  t,
  locked,
  onPickService,
  onOpenServices,
}: {
  msg: Message;
  avatar: string;
  lang: Lang;
  t: (k: string) => string;
  locked: boolean;
  onPickService: (s: ChatService) => void;
  onOpenServices: () => void;
}) {
  const isUser = msg.role === "user";
  const offers: { key: ChatService; emoji: string; label: string }[] = [
    { key: "general", emoji: "🃏", label: t("chatSvcGeneral") },
    { key: "love", emoji: "💕", label: t("chatSvcLove") },
    { key: "coffee", emoji: "☕", label: t("chatSvcCoffee") },
    { key: "hand", emoji: "🤚", label: t("chatSvcHand") },
    { key: "advice", emoji: "💬", label: t("chatSvcAdvice") },
    { key: "dream", emoji: "🌙", label: t("chatSvcDream") },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <img
          src={avatar}
          alt="Maria"
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-gold/50"
        />
      )}
      <div className="min-w-0 max-w-[85%] sm:max-w-[78%]">
        <div
          className={`rounded-[20px] px-4 py-3 text-sm leading-[1.65] whitespace-pre-wrap ${
            isUser
              ? "glass-dark rounded-br-md text-foreground"
              : "glass-purple rounded-bl-md text-foreground shadow-[0_8px_28px_-16px_oklch(0.45_0.2_295_/_0.55)]"
          }`}
        >
          {msg.imageUrl && (
            <img
              src={msg.imageUrl}
              alt=""
              className="mb-2 max-h-48 w-full rounded-lg object-cover"
            />
          )}
          {msg.cards && msg.cards.length > 0 && (
            <div className="mb-2.5 flex gap-1.5">
              {msg.cards.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-1 flex-col items-center gap-1 overflow-hidden rounded-lg border border-gold/40 bg-black/30"
                >
                  <TarotCardArt
                    card={c}
                    alt={c.names[lang]}
                    className="aspect-[2/3] w-full rounded-t-lg"
                  />
                  <span className="px-1 pb-1.5 text-center text-[9px] font-medium leading-tight text-gold/90">
                    {c.names[lang]}
                  </span>
                </div>
              ))}
            </div>
          )}
          {msg.text}
          {msg.streaming && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-gold align-middle" />
          )}
        </div>
        {msg.showOffers && !msg.streaming && (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {offers.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  disabled={locked}
                  onClick={() => onPickService(o.key)}
                  className="glass-dark flex items-start gap-2 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium leading-snug text-foreground transition-colors hover:gold-border disabled:opacity-40"
                >
                  <span className="shrink-0 text-base leading-none" aria-hidden>
                    {o.emoji}
                  </span>
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                disabled={locked}
                onClick={onOpenServices}
                className="glass-dark flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-medium leading-snug text-foreground transition-colors hover:gold-border disabled:opacity-40 sm:w-[calc(50%-0.1875rem)]"
              >
                <span className="shrink-0 text-base leading-none" aria-hidden>
                  ✨
                </span>
                <span>{t("services")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
