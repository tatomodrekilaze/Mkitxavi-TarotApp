import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { adsenseClientId, adsenseSlotId, loadAdSenseScript } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface Props {
  className?: string;
  /** Bump to force a fresh push (e.g. each watch session). */
  refreshKey?: number | string;
  /** Fullscreen rewarded watch uses a tall fluid unit. */
  variant?: "inline" | "fullscreen";
}

/**
 * Google AdSense display unit (Maria Watch Ad slot).
 * Fullscreen variant uses a light box + delayed push so the slot has real size.
 */
export function AdSenseUnit({ className, refreshKey = 0, variant = "inline" }: Props) {
  const { opsFlags } = useApp();
  const client = adsenseClientId();
  const slot = adsenseSlotId();
  const hostRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    if (!opsFlags.adsEnabled || !client || !slot) return;
    pushed.current = false;
    setStatus("loading");
    loadAdSenseScript();

    let cancelled = false;
    let tries = 0;

    const tryPush = () => {
      if (cancelled || pushed.current) return;
      const host = hostRef.current;
      const ins = host?.querySelector("ins.adsbygoogle") as HTMLElement | null;
      if (!host || !ins) return;

      const w = host.getBoundingClientRect().width;
      if (w < 250 && tries < 20) {
        tries += 1;
        window.setTimeout(tryPush, 100);
        return;
      }

      try {
        pushed.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* AdSense may throw if blocked / already filled */
      }

      // Detect empty fill after Google has a moment to render.
      window.setTimeout(() => {
        if (cancelled) return;
        const h = ins.offsetHeight;
        const statusAttr = ins.getAttribute("data-ad-status");
        if (statusAttr === "unfilled" || h < 40) setStatus("empty");
        else setStatus("ready");
      }, 2500);
    };

    const start = window.setTimeout(tryPush, variant === "fullscreen" ? 400 : 150);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [client, slot, refreshKey, variant, opsFlags.adsEnabled]);

  if (!opsFlags.adsEnabled || !client || !slot) return null;

  const style =
    variant === "fullscreen"
      ? {
          display: "block",
          width: "100%",
          minWidth: "300px",
          minHeight: "250px",
          height: "250px",
        }
      : { display: "block", width: "100%", minHeight: "90px" };

  return (
    <div
      ref={hostRef}
      className={className}
      key={`${slot}-${variant}-${refreshKey}`}
      style={
        variant === "fullscreen" ? { width: "100%", minHeight: 250, background: "#fff" } : undefined
      }
    >
      {variant === "fullscreen" && status === "loading" && (
        <p className="pointer-events-none absolute left-0 right-0 top-3 text-center text-xs text-black/50">
          …
        </p>
      )}
      {variant === "fullscreen" && status === "empty" && (
        <p className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 px-2 text-center text-sm leading-snug text-black/65">
          {import.meta.env.DEV
            ? "No ad fill on localhost. Finish the timer - energy still unlocks."
            : "Google has no ad to show yet (site review / low inventory). Keep the timer running - you still get energy."}
        </p>
      )}
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={variant === "fullscreen" ? "rectangle" : "auto"}
        data-full-width-responsive={variant === "fullscreen" ? "false" : "true"}
        {...(import.meta.env.DEV ? { "data-adtest": "on" } : {})}
      />
    </div>
  );
}
