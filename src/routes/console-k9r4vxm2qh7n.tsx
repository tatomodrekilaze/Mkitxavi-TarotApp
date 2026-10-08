import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { OpsUltraDashboard } from "@/components/ops/OpsUltraDashboard";
import {
  opsCheckGate,
  opsGetSession,
  opsLogin,
  opsLogoutFn,
  opsUnlockGate,
} from "@/lib/ops-console";
import type { OpsStaffUser } from "@/lib/ops-console-shared";

export const Route = createFileRoute("/console-k9r4vxm2qh7n")({
  head: () => ({
    meta: [{ title: "Not Found" }, { name: "robots", content: "noindex, nofollow, noarchive" }],
  }),
  component: OpsConsolePage,
});

type Phase = "boot" | "gate" | "login" | "pending" | "dash";

function OpsConsolePage() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [staff, setStaff] = useState<OpsStaffUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const gate = await opsCheckGate();
        if (cancelled) return;
        if (!gate.open) {
          setPhase("gate");
          return;
        }
        const session = await opsGetSession();
        if (cancelled) return;
        if (session.staff) {
          setStaff(session.staff);
          setPhase("dash");
          return;
        }
        setPhase("login");
      } catch {
        if (!cancelled) setPhase("gate");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onUnlockGate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const unlocked = await opsUnlockGate({ data: { gate: gateCode } });
      if (!unlocked.ok) {
        setError("Invalid access code.");
        return;
      }
      setGateCode("");
      const session = await opsGetSession();
      if (session.staff) {
        setStaff(session.staff);
        setPhase("dash");
        return;
      }
      setPhase("login");
    } catch {
      setError("Could not unlock.");
    } finally {
      setBusy(false);
    }
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await opsLogin({ data: { username, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.status === "pending_ip") {
        setPendingMsg(result.message);
        setPhase("pending");
        return;
      }
      setStaff(result.staff);
      setPhase("dash");
      setPassword("");
    } catch {
      setError("Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await opsLogoutFn();
    setStaff(null);
    setPhase("login");
  };

  if (phase === "boot") {
    return <div className="min-h-[100dvh] bg-[#0b0d10]" />;
  }

  if (phase === "gate") {
    return (
      <Shell>
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b93a7]">
            Restricted
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Access required</h1>
          <form onSubmit={onUnlockGate} className="mt-5 space-y-3">
            <label className="block text-xs text-[#8b93a7]">
              Access code
              <input
                type="password"
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-[#343b4a] bg-[#0b0d10] px-3 py-2.5 text-sm text-white outline-none focus:border-[#1877f2]"
              />
            </label>
            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !gateCode.trim()}
              className="w-full rounded-md bg-[#1877f2] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>
        </Card>
      </Shell>
    );
  }

  if (phase === "pending") {
    return (
      <Shell>
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-400/90">
            IP authorization required
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Approve this login</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8b93a7]">
            {pendingMsg ||
              "New IP detected. Approve via Discord (Ops Console alert) or email Allow link, then sign in again."}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("login");
              setPendingMsg(null);
            }}
            className="mt-6 w-full rounded-md bg-[#1877f2] px-3 py-2.5 text-sm font-semibold text-white"
          >
            Back to login
          </button>
        </Card>
      </Shell>
    );
  }

  if (phase === "login") {
    return (
      <Shell>
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1877f2]">
            Classic Ultra · Restricted
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Ops Console</h1>
          <form onSubmit={onLogin} className="mt-5 space-y-3">
            <label className="block text-xs text-[#8b93a7]">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-[#343b4a] bg-[#0b0d10] px-3 py-2.5 text-sm text-white outline-none focus:border-[#1877f2]"
              />
            </label>
            <label className="block text-xs text-[#8b93a7]">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-[#343b4a] bg-[#0b0d10] px-3 py-2.5 text-sm text-white outline-none focus:border-[#1877f2]"
              />
            </label>
            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[#1877f2] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Checking…" : "Enter console"}
            </button>
          </form>
        </Card>
      </Shell>
    );
  }

  if (!staff) return <div className="min-h-[100dvh] bg-[#0b0d10]" />;

  return <OpsUltraDashboard staff={staff} onLogout={() => void onLogout()} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0d10] px-4 py-10">
      {children}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-[#2a2f3a] bg-[#12151a] p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
      {children}
    </div>
  );
}
