import { createFileRoute, notFound } from "@tanstack/react-router";
import { TarotCardPageView } from "@/components/TarotCardPage";
import { SITE_URL } from "@/lib/link-preview";
import {
  buildCardJsonLd,
  cardCanonical,
  cardPageDescription,
  cardPageTitle,
  getCardByKey,
} from "@/lib/tarot-seo";

export const Route = createFileRoute("/tarot/$cardKey")({
  loader: ({ params }) => {
    const card = getCardByKey(params.cardKey);
    if (!card) throw notFound();
    return { card };
  },
  head: ({ loaderData }) => {
    const card = loaderData?.card;
    if (!card) {
      return {
        meta: [{ title: "Card not found | Mkitxavi" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = cardPageTitle(card);
    const description = cardPageDescription(card);
    const url = cardCanonical(card.key);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: `${SITE_URL}${card.image}` },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildCardJsonLd(card)),
        },
      ],
    };
  },
  component: TarotCardRoute,
});

function TarotCardRoute() {
  const { card } = Route.useLoaderData();
  return <TarotCardPageView card={card} />;
}
