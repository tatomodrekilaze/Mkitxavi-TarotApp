import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { notifyContactInbox } from "@/lib/contact-notify.server";

const ContactInput = z.object({
  kind: z.enum(["support", "feedback"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(3).max(4000),
});

export type ContactSubmitResult =
  | { ok: true }
  | {
      ok: false;
      errorKey: "contactFailed" | "contactInvalid" | "contactTooMany";
      detail?: string;
    };

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator(ContactInput)
  .handler(async ({ data }): Promise<ContactSubmitResult> => {
    try {
      const { getSupabaseServerClient } = await import("@/lib/supabase/server");
      const supabase = getSupabaseServerClient();

      // The function stamps user_id from auth.uid() and enforces the hourly cap.
      const { error } = await supabase.rpc("submit_contact_message", {
        p_kind: data.kind,
        p_name: data.name,
        p_email: data.email,
        p_message: data.message,
      });

      if (error) {
        console.error("submit_contact_message", error);
        if (error.message.includes("rate limit")) {
          return { ok: false, errorKey: "contactTooMany" };
        }
        return { ok: false, errorKey: "contactFailed", detail: error.message };
      }

      // Form used to only write to Supabase — never emailed the inbox.
      const notify = await notifyContactInbox({
        kind: data.kind,
        name: data.name,
        email: data.email,
        message: data.message,
      });
      if (!notify.ok) {
        console.error("contact inbox notify failed", notify.detail);
      }

      return { ok: true };
    } catch (err) {
      console.error("contact submit", err);
      return {
        ok: false,
        errorKey: "contactFailed",
        detail: err instanceof Error ? err.message : undefined,
      };
    }
  });
