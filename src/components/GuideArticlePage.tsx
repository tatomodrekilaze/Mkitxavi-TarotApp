import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ContentChrome } from "./ContentChrome";
import { FreeReadingCta } from "./FreeReadingCta";
import { useApp } from "@/context/AppContext";
import type { GuideDoc } from "@/lib/guide-content";
import { GUIDE_DOCS } from "@/lib/guide-content";

interface Props {
  guide: GuideDoc;
}

export function GuideArticlePage({ guide }: Props) {
  return (
    <ContentChrome>
      <GuideArticleBody guide={guide} />
    </ContentChrome>
  );
}

function GuideArticleBody({ guide }: Props) {
  const { lang, t } = useApp();
  const isKa = (lang ?? "ka") !== "en";
  const others = GUIDE_DOCS.filter((g) => g.slug !== guide.slug).slice(0, 6);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-purple rounded-[28px] p-6 sm:p-9"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
        {isKa ? "გზამკვლევი" : "Guide"}
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-gradient-gold sm:text-4xl">
        {isKa ? guide.titleKa : guide.titleEn}
      </h1>
      <p className="mt-5 text-sm leading-relaxed text-foreground/90">
        {isKa ? guide.descriptionKa : guide.descriptionEn}
      </p>

      <div className="mt-8 space-y-8">
        {guide.sections.map((section) => {
          const heading = isKa ? section.headingKa : section.headingEn;
          const body = isKa ? section.bodyKa : section.bodyEn;
          return (
            <section key={heading}>
              <h2 className="font-serif text-xl text-gold/95">{heading}</h2>
              <div className="mt-3 space-y-3">
                {body.map((para) => (
                  <p key={para.slice(0, 48)} className="text-sm leading-relaxed text-foreground/90">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="font-serif text-xl text-gold/95">{isKa ? "ხშირი კითხვები" : "FAQ"}</h2>
          <dl className="mt-4 space-y-4">
            {guide.faq.map((item) => (
              <div key={isKa ? item.questionKa : item.questionEn}>
                <dt className="text-sm font-medium text-foreground/95">
                  {isKa ? item.questionKa : item.questionEn}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {isKa ? item.answerKa : item.answerEn}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <Link
          to="/tarot"
          className="glass-dark inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-foreground/90 ring-1 ring-white/10 hover:text-gold hover:ring-gold/30"
        >
          {isKa ? "ტაროს ენციკლოპედია" : "Tarot encyclopedia"}
        </Link>
        <FreeReadingCta className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-soft px-6 text-sm font-bold tracking-wide text-obsidian">
          {isKa ? "უფასო მკითხაობა მარიასთან" : t("landingCta")}
        </FreeReadingCta>
      </div>

      {others.length > 0 && (
        <nav className="mt-8">
          <h2 className="font-serif text-lg text-gold/95">
            {isKa ? "სხვა გზამკვლევები" : "More guides"}
          </h2>
          <ul className="mt-3 space-y-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  className="text-sm text-gold/85 underline-offset-4 hover:text-gold hover:underline"
                >
                  {isKa ? g.titleKa : g.titleEn}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </motion.article>
  );
}
