import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal-content";
import { SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/terms")({
  component: () => <LegalPage docs={TERMS} />,
  head: () => ({
    meta: [{ title: "Terms of Service · Mkitxavi" }, { name: "robots", content: "index, follow" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms` }],
  }),
});
