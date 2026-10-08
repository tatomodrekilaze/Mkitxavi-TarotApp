/** Hours until free daily_cap energy returns after balance hits 0. */
export const FREE_ENERGY_COOLDOWN_HOURS = 12;

/** Format remaining ms as HH:MM:SS (or H:MM:SS when over a day is unlikely). */
export function formatEnergyCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function msUntil(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, t - now);
}
