import { createFileRoute } from "@tanstack/react-router";
import { resolveIpChallenge } from "@/lib/ops-console.server";

function pageHtml(opts: {
  title: string;
  heading: string;
  body: string;
  ok: boolean;
  form?: { token: string; action: "allow" | "deny" };
}) {
  const color = opts.ok ? "#16a34a" : "#dc2626";
  const formBlock = opts.form
    ? `<form method="POST" action="/api/ops/ip-challenge" style="margin-top:1.25rem">
  <input type="hidden" name="token" value="${opts.form.token.replace(/"/g, "&quot;")}"/>
  <input type="hidden" name="action" value="${opts.form.action}"/>
  <button type="submit" style="appearance:none;border:0;border-radius:8px;padding:.7rem 1.1rem;background:${opts.form.action === "allow" ? "#16a34a" : "#dc2626"};color:#fff;font-weight:600;cursor:pointer">
    Confirm ${opts.form.action === "allow" ? "allow" : "deny"}
  </button>
</form>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${opts.title}</title>
<meta name="robots" content="noindex,nofollow"/>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d10;color:#e8eaed;font-family:system-ui,sans-serif}
  .card{max-width:28rem;padding:1.75rem;border:1px solid #2a2f3a;border-radius:12px;background:#12151a}
  h1{margin:0 0 .75rem;font-size:1.15rem;color:${color}}
  p{margin:0;line-height:1.5;color:#b4bac6}
</style></head>
<body><div class="card"><h1>${opts.heading}</h1><p>${opts.body}</p>${formBlock}</div></body></html>`;
}

export const Route = createFileRoute("/api/ops/ip-challenge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") || "";
        const action = url.searchParams.get("action");
        if (!token || (action !== "allow" && action !== "deny")) {
          return new Response("Invalid challenge link.", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const html = pageHtml({
          title: "Ops IP challenge",
          heading: action === "allow" ? "Allow this IP?" : "Deny this IP?",
          body:
            action === "allow"
              ? "Confirm to allowlist this staff IP. Prefetch / scanners cannot approve via GET."
              : "Confirm to reject this login attempt.",
          ok: action === "allow",
          form: { token, action },
        });

        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") || "";
        let token = "";
        let action: string | null = null;

        if (contentType.includes("application/json")) {
          const body = (await request.json().catch(() => null)) as {
            token?: string;
            action?: string;
          } | null;
          token = body?.token || "";
          action = body?.action ?? null;
        } else {
          const form = await request.formData();
          token = String(form.get("token") || "");
          action = String(form.get("action") || "") || null;
        }

        if (!token || (action !== "allow" && action !== "deny")) {
          return new Response("Invalid challenge.", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const result = await resolveIpChallenge(token, action);
        const html = pageHtml({
          title: "Ops IP challenge",
          heading: result.ok ? "Done" : "Failed",
          body: result.message,
          ok: result.ok,
        });

        return new Response(html, {
          status: result.ok ? 200 : 400,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
