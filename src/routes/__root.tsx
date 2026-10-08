import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/client-error";
import { loadAdSenseScript, preloadRewardedAds } from "../lib/ads";
import {
  OG_IMAGE_URL,
  SITE_DESCRIPTION,
  SITE_IMAGE_ALT,
  SITE_TITLE,
  SITE_URL,
} from "../lib/link-preview";
import { buildSiteJsonLd } from "../lib/seo-brand";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.38_0.15_300_/_0.4),transparent_70%)]" />
      <div className="glass-purple relative z-10 w-full max-w-md rounded-[28px] px-6 py-10 text-center">
        <p className="font-serif text-6xl leading-none text-gradient-gold-live sm:text-7xl">404</p>
        <h1 className="mt-4 font-serif text-2xl text-foreground">გვერდი ვერ მოიძებნა</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          ეს გვერდი არ არსებობს ან გადატანილია. მარია მთავარ გვერდზე გელოდება.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          This page does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-soft px-7 text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_44px_-16px_oklch(0.72_0.14_88_/_0.85)]"
        >
          მარიასთან დაბრუნება
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.38_0.15_300_/_0.4),transparent_70%)]" />
      <div className="glass-purple relative z-10 w-full max-w-md rounded-[28px] px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-2xl text-gold">
          🕯️
        </div>
        <h1 className="mt-4 font-serif text-2xl text-gradient-gold">გვერდი ვერ ჩაიტვირთა</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          რამე ხარვეზი მოხდა ჩვენს მხარეს. სცადე თავიდან ან დაბრუნდი მთავარ გვერდზე.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-soft px-6 text-sm font-bold tracking-wide text-obsidian shadow-[0_16px_44px_-16px_oklch(0.72_0.14_88_/_0.85)]"
          >
            კიდევ სცადე
          </button>
          <a
            href="/"
            className="glass-dark inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground/85 ring-1 ring-white/10 transition-colors hover:text-gold hover:ring-gold/30"
          >
            მარიასთან დაბრუნება
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: "Mkitxavi" },
      {
        name: "keywords",
        content:
          "ონლაინ ტარო, online tarot, უფასო ტარო, free tarot, free taro, უფასო მკითხაობა, free reading, მკითხაობა, reading, სიყვარულზე მკითხაობა, love reading, ზოდიაქოების თავსებადობა, zodiac compatibility, პერსონალიტის ტესტები, personality tests, ყოველდღიური ტარო, everyday tarot, everyday taro, mkitxavi, მკითხავი, მარია, Maria",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "googlebot", content: "index, follow" },
      { name: "theme-color", content: "#0A0710" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Mkitxavi" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:site_name", content: "Mkitxavi.com" },
      { property: "og:locale", content: "ka_GE" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:secure_url", content: OG_IMAGE_URL },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:alt", content: SITE_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
      { name: "twitter:image:alt", content: SITE_IMAGE_ALT },
      { itemProp: "name", content: SITE_TITLE },
      { itemProp: "description", content: SITE_DESCRIPTION },
      { itemProp: "image", content: OG_IMAGE_URL },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Manrope:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "image_src", href: OG_IMAGE_URL },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const siteJsonLd = buildSiteJsonLd();

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ka">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body>
        {/* Fine grain over the fixed background gradients, removes banding. */}
        <div aria-hidden className="grain-layer fixed inset-0 z-0" />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    loadAdSenseScript();
    preloadRewardedAds();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {/* Render the current route inside the shared app shell. */}
        <Outlet />
      </MotionConfig>
    </QueryClientProvider>
  );
}
