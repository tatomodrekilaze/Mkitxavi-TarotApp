import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  AtSign,
  Check,
  Clock,
  CreditCard,
  KeyRound,
  Lightbulb,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquareHeart,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { AppProvider, useApp } from "@/context/AppContext";
import { StarField } from "@/components/StarField";
import { SocialLinks } from "@/components/SocialLinks";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { submitContactMessage } from "@/lib/contact-submit";

type Kind = "support" | "feedback";

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_MESSAGE = 4000;

const SUPPORT_TOPICS = [
  { id: "login", key: "contactTopicLogin", Icon: KeyRound },
  { id: "energy", key: "contactTopicEnergy", Icon: Zap },
  { id: "billing", key: "contactTopicBilling", Icon: CreditCard },
  { id: "bug", key: "contactTopicBug", Icon: TriangleAlert },
  { id: "other", key: "contactTopicOther", Icon: MoreHorizontal },
] as const;

const FEEDBACK_TOPICS = [
  { id: "idea", key: "contactTopicIdea", Icon: Lightbulb },
  { id: "bug", key: "contactTopicBug", Icon: TriangleAlert },
  { id: "energy", key: "contactTopicEnergy", Icon: Zap },
  { id: "billing", key: "contactTopicBilling", Icon: CreditCard },
  { id: "other", key: "contactTopicOther", Icon: MoreHorizontal },
] as const;

export function ContactPage({ kind }: { kind: Kind }) {
  return (
    <AppProvider>
      <ContactBody kind={kind} />
    </AppProvider>
  );
}

function ContactBody({ kind }: { kind: Kind }) {
  const { t, email, user, ready } = useApp();
  const isSupport = kind === "support";
  const topics = isSupport ? SUPPORT_TOPICS : FEEDBACK_TOPICS;

  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user.name) setName((n) => n || user.name);
    if (email) setMail((m) => m || email);
  }, [ready, user.name, email]);

  const charsLeft = MAX_MESSAGE - message.length;
  const topicLabel = useMemo(() => {
    const found = topics.find((item) => item.id === topic);
    return found ? t(found.key) : null;
  }, [topic, topics, t]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const body = topicLabel ? `[${topicLabel}] ${message.trim()}` : message.trim();
    const result = await submitContactMessage({
      data: {
        kind,
        name: name.trim(),
        email: mail.trim(),
        message: body,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(t(result.errorKey));
      return;
    }
    setSent(true);
    setMessage("");
    setTopic(null);
  };

  if (!ready) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center bg-background">
        <StarField />
        <p className="relative z-10 text-sm text-muted-foreground">{t("authPending")}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background">
      <StarField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,oklch(0.38_0.15_300_/_0.4),transparent_70%)]" />

      <div className="relative z-10 mx-auto w-full max-w-xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          to="/"
          className="glass-dark mb-5 inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-gold/90 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("backHome")}
        </Link>

        <KindSwitcher kind={kind} />

        <motion.article
          key={kind}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="glass-purple relative mt-4 overflow-hidden rounded-[28px] p-5 sm:p-8"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
            animate={{ opacity: [0.45, 0.75, 0.45] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <header className="relative flex items-start gap-3.5">
            <motion.div
              initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.55, ease: EASE }}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold/30 to-gold/5 text-gold ring-1 ring-gold/30"
            >
              {isSupport ? (
                <LifeBuoy className="h-5.5 w-5.5" />
              ) : (
                <MessageSquareHeart className="h-5.5 w-5.5" />
              )}
            </motion.div>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl leading-tight text-gradient-gold sm:text-[28px]">
                {isSupport ? t("supportTitle") : t("feedbackTitle")}
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {isSupport ? t("supportIntro") : t("feedbackIntro")}
              </p>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <SentPanel key="sent" onAgain={() => setSent(false)} t={t} />
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="relative mt-7 space-y-5"
                onSubmit={(e) => void onSubmit(e)}
              >
                <Field label={t("contactTopicLabel")} delay={0.12}>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((item) => {
                      const active = topic === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTopic(active ? null : item.id)}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium transition-all ${
                            active
                              ? "bg-gradient-to-r from-gold to-gold-soft text-obsidian shadow-[0_8px_24px_-10px_oklch(0.72_0.14_88_/_0.8)]"
                              : "glass-dark text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:ring-gold/30"
                          }`}
                        >
                          <item.Icon className="h-3.5 w-3.5" />
                          {t(item.key)}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("contactName")} delay={0.18}>
                    <InputShell Icon={UserIcon}>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={120}
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                        placeholder={t("contactNamePh")}
                      />
                    </InputShell>
                  </Field>

                  <Field label={t("contactEmail")} delay={0.22}>
                    <InputShell Icon={AtSign}>
                      <input
                        required
                        type="email"
                        value={mail}
                        onChange={(e) => setMail(e.target.value)}
                        maxLength={200}
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                        placeholder="you@email.com"
                      />
                    </InputShell>
                  </Field>
                </div>

                <Field label={t("contactMessage")} delay={0.26}>
                  <div className="glass-dark rounded-2xl px-3.5 py-3 ring-1 ring-white/10 transition-shadow focus-within:ring-gold/40">
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      maxLength={MAX_MESSAGE}
                      className="w-full resize-y bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
                      placeholder={
                        isSupport ? t("contactMessagePhSupport") : t("contactMessagePhFeedback")
                      }
                    />
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <ShieldCheck className="h-3 w-3" /> {t("contactPrivacyNote")}
                      </span>
                      <span
                        className={`text-[10px] tabular-nums ${
                          charsLeft < 200 ? "text-gold/90" : "text-muted-foreground/60"
                        }`}
                      >
                        {t("contactCharsLeft").replace("{n}", String(charsLeft))}
                      </span>
                    </div>
                  </div>
                </Field>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={busy ? undefined : { scale: 1.015 }}
                  whileTap={busy ? undefined : { scale: 0.985 }}
                  className="relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-gold to-gold-soft text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_44px_-16px_oklch(0.72_0.14_88_/_0.85)] disabled:opacity-45"
                >
                  {!busy && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        repeatDelay: 1.8,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-2">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSupport ? t("supportCta") : t("feedbackCta")}
                  </span>
                </motion.button>

                <p className="inline-flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
                  <Clock className="h-3 w-3" /> {t("contactResponseTime")}
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <footer className="relative mt-7 border-t border-white/10 pt-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="glass-dark flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-[12px] font-medium text-foreground/85 ring-1 ring-white/10 transition-colors hover:text-gold hover:ring-gold/30"
            >
              <Mail className="h-3.5 w-3.5 text-gold/80" />
              <span className="text-muted-foreground">{t("contactAlsoEmail")}</span>
              <span className="break-all text-gold/90">{SUPPORT_EMAIL}</span>
            </a>
            <SocialLinks className="mt-3" compact />
            <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px]">
              <Link
                to="/guidelines"
                className="text-gold/70 underline-offset-4 hover:text-gold hover:underline"
              >
                {t("guidelines")}
              </Link>
              <Link
                to="/terms"
                className="text-gold/70 underline-offset-4 hover:text-gold hover:underline"
              >
                {t("termsOfService")}
              </Link>
              <Link
                to="/privacy"
                className="text-gold/70 underline-offset-4 hover:text-gold hover:underline"
              >
                {t("privacyPolicy")}
              </Link>
            </nav>
          </footer>
        </motion.article>
      </div>
    </div>
  );
}

function KindSwitcher({ kind }: { kind: Kind }) {
  const { t } = useApp();
  const tabs = [
    { to: "/support" as const, id: "support" as const, label: t("supportTitle"), Icon: LifeBuoy },
    {
      to: "/feedback" as const,
      id: "feedback" as const,
      label: t("feedbackTitle"),
      Icon: MessageSquareHeart,
    },
  ];

  return (
    <div className="glass-dark grid grid-cols-2 gap-1 rounded-2xl p-1 ring-1 ring-white/10">
      {tabs.map((tab) => {
        const active = tab.id === kind;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            className="relative flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId="contact-tab"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold/25 to-gold/5 ring-1 ring-gold/35"
              />
            )}
            <span
              className={`relative inline-flex items-center gap-1.5 ${
                active ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function Field({
  label,
  delay,
  children,
}: {
  label: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
    >
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/70">
        {label}
      </label>
      {children}
    </motion.div>
  );
}

function InputShell({ Icon, children }: { Icon: typeof UserIcon; children: React.ReactNode }) {
  return (
    <div className="glass-dark flex min-h-12 items-center gap-2.5 rounded-2xl px-3.5 ring-1 ring-white/10 transition-shadow focus-within:ring-gold/40">
      <Icon className="h-4 w-4 shrink-0 text-gold/60" />
      {children}
    </div>
  );
}

function SentPanel({ onAgain, t }: { onAgain: () => void; t: (k: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative mt-8 overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-b from-gold/12 to-transparent px-4 py-8 text-center"
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute text-gold/50"
          style={{ left: `${18 + i * 22}%`, top: `${16 + (i % 2) * 48}%` }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35 }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
        className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-soft text-obsidian shadow-[0_14px_38px_-12px_oklch(0.72_0.14_88_/_0.9)]"
      >
        <Check className="h-7 w-7" strokeWidth={3} />
      </motion.div>
      <p className="relative mt-4 font-serif text-lg text-gradient-gold">{t("contactSentTitle")}</p>
      <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("contactSentBody")}
      </p>
      <p className="relative mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
        <Clock className="h-3 w-3" /> {t("contactResponseTime")}
      </p>
      <div className="relative mt-5">
        <button
          type="button"
          onClick={onAgain}
          className="glass-dark min-h-10 rounded-xl px-4 text-xs font-semibold text-gold ring-1 ring-gold/25 transition-colors hover:bg-white/5"
        >
          {t("contactSendAnother")}
        </button>
      </div>
    </motion.div>
  );
}
