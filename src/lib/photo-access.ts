/** Photo readings (coffee / palm) unlock for paid or ops-comp accounts. */
export function canUsePhotoUpload(opts: {
  energyUnlimited?: boolean;
  plan?: string | null;
  status?: string | null;
  isComp?: boolean;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}): boolean {
  if (opts.energyUnlimited) return true;
  if (opts.isComp) return true;
  const plan = opts.plan ?? "none";
  const status = opts.status ?? "none";
  const paid = plan === "mystic" || plan === "ascended";
  if (!paid) return false;
  if (status === "active" || status === "trialing") return true;
  if (status === "cancelled" && opts.cancelAtPeriodEnd) return true;
  if (opts.periodEnd && Date.parse(opts.periodEnd) > Date.now()) return true;
  return false;
}
