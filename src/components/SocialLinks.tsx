import { BRAND } from "@/lib/seo-brand";

const LINKS = [
  { key: "tiktok", href: BRAND.social.tiktok, label: "TikTok" },
  { key: "instagram", href: BRAND.social.instagram, label: "Instagram" },
  { key: "facebook", href: BRAND.social.facebook, label: "Facebook" },
] as const;

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: (typeof LINKS)[number]["key"];
  className?: string;
}) {
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.2 8.2 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1-.1Z" />
      </svg>
    );
  }
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14 8.2V6.6c0-.7.1-1.1 1.1-1.1H17V3h-2.3C11.9 3 11 4.6 11 6.4v1.8H9v2.6h2V21h3v-10.2h2.3l.3-2.6H14Z" />
    </svg>
  );
}

export function SocialLinks({
  className = "",
}: {
  className?: string;
  /** Kept for call-site compatibility; icons are always circular. */
  compact?: boolean;
}) {
  return (
    <nav
      aria-label="Social media"
      className={`flex flex-wrap items-center justify-center gap-3 ${className}`}
    >
      {LINKS.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-transparent text-gold transition-colors hover:border-gold/50 hover:bg-gold/10"
        >
          <Icon name={link.key} className="h-[18px] w-[18px]" />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </nav>
  );
}
