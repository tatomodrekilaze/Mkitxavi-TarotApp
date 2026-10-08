// Simulated device fingerprint: combines stable browser parameters into a hash.
// Used with localStorage to discourage infinite guest resets via cookie deletion.

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const nav = window.navigator;
  const scr = window.screen;
  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(","),
    nav.platform,
    nav.hardwareConcurrency,
    (nav as unknown as { deviceMemory?: number }).deviceMemory,
    scr.width,
    scr.height,
    scr.colorDepth,
    scr.pixelDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return simpleHash(parts.join("|"));
}
