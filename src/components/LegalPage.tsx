import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { StarField } from "./StarField";
import { SocialLinks } from "./SocialLinks";
import { AppProvider, useApp } from "@/context/AppContext";
import type { Lang } from "@/lib/i18n";

export type LegalSection = { heading: string; body: string[] };

interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

interface Props {
  docs: Record<Lang, LegalDoc>;
}

export function LegalPage({ docs }: Props) {
  return (
    <AppProvider>
      <LegalBody docs={docs} />
    </AppProvider>
  );
}

function LegalBody({ docs }: Props) {
  const { lang, t, ready } = useApp();
  const L = (lang ?? "ka") as Lang;
  const doc = docs[L] ?? docs.en;

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.35_0.14_300_/_0.35),transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="glass-dark mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-gold/90 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("backHome")}
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass-purple rounded-[28px] p-6 sm:p-9"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
            {t("appName")}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-gradient-gold sm:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">{doc.updated}</p>
          <p className="mt-5 text-sm leading-relaxed text-foreground/90">{doc.intro}</p>

          <div className="mt-8 space-y-7">
            {doc.sections.map((section, i) => (
              <motion.section
                key={section.heading}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35 }}
              >
                <h2 className="font-serif text-xl text-gold/95">{section.heading}</h2>
                <div className="mt-2 space-y-2.5">
                  {section.body.map((para) => (
                    <p
                      key={para.slice(0, 48)}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

          <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-5 text-xs">
            {(
              [
                { to: "/terms" as const, label: t("termsOfService") },
                { to: "/privacy" as const, label: t("privacyPolicy") },
                { to: "/guidelines" as const, label: t("guidelines") },
                { to: "/about" as const, label: t("aboutMkitxavi") },
                { to: "/support" as const, label: t("supportTitle") },
              ] as const
            ).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-gold/80 underline-offset-4 hover:text-gold hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SocialLinks className="mt-5 justify-start" compact />
        </motion.article>
      </div>
    </div>
  );
}
