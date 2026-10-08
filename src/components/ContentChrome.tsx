import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { StarField } from "./StarField";
import { SocialLinks } from "./SocialLinks";
import { AppProvider, useApp } from "@/context/AppContext";

interface Props {
  children: ReactNode;
  /** Extra footer links after standard legal set */
  extraLinks?: Array<{ to: string; label: string }>;
}

export function ContentChrome({ children, extraLinks }: Props) {
  return (
    <AppProvider>
      <ContentChromeBody extraLinks={extraLinks}>{children}</ContentChromeBody>
    </AppProvider>
  );
}

function ContentChromeBody({ children, extraLinks }: Props) {
  const { t } = useApp();

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background">
      <StarField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.35_0.14_300_/_0.35),transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="glass-dark mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-gold/90 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("backHome")}
        </Link>

        {children}

        <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {(
            [
              { href: "/tarot", label: t("navTarot") },
              { href: "/guides", label: t("navGuides") },
              { href: "/about", label: t("aboutMkitxavi") },
              { href: "/support", label: t("supportTitle") },
              ...(extraLinks ?? []).map((l) => ({ href: l.to, label: l.label })),
            ] as Array<{ href: string; label: string }>
          ).map((item) => (
            <a
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="text-gold/80 underline-offset-4 hover:text-gold hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <SocialLinks className="mt-5 justify-start" compact />
      </div>
    </div>
  );
}
