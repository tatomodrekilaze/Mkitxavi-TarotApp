import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { handleNinaReply } from "./nina-reply.server";

const CardSchema = z.object({
  // Server resolves name/keywords/meaning from the deck by key — client text is ignored.
  key: z.string().min(1).max(64),
  name: z.string().max(120).optional(),
  glyph: z.string().max(16).optional(),
  suit: z.string().max(32).optional(),
  keywords: z.string().max(400).optional(),
  meaning: z.string().max(1200).optional(),
});

const HistorySchema = z.object({
  role: z.enum(["user", "nina"]),
  text: z.string().max(1200),
});

const InputSchema = z.object({
  mode: z.enum(["chat", "reading", "intent", "clarify", "coffee", "hand", "dream"]),
  lang: z.enum(["en", "ka"]),
  question: z.string().trim().min(1).max(2000),
  /** Browser JWT - required because auth lives in localStorage, not cookies. */
  accessToken: z.string().min(20).max(4000),
  cards: z.array(CardSchema).max(3).optional(),
  history: z.array(HistorySchema).max(20).optional(),
  imageBase64: z.string().max(2_000_000).optional(),
  imageMime: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]).optional(),
  session: z
    .object({
      originalQuestion: z.string().max(2000).optional(),
      notes: z.array(z.string().max(1000)).max(8).optional(),
      phase: z.enum(["open", "awaiting_clarify"]).optional(),
    })
    .optional(),
  client: z
    .object({
      timeZone: z.string().max(80).optional(),
      country: z.string().max(80).optional(),
      city: z.string().max(80).optional(),
      localTime: z.string().max(16).optional(),
      localDate: z.string().max(16).optional(),
      moonName: z.string().max(80).optional(),
      moonIllumination: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export const ninaReply = createServerFn({ method: "POST" })
  .validator(InputSchema)
  .handler(async ({ data }) => handleNinaReply(data));
