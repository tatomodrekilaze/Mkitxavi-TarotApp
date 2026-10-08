import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const domains = JSON.parse(readFileSync(resolve("src/lib/disposable-email-domains.json"), "utf8"));
const env = readFileSync(resolve(".env"), "utf8");
function get(key) {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m?.[1]?.trim().replace(/^["']|["']$/g, "");
}
const url = get("VITE_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY") || get("SUPABASE_SERVICE_KEY");
if (!url || !key) {
  console.error("missing supabase admin env");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const list = domains.map((d) => String(d).toLowerCase());
const chunk = 500;
for (let i = 0; i < list.length; i += chunk) {
  const rows = list.slice(i, i + chunk).map((domain) => ({ domain }));
  const { error } = await sb
    .from("blocked_email_domains")
    .upsert(rows, { onConflict: "domain", ignoreDuplicates: true });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("upserted", Math.min(i + chunk, list.length), "/", list.length);
}

const { count, error: countError } = await sb
  .from("blocked_email_domains")
  .select("*", { count: "exact", head: true });
if (countError) {
  console.error(countError);
  process.exit(1);
}
console.log("total_rows", count);

const { data: hit } = await sb
  .from("blocked_email_domains")
  .select("domain")
  .eq("domain", "beously.com")
  .maybeSingle();
console.log("beously", hit);
