import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { GUIDELINES } from "@/lib/legal-content";
import { SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/guidelines")({
  component: () => <LegalPage docs={GUIDELINES} />,
  head: () => ({
    meta: [
      { title: "Community and Acceptable Use Guidelines · Mkitxavi" },
      {
        name: "description",
        content:
          "Community and Acceptable Use Guidelines for Mkitxavi.com: prohibited content, protection of minors, safety, integrity of the automated system, and enforcement.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guidelines` }],
  }),
});
