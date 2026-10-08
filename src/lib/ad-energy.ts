import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { beginAdWatchForUser, claimAdEnergyForUser, type AdWatchSource } from "./ad-energy.server";

const TokenSchema = z.object({
  accessToken: z.string().min(20).max(4000),
});

const BeginSchema = TokenSchema.extend({
  source: z.enum(["overlay", "gam", "simulate"]),
});

const ClaimSchema = TokenSchema.extend({
  ticket: z.string().min(32).max(128),
});

export const beginAdWatch = createServerFn({ method: "POST" })
  .validator(BeginSchema)
  .handler(async ({ data }) => beginAdWatchForUser(data.accessToken, data.source as AdWatchSource));

export const claimAdEnergyFn = createServerFn({ method: "POST" })
  .validator(ClaimSchema)
  .handler(async ({ data }) => claimAdEnergyForUser(data.accessToken, data.ticket));
