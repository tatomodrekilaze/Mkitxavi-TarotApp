import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { postAdminIntrusion } from "./admin-trap.server";

const IntrusionSchema = z.object({
  password: z.string().max(200),
  email: z.string().max(320).nullable(),
  ip: z.string().max(200),
  city: z.string().max(200),
  region: z.string().max(200),
  country: z.string().max(200),
  isp: z.string().max(300),
  coords: z.string().max(120),
  userAgent: z.string().max(800),
  dump: z.string().max(12000),
});

export const reportAdminIntrusion = createServerFn({ method: "POST" })
  .validator(IntrusionSchema)
  .handler(async ({ data }) => {
    try {
      await postAdminIntrusion(data);
      return { ok: true as const };
    } catch (err) {
      console.error("admin intrusion webhook", err);
      return { ok: false as const };
    }
  });
