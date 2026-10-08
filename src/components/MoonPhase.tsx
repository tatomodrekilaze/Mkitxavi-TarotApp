import { useEffect, useState } from "react";
import { getMoonPhase, resolveMoonPhase, type MoonInfo } from "@/lib/moon";
import { useApp } from "@/context/AppContext";

export function MoonPhase({ size = 34, showLabel = true }: { size?: number; showLabel?: boolean }) {
  const { lang, t } = useApp();
  const [info, setInfo] = useState<MoonInfo>(() => getMoonPhase());

  useEffect(() => {
    let cancelled = false;
    void resolveMoonPhase().then((next) => {
      if (!cancelled) setInfo(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = info.names[lang ?? "en"];
  const tip = [
    `${t("moonPhase")}: ${name}`,
    info.localTime ? `${info.localDate} ${info.localTime}` : null,
    t("moonIllumination").replace("{n}", String(info.illumination)),
  ]
    .filter(Boolean)
    .join(" · ");

  const illum = info.illumination;
  const waxing = info.phase <= 0.5;

  return (
    <div className="group relative flex items-center gap-2" title={tip}>
      <div
        className="relative shrink-0 rounded-full animate-pulse-glow"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 50% 40%, #2a2540, #0c0a16)",
          boxShadow: "0 0 14px -2px oklch(0.85 0.1 90 / 0.55), inset 0 0 6px oklch(0 0 0 / 0.8)",
          border: "1px solid oklch(0.78 0.14 88 / 0.4)",
          overflow: "hidden",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 42% 38%, #fef6d8, #e9d391 55%, #b89544 100%)",
            clipPath: waxing ? `inset(0 0 0 ${100 - illum}%)` : `inset(0 ${100 - illum}% 0 0)`,
            opacity: 0.95,
          }}
        />
      </div>
      {showLabel && (
        <span className="hidden min-w-0 md:block">
          <span className="truncate text-xs font-medium tracking-wide text-gold/85">{name}</span>
        </span>
      )}
    </div>
  );
}
