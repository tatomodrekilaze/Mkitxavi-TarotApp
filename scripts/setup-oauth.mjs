/**
 * Automates Supabase Auth OAuth provider config for mkitxavi.com.
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 * Optional:
 *   FACEBOOK_CLIENT_ID / FACEBOOK_APP_ID
 *   FACEBOOK_CLIENT_SECRET / FACEBOOK_APP_SECRET
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim();
if (!PROJECT_REF)
  throw new Error("Set SUPABASE_PROJECT_REF to your own project before running OAuth setup.");
const SITE_URL = (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, "");
const REDIRECTS = [
  `${SITE_URL}/auth/callback`,

  "http://localhost:3000/auth/callback",
  "http://localhost:5173/auth/callback",
];

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const facebookId = (process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID)?.trim();
const facebookSecret = (
  process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET
)?.trim();

if (!googleId || !googleSecret) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

const body = {
  site_url: SITE_URL,
  uri_allow_list: REDIRECTS.join(","),
  external_google_enabled: true,
  external_google_client_id: googleId,
  external_google_secret: googleSecret,
};

if (facebookId && facebookSecret) {
  body.external_facebook_enabled = true;
  body.external_facebook_client_id = facebookId;
  body.external_facebook_secret = facebookSecret;
} else {
  console.warn("Facebook credentials missing — configuring Google only.");
}

console.log("Patching auth config for", PROJECT_REF);
const updated = await api("PATCH", `/projects/${PROJECT_REF}/config/auth`, body);
console.log("OK", {
  site_url: updated?.site_url,
  google: updated?.external_google_enabled,
  facebook: updated?.external_facebook_enabled,
  uri_allow_list: updated?.uri_allow_list,
});
