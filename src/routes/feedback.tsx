import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/ContactPage";
import { SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/feedback")({
  component: () => <ContactPage kind="feedback" />,
  head: () => ({
    meta: [{ title: "Feedback · Mkitxavi" }, { name: "robots", content: "index, follow" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/feedback` }],
  }),
});
