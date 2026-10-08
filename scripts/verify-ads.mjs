/**
 * Quick readiness check for Nina ads (ads.txt + env).
 * Usage: bun scripts/verify-ads.mjs [https://mkitxavi.com]
 */
const base = (process.argv[2] || "https://mkitxavi.com").replace(/\/$/, "");

const checks = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
  } catch (e) {
    checks.push({ name, ok: false, detail: e?.message || String(e) });
  }
}

await check("ads.txt", async () => {
  const res = await fetch(`${base}/ads.txt`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("pub-9273989202274867")) {
    throw new Error("publisher id missing in ads.txt");
  }
  return text.trim().split("\n")[0];
});

await check("adsense meta (homepage)", async () => {
  const res = await fetch(base, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("adsbygoogle")) {
    throw new Error("AdSense client/script not found in HTML yet (redeploy may be needed)");
  }
  return "AdSense markers present";
});

console.log(`\nAd readiness for ${base}\n`);
for (const c of checks) {
  console.log(`${c.ok ? "OK" : "FAIL"}  ${c.name}: ${c.detail}`);
}
const failed = checks.some((c) => !c.ok);
process.exit(failed ? 1 : 0);
