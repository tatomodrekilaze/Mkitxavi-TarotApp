import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { reportAdminIntrusion } from "@/lib/admin-trap";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getVisitorProbe, type VisitorProbe } from "@/lib/visitor-probe";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel · Mkitxavi" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      {
        name: "description",
        content: "Restricted administration console.",
      },
    ],
  }),
  component: AdminPortal,
});

type Phase = "login" | "accounts" | "dial" | "call" | "clip" | "credits";

const ACCOUNTS = [
  { id: "tato", name: "Tato", role: "Superadmin" },
  { id: "temo", name: "Temo", role: "Superadmin" },
  { id: "maria", name: "Maria", role: "Superadmin" },
] as const;

const DIAL_NUMBER = "8080";
const CALL_LABEL = "Honeypot";
const CLIP_SRC = "/ops-clip-8080.mp4";
const SANDRO_IP = "185.70.53.167";
const SANDRO_TXT = `section .data
    msg db "Hello, Sandro", 10
    len equ $ - msg

section .text
    global _start

_start:
    mov rax, 1
    mov rdi, 1
    mov rsi, msg
    mov rdx, len
    syscall

    mov rax, 60
    mov rdi, 0
    syscall
`;

function sessionSeeds(): Set<string> {
  const raw =
    "YWRtaW4KcGFzc3dvcmQKcGFzc3dvcmQxCnBhc3MKcm9vdAp0b29yCmFkbWluaXN0cmF0b3IKYWRtaW4xMjMKYWRtaW4xCmFkbWluMTIKYWRtaW4xMjM0CjEyMzQKMTIzNDUKMTIzNDU2CjEyMzQ1NjcKMTIzNDU2NzgKMTIzNDU2Nzg5CjEyMzQ1Njc4OTAKMDAwMAowMDAwMDAKMTExMQoxMTExMTEKcXdlcnR5CnF3ZXJ0eTEyMwpsZXRtZWluCndlbGNvbWUKbWFzdGVyCmxvZ2luCnRlc3QKZ3Vlc3QKdXNlcgpkZWZhdWx0CmNoYW5nZW1lCnNlY3JldApwYXNzdzByZApwQHNzdzByZAphZG1pbkAxMjMKcm9vdDEyMwp0b29yMTIzCm1raXR4YXZpCm1hcmlhCm5pbmEKc3VwZXJtYW4KaWxvdmV5b3UKYWJjMTIzCm1vbmtleQpkcmFnb24Kc3Vuc2hpbmUKcHJpbmNlc3MKZm9vdGJhbGwKYmFzZWJhbGwKc2hhZG93CnRydXN0bm8xCmh1bnRlcjI=";
  try {
    return new Set(atob(raw).split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Classic phone keypad DTMF-ish beep. */
function playKeyTone(digit: string) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const map: Record<string, [number, number]> = {
      "0": [941, 1336],
      "1": [697, 1209],
      "2": [697, 1336],
      "3": [697, 1477],
      "4": [770, 1209],
      "5": [770, 1336],
      "6": [770, 1477],
      "7": [852, 1209],
      "8": [852, 1336],
      "9": [852, 1477],
    };
    const [f1, f2] = map[digit] ?? [800, 1200];
    const now = ctx.currentTime;
    for (const f of [f1, f2]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
    window.setTimeout(() => void ctx.close(), 250);
  } catch {
    /* ignore */
  }
}

/** Ringback / calling tone loop. Returns a stop function. */
function startCallingTone(): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;
  let timer: number | null = null;

  const ringOnce = () => {
    if (stopped) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const now = ctx.currentTime;
      const makeBeep = (start: number, dur: number) => {
        const osc = ctx!.createOscillator();
        const g = ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        const osc2 = ctx!.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = 480;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        g.gain.setValueAtTime(0.18, start + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(g);
        osc2.connect(g);
        g.connect(ctx!.destination);
        osc.start(start);
        osc2.start(start);
        osc.stop(start + dur);
        osc2.stop(start + dur);
      };
      // US-style ringback: 2s on, 4s off pattern compressed for effect
      makeBeep(now, 0.9);
      makeBeep(now + 1.1, 0.9);
      timer = window.setTimeout(() => {
        void ctx?.close();
        if (!stopped) ringOnce();
      }, 3200);
    } catch {
      /* ignore */
    }
  };

  ringOnce();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    void ctx?.close();
  };
}

async function harvestClientIntel(): Promise<Array<[string, string]>> {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
      type?: string;
    };
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>;
      mobile?: boolean;
      platform?: string;
      getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
    };
    getBattery?: () => Promise<{
      charging: boolean;
      level: number;
      chargingTime: number;
      dischargingTime: number;
    }>;
    keyboard?: unknown;
    pdfViewerEnabled?: boolean;
  };
  const scr = screen;
  const conn = nav.connection;
  const rows: Array<[string, string]> = [];
  const add = (k: string, v: unknown) =>
    rows.push([k, v == null || v === "" ? "unknown" : String(v)]);

  add("User-Agent", nav.userAgent);
  add("Platform", nav.platform);
  add("Vendor", nav.vendor);
  add("App Name", nav.appName);
  add("App Version", nav.appVersion);
  add("Product", nav.product);
  add("Product Sub", nav.productSub);
  add("Language", nav.language);
  add("Languages", (nav.languages || []).join(", "));
  add("Cookies Enabled", nav.cookieEnabled);
  add("Do Not Track", nav.doNotTrack);
  add("Online", nav.onLine);
  add("Hardware Concurrency", nav.hardwareConcurrency);
  add("Device Memory (GB)", nav.deviceMemory);
  add("Max Touch Points", nav.maxTouchPoints);
  add("PDF Viewer", nav.pdfViewerEnabled);
  add("Webdriver", (nav as Navigator & { webdriver?: boolean }).webdriver);

  add("Screen Width", scr.width);
  add("Screen Height", scr.height);
  add("Avail Width", scr.availWidth);
  add("Avail Height", scr.availHeight);
  add("Color Depth", scr.colorDepth);
  add("Pixel Depth", scr.pixelDepth);
  add("Orientation", scr.orientation?.type);
  add("Orientation Angle", scr.orientation?.angle);
  add("Device Pixel Ratio", window.devicePixelRatio);
  add("Inner Width", window.innerWidth);
  add("Inner Height", window.innerHeight);
  add("Outer Width", window.outerWidth);
  add("Outer Height", window.outerHeight);
  add("Screen X", window.screenX);
  add("Screen Y", window.screenY);
  add("Scroll X", window.scrollX);
  add("Scroll Y", window.scrollY);
  add("Visual Viewport W", window.visualViewport?.width);
  add("Visual Viewport H", window.visualViewport?.height);
  add("Visual Viewport Scale", window.visualViewport?.scale);

  const tz = Intl.DateTimeFormat().resolvedOptions();
  add("Timezone", tz.timeZone);
  add("Locale", tz.locale);
  add("Calendar", tz.calendar);
  add("Numbering System", tz.numberingSystem);
  add("Timezone Offset (min)", new Date().getTimezoneOffset());
  add("Local Time", new Date().toString());
  add("ISO Time", new Date().toISOString());
  add("Unix Timestamp", Date.now());

  add("Connection Type", conn?.effectiveType);
  add("Connection Kind", conn?.type);
  add("Downlink (Mb/s)", conn?.downlink);
  add("RTT (ms)", conn?.rtt);
  add("Save Data", conn?.saveData);

  add("Document URL", document.URL);
  add("Document Title", document.title);
  add("Document Referrer", document.referrer || "direct");
  add("Document Domain", document.domain);
  add("Document Visibility", document.visibilityState);
  add("Character Set", document.characterSet);
  add("Compat Mode", document.compatMode);
  add("History Length", history.length);

  add(
    "LocalStorage",
    (() => {
      try {
        localStorage.setItem("__p", "1");
        localStorage.removeItem("__p");
        return `yes (${localStorage.length} keys)`;
      } catch {
        return "blocked";
      }
    })(),
  );
  add(
    "SessionStorage",
    (() => {
      try {
        return `yes (${sessionStorage.length} keys)`;
      } catch {
        return "blocked";
      }
    })(),
  );
  add("IndexedDB", "indexedDB" in window ? "yes" : "no");
  add("Service Worker", "serviceWorker" in nav ? "yes" : "no");
  add("SharedWorker", "SharedWorker" in window ? "yes" : "no");
  add("Notification Perm", typeof Notification !== "undefined" ? Notification.permission : "n/a");

  if (nav.userAgentData) {
    add(
      "UA Brands",
      (nav.userAgentData.brands || []).map((b) => `${b.brand} ${b.version}`).join(", "),
    );
    add("UA Mobile", nav.userAgentData.mobile);
    add("UA Platform Hint", nav.userAgentData.platform);
    try {
      const hi = await nav.userAgentData.getHighEntropyValues?.([
        "architecture",
        "bitness",
        "model",
        "platformVersion",
        "fullVersionList",
        "wow64",
      ]);
      if (hi) {
        for (const [k, v] of Object.entries(hi)) {
          add(
            `UA ${k}`,
            Array.isArray(v)
              ? (v as Array<{ brand: string; version: string }>)
                  .map((b) => `${b.brand} ${b.version}`)
                  .join(", ")
              : v,
          );
        }
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const c = canvas.getContext("2d");
    if (c) {
      c.textBaseline = "top";
      c.font = "14px Arial";
      c.fillStyle = "#f60";
      c.fillRect(0, 0, 240, 60);
      c.fillStyle = "#069";
      c.fillText("mkitxavi-ops-probe", 4, 18);
      const data = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < data.length; i++) hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
      add("Canvas Fingerprint", hash.toString(16));
    }
  } catch {
    add("Canvas Fingerprint", "blocked");
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      add("WebGL Vendor", gl.getParameter(gl.VENDOR));
      add("WebGL Renderer", gl.getParameter(gl.RENDERER));
      if (dbg) {
        add("WebGL Unmasked Vendor", gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
        add("WebGL Unmasked Renderer", gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
      }
      add("WebGL Version", gl.getParameter(gl.VERSION));
      add("GLSL Version", gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    } else add("WebGL", "unavailable");
  } catch {
    add("WebGL", "blocked");
  }

  try {
    if (nav.getBattery) {
      const b = await nav.getBattery();
      add("Battery Charging", b.charging);
      add("Battery Level", `${Math.round(b.level * 100)}%`);
      add("Battery Charge Time", b.chargingTime);
      add("Battery Discharge Time", b.dischargingTime);
    }
  } catch {
    /* ignore */
  }

  try {
    if (nav.mediaDevices?.enumerateDevices) {
      const devices = await nav.mediaDevices.enumerateDevices();
      add("Media Devices", devices.length);
      add("Audio Inputs", devices.filter((d) => d.kind === "audioinput").length);
      add("Audio Outputs", devices.filter((d) => d.kind === "audiooutput").length);
      add("Video Inputs", devices.filter((d) => d.kind === "videoinput").length);
    }
  } catch {
    add("Media Devices", "blocked");
  }

  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      add("Storage Quota (bytes)", est.quota);
      add("Storage Usage (bytes)", est.usage);
    }
  } catch {
    /* ignore */
  }

  add(
    "Plugins",
    Array.from(nav.plugins || [])
      .map((p) => p.name)
      .join(", ") || "none",
  );
  add("Mime Types", nav.mimeTypes?.length ?? "unknown");
  add("CSS Dark Pref", window.matchMedia("(prefers-color-scheme: dark)").matches);
  add("Reduced Motion", window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  add("Hover Fine", window.matchMedia("(hover: hover)").matches);
  add("Pointer Fine", window.matchMedia("(pointer: fine)").matches);
  const perfMem = performance as Performance & {
    memory?: { jsHeapSizeLimit?: number; totalJSHeapSize?: number; usedJSHeapSize?: number };
  };
  add("JS Heap Limit", perfMem.memory?.jsHeapSizeLimit ?? "n/a");
  add("JS Heap Total", perfMem.memory?.totalJSHeapSize ?? "n/a");
  add("JS Heap Used", perfMem.memory?.usedJSHeapSize ?? "n/a");
  add("Page Load Entries", performance.getEntriesByType?.("navigation")?.length ?? "n/a");

  try {
    const perms = (
      navigator as Navigator & {
        permissions?: { query: (d: { name: string }) => Promise<{ state: string }> };
      }
    ).permissions;
    if (perms?.query) {
      for (const name of [
        "geolocation",
        "notifications",
        "camera",
        "microphone",
        "clipboard-read",
        "push",
      ]) {
        try {
          const st = await perms.query({ name });
          add(`Permission:${name}`, st.state);
        } catch {
          /* unsupported name */
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const voices = window.speechSynthesis?.getVoices?.() ?? [];
    add("Speech Voices", voices.length || "0");
    add(
      "Speech Voice Names",
      voices
        .slice(0, 8)
        .map((v) => v.name)
        .join(", ") || "none",
    );
  } catch {
    /* ignore */
  }

  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const actx = new AC();
    add("Audio Sample Rate", actx.sampleRate);
    add("Audio State", actx.state);
    add(
      "Audio Base Latency",
      (actx as AudioContext & { baseLatency?: number }).baseLatency ?? "n/a",
    );
    void actx.close();
  } catch {
    add("Audio Context", "blocked");
  }

  try {
    const rtcIps = await collectRtcIps();
    add("WebRTC Local IPs", rtcIps.join(", ") || "none");
  } catch {
    add("WebRTC Local IPs", "blocked");
  }

  add("Window Name", window.name || "empty");
  add("Cross-Origin Isolated", String(crossOriginIsolated));
  add("Is Secure Context", String(window.isSecureContext));
  add("Vendor Flavors", detectVendorFlavors());

  return rows;
}

function detectVendorFlavors(): string {
  const w = window as unknown as Record<string, unknown>;
  const hits: string[] = [];
  for (const k of ["chrome", "safari", "opera", "brave", "netscape"]) {
    if (k in w) hits.push(k);
  }
  return hits.join(", ") || "none";
}

async function collectRtcIps(): Promise<string[]> {
  const ips = new Set<string>();
  const RTC =
    window.RTCPeerConnection ||
    (window as unknown as { webkitRTCPeerConnection?: typeof RTCPeerConnection })
      .webkitRTCPeerConnection;
  if (!RTC) return [];

  await new Promise<void>((resolve) => {
    const pc = new RTC({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const done = () => {
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      resolve();
    };
    pc.createDataChannel("x");
    pc.onicecandidate = (e) => {
      const cand = e.candidate?.candidate;
      if (!cand) return;
      const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9:]+)/i.exec(cand);
      if (m?.[1] && !m[1].endsWith(".local")) ips.add(m[1]);
    };
    void pc
      .createOffer()
      .then((o) => pc.setLocalDescription(o))
      .catch(() => done());
    window.setTimeout(done, 1200);
  });

  return Array.from(ips);
}

async function resolveSignedInEmail(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const emails = new Set<string>();
    if (user.email) emails.add(user.email);
    for (const id of user.identities ?? []) {
      const identityEmail =
        (id.identity_data?.email as string | undefined) ||
        (id.identity_data?.preferred_username as string | undefined);
      if (identityEmail?.includes("@")) emails.add(identityEmail);
    }
    for (const email of emails) {
      if (/@gmail\.com$/i.test(email) || /@googlemail\.com$/i.test(email)) return email;
    }
    return null;
  } catch {
    return null;
  }
}

function ipMatches(probe: VisitorProbe | null, target: string): boolean {
  if (!probe) return false;
  const hay = [probe.ip, probe.realIp, probe.forwardedFor].join(" ");
  return hay.includes(target);
}

/** Classic movie end-title lines — scare-relevant harvest dump. */
function scareCreditLines(
  probe: VisitorProbe | null,
  client: Array<[string, string]>,
  gmail: string | null,
): Array<[string, string]> {
  const get = (label: string) => {
    const v = client.find(([k]) => k === label)?.[1];
    if (v == null || v === "" || v === "unknown") return "UNKNOWN";
    return v;
  };
  const loc =
    probe?.latitude && probe?.longitude && probe.latitude !== "unknown"
      ? `${probe.latitude}, ${probe.longitude}`
      : "UNKNOWN";
  const maps =
    loc !== "UNKNOWN"
      ? `https://maps.google.com/?q=${probe!.latitude},${probe!.longitude}`
      : "UNKNOWN";
  const gpuRaw = get("WebGL Unmasked Renderer");
  const gpu = gpuRaw !== "UNKNOWN" ? gpuRaw : get("WebGL Renderer");
  const wifiRaw = get("Connection Kind");
  const wifi = wifiRaw !== "UNKNOWN" ? wifiRaw : get("Connection Type");
  const lines: Array<[string, string]> = [];
  const push = (role: string, name: string) => {
    const n = (name || "").trim();
    if (!n || n === "UNKNOWN" || n === "n/a" || n === "none" || n === "blocked") return;
    lines.push([role, n]);
  };

  if (gmail) push("Linked Gmail Account", gmail);

  push("Public IP Address", probe?.ip || get("WebRTC Local IPs") || "RESOLVING…");
  push("Real IP Header", probe?.realIp || "");
  push("Proxy / Forwarded Chain", probe?.forwardedFor || "");
  push("WebRTC Local Network IPs", get("WebRTC Local IPs"));
  push("Country Of Origin", probe?.country || "");
  push("Continent", probe?.continent || "");
  push("City They Are Sitting In", probe?.city || "");
  push("Region / State", probe?.region || "");
  push("Postal Code", probe?.postalCode || "");
  push("Internet Provider (ISP)", probe?.asOrganization || "");
  push("Exact GPS Coordinates", loc);
  push("Live Map Pin To Them", maps);
  push("Their Timezone", probe?.timezone || get("Timezone"));
  push("Local Clock On Their Machine", get("Local Time"));
  push("ISO Timestamp Captured", get("ISO Time"));
  push("Unix Epoch At Capture", get("Unix Timestamp"));
  push("Preferred Language", get("Language"));
  push("All Browser Languages", get("Languages"));
  push("Accept-Language Header", probe?.acceptLanguage || "");
  push("Full Device Fingerprint (UA)", get("User-Agent"));
  push("Browser Brand Stack", get("UA Brands"));
  push("Operating System Platform", get("Platform"));
  push("UA Platform Hint", get("UA Platform Hint"));
  push("Mobile Device Flag", get("UA Mobile"));
  push("Architecture", get("UA architecture"));
  push("Bitness", get("UA bitness"));
  push("Device Model Hint", get("UA model"));
  push("Platform Version", get("UA platformVersion"));
  push("Client Hints (sec-ch-ua)", probe?.secChUa || "");
  push("Client Hints Platform", probe?.secChUaPlatform || "");
  push("Screen Resolution", `${get("Screen Width")}×${get("Screen Height")}`);
  push("Available Desktop Area", `${get("Avail Width")}×${get("Avail Height")}`);
  push("Browser Viewport", `${get("Inner Width")}×${get("Inner Height")}`);
  push("Outer Window Size", `${get("Outer Width")}×${get("Outer Height")}`);
  push("Device Pixel Ratio", get("Device Pixel Ratio"));
  push("Color / Pixel Depth", `${get("Color Depth")} / ${get("Pixel Depth")}`);
  push("Screen Orientation", get("Orientation"));
  push(
    "GPU Vendor (Unmasked)",
    get("WebGL Unmasked Vendor") !== "UNKNOWN" ? get("WebGL Unmasked Vendor") : get("WebGL Vendor"),
  );
  push("GPU Renderer (Unmasked)", gpu);
  push("WebGL Version", get("WebGL Version"));
  push("Canvas Fingerprint Hash", get("Canvas Fingerprint"));
  push("Audio Sample Rate Fingerprint", get("Audio Sample Rate"));
  push("CPU Thread Count", get("Hardware Concurrency"));
  push("Device RAM (GB)", get("Device Memory (GB)"));
  push("Touch Points", get("Max Touch Points"));
  push("Battery Level Right Now", get("Battery Level"));
  push("Battery Charging State", get("Battery Charging"));
  push("Battery Time To Empty", get("Battery Discharge Time"));
  push("Network / Wi‑Fi Type", wifi);
  push("Connection Speed Class", get("Connection Type"));
  push("Downlink Mbps", get("Downlink (Mb/s)"));
  push("Network Latency RTT", get("RTT (ms)"));
  push("Data Saver Mode", get("Save Data"));
  push("Online Status", get("Online"));
  push("Cookies Enabled", get("Cookies Enabled"));
  push(
    "Do Not Track (ignored)",
    get("Do Not Track") !== "UNKNOWN" ? get("Do Not Track") : probe?.dnt || "",
  );
  push("LocalStorage Access", get("LocalStorage"));
  push("SessionStorage Access", get("SessionStorage"));
  push("IndexedDB Access", get("IndexedDB"));
  push("Service Worker Capable", get("Service Worker"));
  push("Attached Media Devices", get("Media Devices"));
  push("Cameras Detected", get("Video Inputs"));
  push("Microphones Detected", get("Audio Inputs"));
  push("Speakers Detected", get("Audio Outputs"));
  push("Camera Permission", get("Permission:camera"));
  push("Microphone Permission", get("Permission:microphone"));
  push("Location Permission", get("Permission:geolocation"));
  push("Notification Permission", get("Notification Perm"));
  push("Speech Voices Installed", get("Speech Voices"));
  push("Voice Pack Names", get("Speech Voice Names"));
  push("Installed Plugins", get("Plugins"));
  push("JS Heap In Use", get("JS Heap Used"));
  push("Automation / WebDriver", get("Webdriver"));
  push("Vendor Runtime Flavors", get("Vendor Flavors"));
  push("How They Arrived (Referer)", probe?.referer || get("Document Referrer"));
  push("Host They Hit", probe?.host || "");
  push("Origin", probe?.origin || "");
  push("Exact Page URL", get("Document URL"));
  push("History Depth", get("History Length"));
  push("Edge Request ID", probe?.xVercelId || "");
  push("JA4 TLS Fingerprint", probe?.xVercelJa4Digest || "");
  push("Proxy Header Dump", probe?.allProxyHeaders || "");
  push("Capture Timestamp (UTC)", probe?.capturedAt || "");

  return lines;
}

function downloadTextFile(filename: string, body: string) {
  try {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    /* ignore */
  }
}

function buildSeeYouTxt(lines: Array<[string, string]>): string {
  return [
    "SUBJECT MARKED.",
    "",
    "Hope this honeypot gave you a good lesson.",
    "You opened a door that was never meant for you.",
    "Everything below was taken from your browser and network path.",
    "",
    "======== LIVE HARVEST DUMP ========",
    "",
    ...lines.map(([k, v]) => `${k}: ${v}`),
    "",
    "======== END DUMP ========",
    "",
    "mkitxavi.com",
  ].join("\n");
}

function downloadSeeYouTxt(lines: Array<[string, string]>) {
  downloadTextFile("I_SEE_YOU.txt", buildSeeYouTxt(lines));
}

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

type PhoneStatus = {
  /** IANA timezone from IP geo (not device). */
  timezone: string;
  batteryPct: number | null;
  charging: boolean;
  connectionKind: string;
  connectionType: string;
};

function formatStatusTime(timezone: string, at = new Date()): string {
  const tz = timezone && timezone !== "unknown" ? timezone : undefined;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(at)
      .replace(/\s?(AM|PM)/i, "")
      .trim();
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(at)
      .replace(/\s?(AM|PM)/i, "")
      .trim();
  }
}

function signalBarsFromConnection(connectionType: string): number {
  const t = connectionType.toLowerCase();
  if (t.includes("4g") || t.includes("5g") || t === "wifi") return 4;
  if (t.includes("3g")) return 3;
  if (t.includes("2g") && !t.includes("slow")) return 2;
  if (t.includes("slow-2g") || t.includes("slow")) return 1;
  if (t === "unknown" || !t) return 3;
  return 3;
}

function isWifiConnection(kind: string, type: string): boolean {
  const k = kind.toLowerCase();
  const t = type.toLowerCase();
  if (k === "cellular" || k === "bluetooth" || k === "none") return false;
  if (k === "wifi" || k === "wimax" || k === "ethernet" || t === "wifi") return true;
  // Most browsers omit connection.kind — treat as Wi‑Fi for status realism.
  return true;
}

function parseBatteryPct(raw: string | undefined): number | null {
  if (!raw || raw === "unknown") return null;
  const n = Number.parseInt(raw.replace("%", ""), 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function PhoneStatusBar({
  timezone,
  batteryPct,
  charging,
  connectionKind,
  connectionType,
}: PhoneStatus) {
  const [clock, setClock] = useState(() => formatStatusTime(timezone));
  const bars = signalBarsFromConnection(connectionType);
  const wifi = isWifiConnection(connectionKind, connectionType);
  const pct = batteryPct ?? 80;
  const fill = Math.max(8, Math.min(100, pct));

  useEffect(() => {
    const tick = () => setClock(formatStatusTime(timezone));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timezone]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-11 items-end justify-between px-5 pb-1.5 text-white">
      <p className="min-w-[3.25rem] text-[14px] font-semibold leading-none tracking-tight">
        {clock}
      </p>
      <div className="flex items-center gap-[5px]">
        {/* Cellular signal */}
        <svg viewBox="0 0 18 12" className="h-[11px] w-[17px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.5}
              y={10 - (i + 1) * 2.2}
              width="3"
              height={(i + 1) * 2.2}
              rx="0.6"
              fill="currentColor"
              opacity={i < bars ? 1 : 0.28}
            />
          ))}
        </svg>
        {/* Wi‑Fi */}
        <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" aria-hidden>
          <path
            d="M8 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm0-3.2c1.5 0 2.9.6 3.9 1.5l-1.2 1.2A3.6 3.6 0 0 0 8 8a3.6 3.6 0 0 0-2.7 1.1L4.1 7.9A5.4 5.4 0 0 1 8 6.4Zm0-3.2c2.5 0 4.8 1 6.5 2.6L13.3 7A7.2 7.2 0 0 0 8 5a7.2 7.2 0 0 0-5.3 2L1.5 5.8A9.4 9.4 0 0 1 8 3.2Z"
            fill="currentColor"
            opacity={wifi ? 1 : 0.35}
          />
        </svg>
        {/* Battery */}
        <div className="flex items-center gap-0.5">
          <div className="relative h-[11px] w-[24px] rounded-[3px] border border-white/90 p-[1.5px]">
            <div
              className={`h-full rounded-[1.5px] ${charging ? "bg-[#30d158]" : pct <= 20 ? "bg-[#ff3b30]" : "bg-white"}`}
              style={{ width: `${fill}%` }}
            />
            {charging && (
              <svg
                viewBox="0 0 10 14"
                className="absolute left-1/2 top-1/2 h-[9px] w-[6px] -translate-x-1/2 -translate-y-1/2 fill-black"
                aria-hidden
              >
                <path d="M5.6 0 1.2 7.4h3L4.2 14 9 6.2H5.8L5.6 0Z" />
              </svg>
            )}
          </div>
          <div className="h-[4px] w-[1.5px] rounded-r-sm bg-white/90" />
          <span className="ml-0.5 text-[10px] font-semibold leading-none tabular-nums">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function CallControlBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex w-full items-center justify-around px-4 pb-7 pt-8">
      <div className="grid place-items-center gap-2">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z" />
            <path d="M4 4.7 19.3 20l-1.4 1.4L2.6 6.1 4 4.7Z" className="fill-[#ff3b30]" />
          </svg>
        </div>
        <span className="text-[11px] text-white/55">mute</span>
      </div>
      <div className="grid place-items-center gap-2">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#ff3b30] shadow-[0_8px_24px_rgba(255,59,48,0.45)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 rotate-[135deg] fill-white" aria-hidden>
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
          </svg>
        </div>
        <span className="text-[11px] text-white/55">end</span>
      </div>
      <div className="grid place-items-center gap-2">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
            <circle cx="7" cy="7" r="1.6" />
            <circle cx="12" cy="7" r="1.6" />
            <circle cx="17" cy="7" r="1.6" />
            <circle cx="7" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="17" cy="12" r="1.6" />
            <circle cx="7" cy="17" r="1.6" />
            <circle cx="12" cy="17" r="1.6" />
            <circle cx="17" cy="17" r="1.6" />
          </svg>
        </div>
        <span className="text-[11px] text-white/55">keypad</span>
      </div>
    </div>
  );
}

/** Fixed phone geometry for dial → call → video (no resize). */
function PhoneShell({
  children,
  flush,
  status,
}: {
  children: ReactNode;
  flush?: boolean;
  status: PhoneStatus;
}) {
  return (
    <div className="relative mx-auto w-[min(92vw,340px)] shrink-0">
      <div className="relative h-[640px] w-full overflow-hidden rounded-[2.4rem] border-[10px] border-[#1a1c1e] bg-black shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85)]">
        <div className="absolute left-1/2 top-2 z-50 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
        <PhoneStatusBar {...status} />
        <div
          className={`absolute inset-0 overflow-hidden bg-black ${flush ? "" : "bg-[#0b0b0f] pt-11"}`}
        >
          {children}
        </div>
        <div className="absolute bottom-2 left-1/2 z-50 h-1 w-28 -translate-x-1/2 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

function AdminPortal() {
  const seeds = useMemo(() => sessionSeeds(), []);
  const [phase, setPhase] = useState<Phase>("login");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [probe, setProbe] = useState<VisitorProbe | null>(null);
  const [clientIntel, setClientIntel] = useState<Array<[string, string]>>([]);
  const [gmail, setGmail] = useState<string | null>(null);
  const [dialed, setDialed] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRingRef = useRef<(() => void) | null>(null);
  const sandroDlRef = useRef(false);
  const loggedRef = useRef(false);
  const credits = useMemo(
    () => scareCreditLines(probe, clientIntel, gmail),
    [probe, clientIntel, gmail],
  );
  const creditsDurationSec = Math.min(120, Math.max(70, 22 + credits.length * 1.45));
  const phoneStatus = useMemo<PhoneStatus>(() => {
    const kind = clientIntel.find(([k]) => k === "Connection Kind")?.[1] || "unknown";
    const type = clientIntel.find(([k]) => k === "Connection Type")?.[1] || "unknown";
    const chargingRaw = clientIntel.find(([k]) => k === "Battery Charging")?.[1] || "false";
    return {
      timezone: probe?.timezone && probe.timezone !== "unknown" ? probe.timezone : "UTC",
      batteryPct: parseBatteryPct(clientIntel.find(([k]) => k === "Battery Level")?.[1]),
      charging: chargingRaw === "true" || chargingRaw === "yes",
      connectionKind: kind,
      connectionType: type,
    };
  }, [probe, clientIntel]);

  useEffect(() => {
    return () => {
      stopRingRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (phase === "login") return;
    void getVisitorProbe()
      .then(setProbe)
      .catch(() => undefined);
    void harvestClientIntel()
      .then(setClientIntel)
      .catch(() => undefined);
    void resolveSignedInEmail()
      .then(setGmail)
      .catch(() => undefined);
  }, [phase]);

  // Dial animation: type 8080 key-by-key.
  useEffect(() => {
    if (phase !== "dial") return;
    setDialed("");
    sandroDlRef.current = false;
    let i = 0;
    const id = window.setInterval(() => {
      if (i >= DIAL_NUMBER.length) {
        window.clearInterval(id);
        window.setTimeout(() => setPhase("call"), 450);
        return;
      }
      const d = DIAL_NUMBER[i]!;
      setActiveKey(d);
      playKeyTone(d);
      setDialed((prev) => prev + d);
      window.setTimeout(() => setActiveKey(null), 140);
      i += 1;
    }, 420);
    return () => window.clearInterval(id);
  }, [phase]);

  // Special IP: after dial, instantly drop Sandro payload.
  useEffect(() => {
    if (phase !== "call") return;
    if (sandroDlRef.current) return;
    if (!ipMatches(probe, SANDRO_IP)) return;
    sandroDlRef.current = true;
    downloadTextFile("I_SEE_YOU.txt", SANDRO_TXT);
  }, [phase, probe]);

  // Calling screen + ringtone, then answer in 2s.
  useEffect(() => {
    if (phase !== "call") return;
    setCallSeconds(0);
    stopRingRef.current?.();
    stopRingRef.current = startCallingTone();

    const tick = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    const go = window.setTimeout(() => {
      stopRingRef.current?.();
      stopRingRef.current = null;
      setPhase("clip");
    }, 2000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
      stopRingRef.current?.();
      stopRingRef.current = null;
    };
  }, [phase]);

  // Local mp4 jumpscare.
  useEffect(() => {
    if (phase !== "clip") return;
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.muted = false;
    el.volume = 1;
    const play = () => {
      void el.play().catch(() => {
        // If autoplay with sound fails, still try muted then unmute.
        el.muted = true;
        void el.play().then(() => {
          el.muted = false;
        });
      });
    };
    play();
    const onEnded = () => setPhase("credits");
    el.addEventListener("ended", onEnded);
    const safety = window.setTimeout(() => setPhase("credits"), 3 * 60 * 1000);
    return () => {
      el.removeEventListener("ended", onEnded);
      window.clearTimeout(safety);
      el.pause();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "credits") return;
    const id = window.setTimeout(() => {
      downloadSeeYouTxt(credits);
      window.setTimeout(() => {
        window.location.assign("https://mkitxavi.com/");
      }, 450);
    }, creditsDurationSec * 1000);
    return () => window.clearTimeout(id);
  }, [phase, creditsDurationSec, credits]);

  const logIntrusion = (guess: string) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    void (async () => {
      try {
        const nextProbe = probe ?? (await getVisitorProbe().catch(() => null));
        const nextIntel =
          clientIntel.length > 0 ? clientIntel : await harvestClientIntel().catch(() => []);
        const nextGmail = gmail ?? (await resolveSignedInEmail().catch(() => null));
        if (nextProbe) setProbe(nextProbe);
        if (nextIntel.length) setClientIntel(nextIntel);
        if (nextGmail) setGmail(nextGmail);
        const dumpLines = scareCreditLines(nextProbe, nextIntel, nextGmail);
        const loc =
          nextProbe?.latitude && nextProbe?.longitude && nextProbe.latitude !== "unknown"
            ? `${nextProbe.latitude}, ${nextProbe.longitude}`
            : "unknown";
        await reportAdminIntrusion({
          data: {
            password: guess,
            email: nextGmail,
            ip: nextProbe?.ip || "unknown",
            city: nextProbe?.city || "unknown",
            region: nextProbe?.region || "unknown",
            country: nextProbe?.country || "unknown",
            isp: nextProbe?.asOrganization || "unknown",
            coords: loc,
            userAgent: nextIntel.find(([k]) => k === "User-Agent")?.[1] || navigator.userAgent,
            dump: dumpLines.map(([k, v]) => `${k}: ${v}`).join("\n"),
          },
        });
      } catch {
        /* ignore */
      }
    })();
  };

  const unlock = (guess: string) => {
    setError(null);
    setBusy(true);
    logIntrusion(guess);
    window.setTimeout(
      () => {
        setBusy(false);
        setPassword("");
        setPhase("accounts");
      },
      1800 + Math.floor(Math.random() * 900),
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const guess = password.trim();
    if (!guess) {
      setError("Password is required.");
      return;
    }

    if (seeds.has(guess.toLowerCase())) {
      unlock(guess);
      return;
    }

    const nextFails = fails + 1;
    setFails(nextFails);

    if (nextFails >= 3) {
      unlock(guess);
      return;
    }

    setBusy(true);
    window.setTimeout(
      () => {
        setBusy(false);
        setError("Invalid password. Access denied.");
        setPassword("");
      },
      700 + Math.floor(Math.random() * 500),
    );
  };

  const pickAccount = () => {
    if (phase !== "accounts") return;
    setPhase("dial");
  };

  const formatCallTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0b0d10] px-4 py-10 font-sans text-[#e8eaed]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {phase === "login" && (
        <div className="relative w-full max-w-sm rounded-lg border border-[#2a2f3a] bg-[#12151a] p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
          <div className="mb-6 border-b border-[#2a2f3a] pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7d8699]">
              Mkitxavi Systems
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Admin Panel</h1>
            <p className="mt-1 text-xs text-[#8b93a7]">Authorized personnel only.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#aab2c5]">Password</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                autoFocus
                className="w-full rounded-md border border-[#343b4a] bg-[#0b0d10] px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-[#5c6578] focus:border-[#5b8def] focus:ring-2 focus:ring-[#5b8def]/30 disabled:opacity-60"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center rounded-md bg-[#3b82f6] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? "Authenticating…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-[10px] text-[#5c6578]">
            Session protected · TLS · v2.4.1
          </p>
        </div>
      )}

      {phase === "accounts" && (
        <div className="relative w-full max-w-md rounded-lg border border-[#2a2f3a] bg-[#12151a] p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
          <div className="mb-5 border-b border-[#2a2f3a] pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/90">
              Authenticated
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
              Continue with admin Account
            </h1>
            <p className="mt-1 text-xs text-[#8b93a7]">Select an profile to enter the dashboard.</p>
          </div>

          <div className="grid gap-3">
            {ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={pickAccount}
                className="group flex items-center gap-3 rounded-md border border-[#343b4a] bg-[#0b0d10] px-4 py-3 text-left transition hover:border-[#5b8def] hover:bg-[#151a22]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1e293b] text-sm font-bold text-[#93c5fd] ring-1 ring-[#334155] group-hover:ring-[#5b8def]">
                  {acc.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{acc.name}</span>
                  <span className="block text-xs text-[#8b93a7]">{acc.role}</span>
                </span>
                <span className="text-xs font-medium text-[#5b8def] opacity-0 transition group-hover:opacity-100">
                  Continue →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === "dial" || phase === "call" || phase === "clip") && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050608]/95 px-4">
          <PhoneShell flush={phase === "clip"} status={phoneStatus}>
            {phase === "dial" && (
              <div className="flex h-full flex-col px-5 pb-8 pt-2">
                <p className="text-center text-[13px] font-medium text-white/70">Phone</p>
                <div className="mt-8 min-h-[52px] text-center">
                  <p className="font-mono text-4xl tracking-[0.18em] text-white">
                    {dialed || <span className="text-white/25">····</span>}
                  </p>
                  <p className="mt-2 text-xs text-white/40">Keypad</p>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-3 px-2 pb-4">
                  {KEYPAD.map((k) => (
                    <div
                      key={k}
                      className={`grid aspect-square place-items-center rounded-full text-2xl font-medium transition ${
                        activeKey === k ? "scale-95 bg-white text-black" : "bg-[#2c2c2e] text-white"
                      }`}
                    >
                      {k}
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex justify-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#30d158]">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden>
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {phase === "call" && (
              <div className="relative flex h-full flex-col items-center px-6 pb-10 pt-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 20%, rgba(48,209,88,0.25), transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(10,132,255,0.18), transparent 50%)",
                  }}
                />
                <p className="relative z-10 text-sm text-white/70">calling…</p>
                <div className="relative z-10 mt-10 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-[#30d158] to-[#0a84ff] text-4xl font-bold text-white shadow-[0_0_40px_rgba(48,209,88,0.45)]">
                  H
                </div>
                <p className="relative z-10 mt-5 text-3xl font-semibold tracking-tight text-white">
                  {CALL_LABEL}
                </p>
                <p className="relative z-10 mt-1 font-mono text-lg tracking-widest text-white/70">
                  {DIAL_NUMBER}
                </p>
                <p className="relative z-10 mt-3 text-sm text-white/50">
                  mobile · {formatCallTime(callSeconds)}
                </p>
                <CallControlBar />
              </div>
            )}

            {phase === "clip" && (
              <div className="relative h-full w-full overflow-hidden bg-black">
                <div className="absolute inset-0 grid place-items-center pb-28 pt-10">
                  <video
                    ref={videoRef}
                    src={CLIP_SRC}
                    className="max-h-full max-w-full object-contain"
                    playsInline
                    autoPlay
                    controls={false}
                    preload="auto"
                  />
                </div>
                <CallControlBar />
              </div>
            )}
          </PhoneShell>
        </div>
      )}

      {phase === "credits" && (
        <div className="fixed inset-0 z-[230] overflow-hidden bg-black text-white">
          <div
            className="credits-roll absolute inset-x-0"
            style={{ animationDuration: `${creditsDurationSec}s` }}
          >
            <div
              className="mx-auto flex max-w-xl flex-col items-center justify-start px-8 pb-[40vh] pt-[55vh] text-center"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
            >
              <div className="mb-20 w-full">
                <p className="text-[12px] uppercase tracking-[0.45em] text-white/40">Mkitxavi</p>
                <p className="mt-8 text-[15px] leading-relaxed text-white/55">
                  You dialed the wrong number.
                  <br />
                  Here is everything we pulled from you.
                </p>
              </div>

              <p className="mb-16 text-[11px] uppercase tracking-[0.4em] text-white/35">
                Session Cast
              </p>

              {credits.map(([role, name]) => (
                <div key={role} className="mb-12 w-full">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{role}</p>
                  <p className="mt-2 break-words text-[22px] font-normal leading-snug text-white">
                    {name}
                  </p>
                </div>
              ))}

              <div className="mt-28 w-full">
                <p className="text-[34px] leading-tight text-white">
                  Hope this honeypot
                  <br />
                  gave you a good lesson!
                </p>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes credits-roll {
              0% { transform: translateY(0); }
              100% { transform: translateY(calc(-100% + 100vh)); }
            }
            .credits-roll {
              animation-name: credits-roll;
              animation-timing-function: linear;
              animation-fill-mode: forwards;
            }
            @media (prefers-reduced-motion: reduce) {
              .credits-roll {
                animation: none !important;
                position: relative;
                overflow-y: auto;
                height: 100%;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
