import { motion, AnimatePresence } from "framer-motion";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function OpsShell({
  sidebar,
  topbar,
  flash,
  children,
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  flash: string | null;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#05070c] text-[#e8eaed]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(24,119,242,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_40%),radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.05),transparent_35%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10 flex min-h-[100dvh] w-full">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {topbar}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-[#1877f2]/40 bg-[#1877f2]/12 px-4 py-2 text-xs text-[#cfe0ff]"
              >
                {flash}
              </motion.div>
            )}
          </AnimatePresence>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <FadeIn>{children}</FadeIn>
          </main>
        </div>
      </div>
    </div>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Panel({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border border-white/[0.07] bg-[#0c111a]/92 p-4 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl ${className || ""}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <h3 className="text-[13px] font-semibold tracking-tight text-white">{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "green" | "amber" | "red";
}) {
  const ring =
    accent === "green"
      ? "from-emerald-500/25"
      : accent === "amber"
        ? "from-amber-500/25"
        : accent === "red"
          ? "from-red-500/25"
          : "from-[#1877f2]/30";
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`rounded-2xl border border-white/[0.07] bg-gradient-to-br ${ring} via-transparent to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#7b8498]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[#667085]">{hint}</p>}
    </motion.div>
  );
}

export function Spark({
  data,
  color = "#1877f2",
}: {
  data: Array<{ day: string; count: number }>;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-28 items-end gap-[3px]">
      {data.map((d, i) => (
        <motion.div
          key={d.day}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.02, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="origin-bottom flex-1 rounded-sm"
          style={{
            height: `${Math.max(4, (d.count / max) * 100)}%`,
            background: `linear-gradient(to top, ${color}, ${color}aa)`,
            opacity: 0.4 + (d.count / max) * 0.6,
          }}
          title={`${d.day}: ${d.count}`}
        />
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "red" | "amber" | "green" | "blue" | "neutral";
}) {
  const cls =
    tone === "red"
      ? "bg-red-500/15 text-red-300 ring-red-500/20"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-300 ring-amber-500/20"
        : tone === "green"
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
          : tone === "blue"
            ? "bg-[#1877f2]/15 text-[#9ec1ff] ring-[#1877f2]/25"
            : "bg-white/5 text-[#a7b0c0] ring-white/10";
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  tone = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger" | "ghost";
  type?: "button" | "submit";
}) {
  const cls =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500 shadow-[0_8px_24px_-12px_rgba(239,68,68,0.7)]"
      : tone === "ghost"
        ? "border border-white/10 text-[#c5cad3] hover:border-[#1877f2]/50 hover:bg-white/[0.03]"
        : "bg-[#1877f2] text-white hover:bg-[#166fe5] shadow-[0_8px_24px_-12px_rgba(24,119,242,0.8)]";
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-45 ${cls}`}
    >
      {children}
    </motion.button>
  );
}

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-white/10 bg-[#0a0e16] px-2.5 py-2 text-sm text-white outline-none placeholder:text-[#5c6578] transition focus:border-[#1877f2]/60 focus:shadow-[0_0_0_3px_rgba(24,119,242,0.15)] ${props.className || ""}`}
    />
  );
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-[#0a0e16] px-2.5 py-2 text-sm text-white outline-none placeholder:text-[#5c6578] transition focus:border-[#1877f2]/60 focus:shadow-[0_0_0_3px_rgba(24,119,242,0.15)] ${props.className || ""}`}
    />
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-[#1877f2] text-white shadow-[0_0_0_1px_rgba(24,119,242,0.45),0_8px_20px_-10px_rgba(24,119,242,0.8)]"
          : "border border-white/10 text-[#8b93a7] hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function Meta({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[#667085]">{k}</dt>
          <dd className="truncate text-[#d0d4dc]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
      <p className="text-sm font-medium text-[#c5cad3]">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[11px] text-[#667085]">{hint}</p>}
    </div>
  );
}
