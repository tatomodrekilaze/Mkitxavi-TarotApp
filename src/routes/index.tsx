import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { StarField } from "@/components/StarField";
import { Header } from "@/components/Header";
import { Chat } from "@/components/Chat";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Onboarding } from "@/components/Onboarding";
import { Paywall } from "@/components/Paywall";
import { AuthPanel } from "@/components/AuthPanel";
import { ServicesPanel } from "@/components/ServicesPanel";
import { StreakPanel } from "@/components/StreakPanel";
import { Landing } from "@/components/Landing";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/link-preview";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      {
        title: SITE_TITLE,
      },
      {
        name: "description",
        content: SITE_DESCRIPTION,
      },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
});

function Index() {
  return (
    <AppProvider>
      <MysticApp />
    </AppProvider>
  );
}

function MysticApp() {
  const {
    ready,
    lang,
    user,
    authenticated,
    profileLoaded,
    refreshWallet,
    t,
    accountBanned,
    banReason,
    accountRestricted,
    opsFlags,
    opsAnnouncements,
    signOut,
  } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    params.delete("checkout");
    params.delete("plan");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);

    if (checkout === "success") {
      setCheckoutNotice(t("checkoutSuccess"));
      setPaywallOpen(true);
      // Whop webhook can lag a second or two - refresh a few times.
      void refreshWallet();
      window.setTimeout(() => void refreshWallet(), 1500);
      window.setTimeout(() => void refreshWallet(), 4000);
      window.setTimeout(() => void refreshWallet(), 8000);
    } else if (checkout === "cancelled") {
      setCheckoutNotice(t("checkoutCancelled"));
      setPaywallOpen(true);
    }
  }, [refreshWallet, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (!billing) return;
    params.delete("billing");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
    if (billing === "cancelled") {
      setCheckoutNotice(t("billingCancelled"));
      void refreshWallet();
      setPaywallOpen(true);
    }
  }, [refreshWallet, t]);

  // Login/logout must not leave settings/services drawers stuck on screen.
  // Do not force-close AuthPanel while signed out — Landing CTA and ?auth=1 need it.
  useEffect(() => {
    if (authenticated) {
      setAuthOpen(false);
      return;
    }
    setSettingsOpen(false);
    setPaywallOpen(false);
    setServicesOpen(false);
    setStreakOpen(false);
  }, [authenticated]);

  // Deep link: /?auth=1 opens login/register (used by content-page CTAs).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "1") return;
    params.delete("auth");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
    setAuthOpen(true);
  }, [authenticated]);

  // Public landing for Google branding / SEO - no language wall, no login wall.
  // Show landing whenever the user is not signed in (including SSR / auth
  // loading) so crawlers always see Mkitxavi branding, not the app chrome.
  // Language defaults to Georgian; change it in Settings after sign-in.
  const showLanding = !authenticated;
  const showOnboarding = ready && authenticated && profileLoaded && !user.registered;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <StarField />

      <div className="relative z-10 flex h-full flex-col">
        {authenticated && (
          <Header
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenServices={() => setServicesOpen(true)}
            onOpenStreak={() => setStreakOpen(true)}
          />
        )}
        <main className="min-h-0 flex-1 overflow-hidden">
          {opsAnnouncements
            .filter((a) => a.lang === "all" || a.lang === lang || !lang)
            .slice(0, 2)
            .map((a) => (
              <div
                key={a.id}
                className={`border-b px-4 py-2 text-center text-xs ${
                  a.level === "critical"
                    ? "border-red-500/40 bg-red-500/15 text-red-100"
                    : a.level === "warn"
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-50"
                      : "border-[#1877f2]/35 bg-[#1877f2]/12 text-sky-100"
                }`}
              >
                <p className="font-semibold">{a.title}</p>
                {a.body ? <p className="mt-0.5 opacity-90">{a.body}</p> : null}
              </div>
            ))}
          {showLanding && <Landing onStart={() => setAuthOpen(true)} />}
          {lang && authenticated && user.registered && accountBanned && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-serif text-2xl text-gold">Account suspended</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {banReason || "This account was restricted by Mkitxavi ops."}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-2 rounded-full border border-gold/40 px-4 py-2 text-xs uppercase tracking-widest text-gold"
              >
                Sign out
              </button>
            </div>
          )}
          {lang &&
            authenticated &&
            user.registered &&
            !accountBanned &&
            opsFlags.maintenanceMode && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-serif text-2xl text-gold">Maintenance</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Readings and chat are paused while we upgrade the cosmos. Try again shortly.
                </p>
              </div>
            )}
          {lang &&
            authenticated &&
            user.registered &&
            !accountBanned &&
            !opsFlags.maintenanceMode && (
              <>
                {accountRestricted && (
                  <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
                    Chat is temporarily restricted on this account.
                  </div>
                )}
                {!opsFlags.chatEnabled && (
                  <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
                    AI chat is temporarily offline.
                  </div>
                )}
                <Chat
                  onOpenPaywall={() => setPaywallOpen(true)}
                  onOpenServices={() => setServicesOpen(true)}
                />
              </>
            )}
        </main>
      </div>

      {showLanding && <AuthPanel open={authOpen} onClose={() => setAuthOpen(false)} />}

      {/* Likewise mandatory, the account exists but has no profile yet. */}
      <Onboarding open={showOnboarding} />

      <SettingsPanel
        open={settingsOpen && authenticated}
        onClose={() => setSettingsOpen(false)}
        onOpenPaywall={() => {
          setSettingsOpen(false);
          setPaywallOpen(true);
        }}
      />
      <Paywall
        open={paywallOpen && authenticated}
        onClose={() => {
          setPaywallOpen(false);
          setCheckoutNotice(null);
        }}
        externalNotice={checkoutNotice}
      />
      <ServicesPanel open={servicesOpen && authenticated} onClose={() => setServicesOpen(false)} />
      <StreakPanel open={streakOpen && authenticated} onClose={() => setStreakOpen(false)} />
    </div>
  );
}
