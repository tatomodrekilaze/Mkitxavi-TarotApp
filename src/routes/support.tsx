import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/ContactPage";
import { SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/support")({
  component: () => <ContactPage kind="support" />,
  head: () => ({
    meta: [{ title: "Support · Mkitxavi" }, { name: "robots", content: "index, follow" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/support` }],
  }),
});
