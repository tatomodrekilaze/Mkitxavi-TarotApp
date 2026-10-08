import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type OpsPublicFlags = {
  maintenanceMode: boolean;
  chatEnabled: boolean;
  coffeeReadingEnabled: boolean;
  adsEnabled: boolean;
  signupsEnabled: boolean;
};

export type OpsPublicAnnouncement = {
  id: number;
  title: string;
  body: string;
  level: "info" | "warn" | "critical";
  lang: string;
};

export type OpsRuntimeConfig = {
  flags: OpsPublicFlags;
  announcements: OpsPublicAnnouncement[];
  fetchedAt: string;
};

export const DEFAULT_OPS_RUNTIME: OpsRuntimeConfig = {
  flags: {
    maintenanceMode: false,
    chatEnabled: true,
    coffeeReadingEnabled: true,
    adsEnabled: true,
    signupsEnabled: true,
  },
  announcements: [],
  fetchedAt: new Date(0).toISOString(),
};

function flagMap(rows: Array<{ key: string; enabled: boolean }>): OpsPublicFlags {
  const m = new Map(rows.map((r) => [r.key, Boolean(r.enabled)]));
  return {
    maintenanceMode: m.get("maintenance_mode") ?? false,
    chatEnabled: m.get("chat_enabled") ?? true,
    coffeeReadingEnabled: m.get("coffee_reading_enabled") ?? true,
    adsEnabled: m.get("ads_enabled") ?? true,
    signupsEnabled: m.get("signups_enabled") ?? true,
  };
}

/** Public runtime config for the consumer app (service-role read, no secrets). */
export async function fetchOpsRuntimeConfig(): Promise<OpsRuntimeConfig> {
  try {
    const admin = getSupabaseAdminClient();
    const [flagsRes, annRes] = await Promise.all([
      admin.from("ops_feature_flags" as never).select("key, enabled"),
      admin
        .from("ops_announcements" as never)
        .select("id, title, body, level, lang, active, starts_at, ends_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const now = Date.now();
    const announcements = (
      (annRes.data ?? []) as Array<{
        id: number;
        title: string;
        body: string;
        level: string;
        lang: string;
        starts_at: string;
        ends_at: string | null;
      }>
    )
      .filter((a) => {
        const start = new Date(a.starts_at).getTime();
        const end = a.ends_at ? new Date(a.ends_at).getTime() : Infinity;
        return start <= now && now <= end;
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        level: (["info", "warn", "critical"].includes(a.level)
          ? a.level
          : "info") as OpsPublicAnnouncement["level"],
        lang: a.lang || "all",
      }));

    return {
      flags: flagMap((flagsRes.data ?? []) as Array<{ key: string; enabled: boolean }>),
      announcements,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("ops runtime fetch failed", err);
    return { ...DEFAULT_OPS_RUNTIME, fetchedAt: new Date().toISOString() };
  }
}
