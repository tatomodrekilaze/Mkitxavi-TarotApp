import { createFileRoute } from "@tanstack/react-router";
import { TarotHubPage } from "@/components/TarotHubPage";
import { SITE_URL } from "@/lib/link-preview";
import { BRAND } from "@/lib/seo-brand";
import { buildTarotHubJsonLd } from "@/lib/tarot-seo";

const title = `ონლაინ ტარო: 78 ბარათის მნიშვნელობები | ${BRAND.name}`;
const description =
  "ონლაინ ტაროს ენციკლოპედია: 78 ბარათის მნიშვნელობები ქართულად და ინგლისურად. უფასო მკითხაობა მარიასთან, ყოველდღიური ტარო და სიყვარულზე მკითხაობა. Mkitxavi.com.";

export const Route = createFileRoute("/tarot/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/tarot` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/tarot` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildTarotHubJsonLd()),
      },
    ],
  }),
  component: TarotHubPage,
});
