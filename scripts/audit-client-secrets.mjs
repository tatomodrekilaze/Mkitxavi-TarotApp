/**
 * Fails if any server-only secret from .env is present in the built client
 * bundle. Reports variable names only, never values.
 *
 * Usage: bun run build && bun scripts/audit-client-secrets.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIRS = [".vercel/output/static", "dist/client", ".output/public"];

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "").trim();
    if (value) out[m[1]] = value;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(js|mjs|cjs|css|html|json|map)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const env = parseEnv(".env");
// VITE_-prefixed values are intentionally public. Bare URLs and mode flags are
// not secrets either, and a public URL matches every bundle by definition.
const secrets = Object.entries(env).filter(
  ([name, value]) =>
    !name.startsWith("VITE_") &&
    value.length >= 12 &&
    !/^https?:\/\//.test(value) &&
    !/^(test|live|sandbox|production|development)$/i.test(value),
);

const clientDir = CLIENT_DIRS.find((d) => existsSync(d));
if (!clientDir) {
  console.error("No client build found. Run `bun run build` first.");
  process.exit(2);
}

const files = walk(clientDir);
const leaked = new Map();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [name, value] of secrets) {
    if (text.includes(value)) {
      if (!leaked.has(name)) leaked.set(name, []);
      leaked.get(name).push(file);
    }
  }
}

console.log(`scanned ${files.length} client files in ${clientDir}`);
console.log(`checked ${secrets.length} server-only secrets`);
console.log(
  "note: only covers secrets that are populated in the local .env - run this in CI with the full production env for complete coverage.",
);

if (leaked.size === 0) {
  console.log("OK: no server-only secret found in the client bundle.");
  process.exit(0);
}

for (const [name, where] of leaked) {
  console.error(`LEAK: ${name} appears in ${where.length} client file(s):`);
  for (const f of where) console.error(`  ${f}`);
}
process.exit(1);
