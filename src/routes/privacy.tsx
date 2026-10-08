import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal-content";
import { SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/privacy")({
  component: () => <LegalPage docs={PRIVACY} />,
  head: () => ({
    meta: [{ title: "Privacy Policy · Mkitxavi" }, { name: "robots", content: "index, follow" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
});
