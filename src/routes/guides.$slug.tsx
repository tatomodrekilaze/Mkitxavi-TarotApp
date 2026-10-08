import { createFileRoute, notFound } from "@tanstack/react-router";
import { GuideArticlePage } from "@/components/GuideArticlePage";
import { buildGuideFaqJsonLd, getGuide, guideUrl, type GuideSlug } from "@/lib/guide-content";
import { SITE_URL } from "@/lib/link-preview";
import { BRAND } from "@/lib/seo-brand";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    const guide = loaderData?.guide;
    if (!guide) {
      return {
        meta: [{ title: "Guide not found | Mkitxavi" }, { name: "robots", content: "noindex" }],
      };
    }
    // Default SEO language is Georgian (site default); English lives in-app when lang=en.
    const title = `${guide.titleKa} | ${BRAND.name}`;
    const description = guide.descriptionKa;
    const url = guideUrl(guide.slug as GuideSlug);
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.titleKa,
      description: guide.descriptionKa,
      inLanguage: "ka",
      mainEntityOfPage: url,
      url,
      publisher: {
        "@type": "Organization",
        name: BRAND.name,
        url: SITE_URL,
      },
      isPartOf: {
        "@type": "CollectionPage",
        name: "გზამკვლევები",
        url: `${SITE_URL}/guides`,
      },
    };
    const faqLd = buildGuideFaqJsonLd(guide);
    const scripts = [
      {
        type: "application/ld+json",
        children: JSON.stringify(articleLd),
      },
    ];
    if (faqLd) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify(faqLd),
      });
    }
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: GuideRoute,
});

function GuideRoute() {
  const { guide } = Route.useLoaderData();
  return <GuideArticlePage guide={guide} />;
}
