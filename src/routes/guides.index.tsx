import { createFileRoute } from "@tanstack/react-router";
import { GuidesHubPage } from "@/components/GuidesHubPage";
import { buildGuidesHubFaqJsonLd } from "@/lib/guide-content";
import { SITE_URL } from "@/lib/link-preview";
import { BRAND } from "@/lib/seo-brand";

const title = `ტაროს გზამკვლევები | ${BRAND.name}`;
const description =
  "გზამკვლევები ონლაინ ტაროზე, უფასო მკითხაობაზე, სიყვარულზე, ყოველდღიურ ტაროზე, ზოდიაქოების თავსებადობაზე და პიროვნების ტესტებზე. Mkitxavi.com.";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/guides` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guides` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildGuidesHubFaqJsonLd()),
      },
    ],
  }),
  component: GuidesHubPage,
});
