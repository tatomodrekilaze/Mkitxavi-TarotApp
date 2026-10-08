import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, Sparkles, Check } from "lucide-react";
import { AppProvider, useApp } from "@/context/AppContext";
import { StarField } from "@/components/StarField";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Mkitxavi" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ResetPasswordRoute,
});

const MIN_PASSWORD = 8;

function ResetPasswordRoute() {
  return (
    <AppProvider>
      <ResetPassword />
    </AppProvider>
  );
}

/**
 * Landing page for the recovery link emailed by Supabase. The client picks the
 * recovery token out of the URL on load and opens a short-lived session, which
 * is what makes updateUser({ password }) permissible here.
 */
function ResetPassword() {
  const { t, ready, authenticated, updatePassword } = useApp();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t("authWeakPassword"));
      return;
    }

    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (result.ok) {
      setDone(true);
      return;
    }
    if (result.errorKey) setError(t(result.errorKey));
    else if (result.errorDetail) setError(result.errorDetail);
  };

  // No recovery session means the link was already used or has expired.
  const linkDead = ready && !authenticated && !done;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <StarField />
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="glass-purple w-full max-w-sm rounded-3xl p-7"
        >
          <div className="text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gold animate-pulse-glow" />
            <h1 className="mt-3 font-serif text-2xl text-gradient-gold">{t("newPasswordTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("newPasswordSub")}</p>
          </div>

          {done ? (
            <div className="mt-6 text-center">
              <p className="flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-3 text-xs text-gold">
                <Check className="h-4 w-4" /> {t("passwordUpdated")}
              </p>
              <button
                onClick={() => router.navigate({ to: "/" })}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)]"
              >
                {t("enterApp")}
              </button>
            </div>
          ) : linkDead ? (
            <div className="mt-6 text-center">
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                {t("resetLinkInvalid")}
              </p>
              <button
                onClick={() => router.navigate({ to: "/" })}
                className="mt-4 w-full rounded-xl border border-gold/40 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
              >
                {t("resetBack")}
              </button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div>
                <label
                  htmlFor="nina-new-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gold/70"
                >
                  {t("newPasswordLabel")}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                  <input
                    id="nina-new-password"
                    type={revealed ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder={t("passwordPlaceholder")}
                    className="glass-dark w-full rounded-xl py-3 pl-10 pr-11 text-foreground outline-none placeholder:text-muted-foreground/60 focus:gold-border"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? t("hidePassword") : t("showPassword")}
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-gold/60 transition-colors hover:text-gold"
                  >
                    {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !ready}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft py-3.5 font-semibold text-obsidian shadow-[0_0_28px_-6px_var(--gold)] transition-opacity disabled:opacity-40"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("updatePassword")}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
