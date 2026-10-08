import { createServerFn } from "@tanstack/react-start";
import {
  DEFAULT_OPS_RUNTIME,
  fetchOpsRuntimeConfig,
  type OpsRuntimeConfig,
} from "./ops-runtime.server";

export type { OpsPublicAnnouncement, OpsPublicFlags, OpsRuntimeConfig } from "./ops-runtime.server";
export { DEFAULT_OPS_RUNTIME } from "./ops-runtime.server";

/** Consumer app: kill switches + live banners. No auth required. */
export const getOpsRuntime = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpsRuntimeConfig> => {
    try {
      return await fetchOpsRuntimeConfig();
    } catch {
      return DEFAULT_OPS_RUNTIME;
    }
  },
);
