import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkDisposableEmail } from "@/lib/disposable-email";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const EmailInput = z.object({
  email: z.string().trim().email().max(320),
});

export type SignupEmailGuardResult =
  | { ok: true }
  | { ok: false; errorKey: "authDisposableEmail" | "authEmailInvalid" };

async function rememberBlockedDomain(domain: string): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();
    await admin
      .from("blocked_email_domains" as never)
      .upsert({ domain: domain.toLowerCase() } as never, {
        onConflict: "domain",
        ignoreDuplicates: true,
      });
  } catch (err) {
    console.error("remember blocked email domain", err);
  }
}

/**
 * Server-side signup email gate: local blocklist + live disposable detectors.
 * Newly detected temp domains are written into blocked_email_domains so the
 * auth.users trigger rejects them on the next attempt.
 */
export const guardSignupEmail = createServerFn({ method: "POST" })
  .validator(EmailInput)
  .handler(async ({ data }): Promise<SignupEmailGuardResult> => {
    try {
      const email = data.email.trim().toLowerCase();
      if (!email.includes("@")) {
        return { ok: false, errorKey: "authEmailInvalid" };
      }

      const check = await checkDisposableEmail(email);
      if (check.disposable) {
        if (check.domain) await rememberBlockedDomain(check.domain);
        return { ok: false, errorKey: "authDisposableEmail" };
      }
      return { ok: true };
    } catch (err) {
      console.error("guardSignupEmail handler", err);
      // Don't hard-block every signup if the gate itself crashes; client + DB
      // trigger still cover known disposable domains.
      return { ok: true };
    }
  });
