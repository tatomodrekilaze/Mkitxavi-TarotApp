import { useEffect, useState } from "react";

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  delay: number;
  dur: number;
}

export function StarField() {
  const [stars, setStars] = useState<Star[]>([]);

  // Generate on the client only to avoid SSR hydration mismatches.
  useEffect(() => {
    setStars(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        dur: Math.random() * 3 + 2,
      })),
    );
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-gold animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            boxShadow: "0 0 6px currentColor",
          }}
        />
      ))}
    </div>
  );
}
