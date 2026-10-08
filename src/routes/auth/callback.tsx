import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { hasTrustedOAuthEmail } from "@/lib/auth-email";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { StarField } from "@/components/StarField";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in · Mkitxavi" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: AuthCallback,
});

/**
 * Landing for email-confirm and OAuth redirects. Supabase puts tokens in the
 * URL hash / ?code=; the client exchanges them for a session, then we go home.
 */
function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }
    // Strict Mode / remounts must not exchange the same code twice
    // (second pass clears the PKCE verifier and throws).
    if (ran.current) return;
    ran.current = true;

    const supabase = getSupabaseBrowserClient();

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const errDesc = url.searchParams.get("error_description") || url.searchParams.get("error");
        if (errDesc) throw new Error(errDesc);

        const code = url.searchParams.get("code");
        if (code) {
          const lockKey = `mkitxavi.oauth.code.${code}`;
          const already = sessionStorage.getItem(lockKey);
          if (already === "done") {
            // Prior attempt finished; continue to home if we have a session.
          } else if (already === "pending") {
            // Another in-flight pass owns this code.
            await waitForSession(supabase, 8000);
          } else {
            sessionStorage.setItem(lockKey, "pending");
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              // Remount race: verifier already consumed but session exists.
              const { data } = await supabase.auth.getSession();
              if (!data.session) throw exchangeError;
            }
            sessionStorage.setItem(lockKey, "done");
          }
          // Drop ?code= so remounts/back-button don't re-exchange.
          window.history.replaceState(
            {},
            "",
            url.pathname + (url.searchParams.get("verify") === "1" ? "?verify=1" : ""),
          );
        } else if (url.hash.includes("access_token")) {
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error("No auth code returned. Try signing in again.");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Sign-in did not create a session. Try again from https://mkitxavi.com");
        }

        // Mark verified only for:
        // - Google / Facebook with a real mailbox
        // - Explicit verify / signup / email-change links (?verify=1 or type=…)
        // Never trust auth.email_confirmed_at alone — signup auto-sets that for login.
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        const uid = user?.id;
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const authType = url.searchParams.get("type") || hashParams.get("type") || "";
        const forceVerify =
          url.searchParams.get("verify") === "1" ||
          authType === "signup" ||
          authType === "email" ||
          authType === "email_change" ||
          authType === "magiclink";
        if (uid && (forceVerify || hasTrustedOAuthEmail(user))) {
          // RPC only — profiles.email_verified is not client-writable.
          await supabase.rpc("sync_email_verified");
          try {
            localStorage.removeItem("mkitxavi_email_verify_pending");
          } catch {
            /* ignore */
          }
        }

        await router.navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not complete sign-in.");
      }
    })();
  }, [router]);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <StarField />
      <div className="relative z-10 glass-purple max-w-sm rounded-3xl p-8 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive break-words [overflow-wrap:anywhere]">{error}</p>
            <a
              href="/"
              className="mt-4 inline-block text-xs text-gold underline-offset-2 hover:underline"
            >
              Home
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />
            <p className="mt-3 text-sm text-muted-foreground">Confirming…</p>
          </>
        )}
      </div>
    </div>
  );
}

async function waitForSession(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  timeoutMs: number,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    await new Promise((r) => setTimeout(r, 150));
  }
}
