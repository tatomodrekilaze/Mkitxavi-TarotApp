import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ContentChrome } from "./ContentChrome";
import { FreeReadingCta } from "./FreeReadingCta";
import { useApp } from "@/context/AppContext";
import { GUIDE_DOCS } from "@/lib/guide-content";

export function GuidesHubPage() {
  return (
    <ContentChrome>
      <GuidesHubBody />
    </ContentChrome>
  );
}

function GuidesHubBody() {
  const { lang, t } = useApp();
  const isKa = (lang ?? "ka") !== "en";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-purple rounded-[28px] p-6 sm:p-9"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">Mkitxavi</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-gradient-gold sm:text-4xl">
        {isKa ? "გზამკვლევები ტაროსა და მკითხაობაზე" : "Guides for tarot and readings"}
      </h1>
      <p className="mt-5 text-sm leading-relaxed text-foreground/90">
        {isKa
          ? "აქ იპოვი პრაქტიკულ სტატიებს ონლაინ ტაროზე, უფასო მკითხაობაზე, სიყვარულზე, ყოველდღიურ ტაროზე, ზოდიაქოების თავსებადობაზე და პიროვნების ტესტებზე. შემდეგ გადადი ენციკლოპედიაში ან ჩატში მარიასთან."
          : "Practical articles on online tarot, free readings, love, everyday tarot, zodiac compatibility, and personality tests. Then open the encyclopedia or chat with Maria."}
      </p>

      <ul className="mt-8 space-y-3">
        {GUIDE_DOCS.map((guide) => (
          <li key={guide.slug}>
            <Link
              to="/guides/$slug"
              params={{ slug: guide.slug }}
              className="glass-dark block rounded-2xl px-4 py-4 ring-1 ring-white/10 transition-colors hover:ring-gold/35"
            >
              <h2 className="font-serif text-lg text-gold/95">
                {isKa ? guide.titleKa : guide.titleEn}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {isKa ? guide.descriptionKa : guide.descriptionEn}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
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
    </motion.article>
  );
}
