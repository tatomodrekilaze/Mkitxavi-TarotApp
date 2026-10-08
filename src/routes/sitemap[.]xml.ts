import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { GUIDE_SLUGS } from "@/lib/guide-content";
import { TAROT_DECK } from "@/lib/tarot";

const BASE_URL = "https://mkitxavi.com";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
  /** Optional card art for image sitemap extension. */
  image?: { loc: string; title: string };
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const lastmod = new Date().toISOString().slice(0, 10);

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/tarot", changefreq: "weekly", priority: "0.95" },
          { path: "/guides", changefreq: "weekly", priority: "0.9" },
          { path: "/about", changefreq: "weekly", priority: "0.85" },
          ...GUIDE_SLUGS.map((slug) => ({
            path: `/guides/${slug}`,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...TAROT_DECK.map((card) => ({
            path: `/tarot/${card.key}`,
            changefreq: "monthly" as const,
            priority: "0.7",
            image: {
              loc: `${BASE_URL}${card.image}`,
              title: `${card.names.ka} / ${card.names.en}`,
            },
          })),
          { path: "/support", changefreq: "weekly", priority: "0.5" },
          { path: "/feedback", changefreq: "weekly", priority: "0.5" },
          { path: "/terms", changefreq: "monthly", priority: "0.4" },
          { path: "/privacy", changefreq: "monthly", priority: "0.4" },
          { path: "/guidelines", changefreq: "monthly", priority: "0.4" },
        ];

        const urls = entries.map((e) => {
          const lines = [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
          ];
          if (e.image) {
            lines.push(
              `    <image:image>`,
              `      <image:loc>${escapeXml(e.image.loc)}</image:loc>`,
              `      <image:title>${escapeXml(e.image.title)}</image:title>`,
              `    </image:image>`,
            );
          }
          lines.push(`  </url>`);
          return lines.filter(Boolean).join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
