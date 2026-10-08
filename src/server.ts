import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"}, try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function requestHost(request: Request): string {
  const raw =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host;
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

/** Keep apex as the only indexable host (www → mkitxavi.com). */
function apexRedirectIfWww(request: Request): Response | null {
  if (requestHost(request) !== "www.mkitxavi.com") return null;
  const incoming = new URL(request.url);
  const dest = `https://mkitxavi.com${incoming.pathname}${incoming.search}`;
  return Response.redirect(dest, 308);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const wwwRedirect = apexRedirectIfWww(request);
      if (wwwRedirect) return wwwRedirect;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      // Never let CDN keep a poisoned HTML shell for the homepage.
      const url = new URL(request.url);
      if (url.pathname === "/" || url.pathname === "") {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
        return await normalizeCatastrophicSsrResponse(
          new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          }),
        );
      }

      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
