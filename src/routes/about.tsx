import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { ABOUT_DOCS } from "@/lib/about-content";
import { SITE_URL } from "@/lib/link-preview";
import { BRAND } from "@/lib/seo-brand";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: `უფასო ონლაინ ტარო და მკითხაობა მარიასთან | ${BRAND.name}`,
      },
      {
        name: "description",
        content:
          "Mkitxavi.com: უფასო ონლაინ ტარო, უფასო მკითხაობა, სიყვარულზე მკითხაობა, ზოდიაქოების თავსებადობა და პიროვნების ტესტები მარიასთან. ოფიციალური საიტი მხოლოდ mkitxavi.com (არა mkitxavi.ge).",
      },
      {
        property: "og:title",
        content: "უფასო ონლაინ ტარო მარიასთან. Mkitxavi.com",
      },
      {
        property: "og:description",
        content: BRAND.disambiguationKa,
      },
      { property: "og:url", content: `${SITE_URL}/about` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: () => <LegalPage docs={ABOUT_DOCS} />,
});
