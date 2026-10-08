import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP, getRequestHeaders } from "@tanstack/react-start/server";

export type VisitorProbe = {
  ip: string;
  forwardedFor: string;
  realIp: string;
  country: string;
  region: string;
  city: string;
  continent: string;
  latitude: string;
  longitude: string;
  timezone: string;
  asOrganization: string;
  postalCode: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  accept: string;
  referer: string;
  origin: string;
  host: string;
  proto: string;
  secChUa: string;
  secChUaMobile: string;
  secChUaPlatform: string;
  secFetchSite: string;
  secFetchMode: string;
  secFetchDest: string;
  secFetchUser: string;
  dnt: string;
  connectionHeader: string;
  via: string;
  xVercelId: string;
  xVercelJa4Digest: string;
  cfRay: string;
  cfVisitor: string;
  cfIpCity: string;
  capturedAt: string;
  allProxyHeaders: string;
};

function pick(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (!t) continue;
    try {
      return decodeURIComponent(t.replace(/\+/g, " "));
    } catch {
      return t;
    }
  }
  return "unknown";
}

export const getVisitorProbe = createServerFn({ method: "GET" }).handler(
  async (): Promise<VisitorProbe> => {
    const headers = getRequestHeaders();
    const interesting: string[] = [];
    headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (
        k.startsWith("x-") ||
        k.startsWith("cf-") ||
        k.startsWith("sec-") ||
        k === "via" ||
        k === "forwarded" ||
        k === "true-client-ip"
      ) {
        interesting.push(`${key}: ${value}`);
      }
    });

    return {
      ip: pick(
        getRequestIP({ xForwardedFor: true }),
        getRequestHeader("x-real-ip"),
        getRequestHeader("cf-connecting-ip"),
        getRequestHeader("true-client-ip"),
      ),
      forwardedFor: pick(getRequestHeader("x-forwarded-for")),
      realIp: pick(getRequestHeader("x-real-ip")),
      country: pick(getRequestHeader("x-vercel-ip-country"), getRequestHeader("cf-ipcountry")),
      region: pick(
        getRequestHeader("x-vercel-ip-country-region"),
        getRequestHeader("x-vercel-ip-region"),
      ),
      city: pick(getRequestHeader("x-vercel-ip-city"), getRequestHeader("cf-ipcity")),
      continent: pick(getRequestHeader("x-vercel-ip-continent")),
      latitude: pick(getRequestHeader("x-vercel-ip-latitude")),
      longitude: pick(getRequestHeader("x-vercel-ip-longitude")),
      timezone: pick(getRequestHeader("x-vercel-ip-timezone")),
      asOrganization: pick(getRequestHeader("x-vercel-ip-as-organization")),
      postalCode: pick(getRequestHeader("x-vercel-ip-postal-code")),
      userAgent: pick(getRequestHeader("user-agent")),
      acceptLanguage: pick(getRequestHeader("accept-language")),
      acceptEncoding: pick(getRequestHeader("accept-encoding")),
      accept: pick(getRequestHeader("accept")),
      referer: pick(getRequestHeader("referer"), getRequestHeader("referrer")),
      origin: pick(getRequestHeader("origin")),
      host: pick(getRequestHeader("x-forwarded-host"), getRequestHeader("host")),
      proto: pick(getRequestHeader("x-forwarded-proto"), "https"),
      secChUa: pick(getRequestHeader("sec-ch-ua")),
      secChUaMobile: pick(getRequestHeader("sec-ch-ua-mobile")),
      secChUaPlatform: pick(getRequestHeader("sec-ch-ua-platform")),
      secFetchSite: pick(getRequestHeader("sec-fetch-site")),
      secFetchMode: pick(getRequestHeader("sec-fetch-mode")),
      secFetchDest: pick(getRequestHeader("sec-fetch-dest")),
      secFetchUser: pick(getRequestHeader("sec-fetch-user")),
      dnt: pick(getRequestHeader("dnt"), getRequestHeader("sec-gpc")),
      connectionHeader: pick(getRequestHeader("connection")),
      via: pick(getRequestHeader("via")),
      xVercelId: pick(getRequestHeader("x-vercel-id")),
      xVercelJa4Digest: pick(getRequestHeader("x-vercel-ja4-digest")),
      cfRay: pick(getRequestHeader("cf-ray")),
      cfVisitor: pick(getRequestHeader("cf-visitor")),
      cfIpCity: pick(getRequestHeader("cf-ipcity")),
      capturedAt: new Date().toISOString(),
      allProxyHeaders: interesting.join(" · ") || "none",
    };
  },
);
