"use client";

import useSWR from "swr";
import { komari, type LoadMetric } from "@/lib/rpc2";
import { buildNodeViews } from "@/lib/aggregate";
import type { MeInfo } from "@/lib/types";

/** Live status polls fast; node metadata and site config change rarely. */
const LIVE_INTERVAL = 2000;
const NODES_INTERVAL = 30_000;
const CONFIG_INTERVAL = 60_000;
const SHORT_HISTORY_INTERVAL = 10_000;
const HISTORY_INTERVAL = 60_000;
const DEV_ME: MeInfo = {
  "2fa_enabled": false,
  logged_in: true,
  sso_id: "",
  sso_type: "development",
  username: "dev",
  uuid: "development",
};

export function usePublicInfo() {
  return useSWR("public-info", () => komari.getPublicInfo(), {
    revalidateOnFocus: false,
    refreshInterval: CONFIG_INTERVAL,
  });
}

export function useVersion() {
  return useSWR("version", () => komari.getVersion(), {
    revalidateOnFocus: false,
  });
}

/** Current viewer's auth state (`logged_in`). Errors are treated as logged-out. */
export function useMe() {
  return useSWR(
    "me",
    async () => {
      try {
        const me = await komari.getMe();
        if (process.env.NODE_ENV === "development") {
          return { ...me, logged_in: true };
        }
        return me;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          return DEV_ME;
        }
        throw error;
      }
    },
    {
      fallbackData: process.env.NODE_ENV === "development" ? DEV_ME : undefined,
      revalidateOnFocus: false,
      refreshInterval: CONFIG_INTERVAL,
      shouldRetryOnError: false,
    },
  );
}

export function useNodes() {
  return useSWR("nodes", () => komari.getNodes(), {
    refreshInterval: NODES_INTERVAL,
  });
}

export function useLatestStatus() {
  return useSWR("latest-status", () => komari.getNodesLatestStatus(), {
    refreshInterval: LIVE_INTERVAL,
    keepPreviousData: true,
  });
}

/**
 * Primary dashboard data: node metadata joined with live status.
 * Loading is driven by node metadata; status streams in and updates in place.
 */
export function useDashboard() {
  const nodesQuery = useNodes();
  const statusQuery = useLatestStatus();

  const views = buildNodeViews(nodesQuery.data, statusQuery.data);

  return {
    views,
    isLoading: nodesQuery.isLoading,
    error: nodesQuery.error ?? statusQuery.error,
    /** Newest report timestamp across the fleet (ISO), or undefined. */
    lastUpdated: latestTimestamp(statusQuery.data),
    refresh: () => {
      void nodesQuery.mutate();
      void statusQuery.mutate();
    },
  };
}

function latestTimestamp(
  status: Record<string, { time: string }> | undefined,
): string | undefined {
  if (!status) return undefined;
  let max = 0;
  let iso: string | undefined;
  for (const s of Object.values(status)) {
    const t = new Date(s.time).getTime();
    if (!Number.isNaN(t) && t > max) {
      max = t;
      iso = s.time;
    }
  }
  return iso;
}

export function useLoadRecords(
  uuid: string | undefined,
  range: number | { minutes: number },
  loadType: LoadMetric = "all",
  enabled = true,
) {
  const rangeKey = typeof range === "number" ? `${range}h` : `${range.minutes}m`;
  return useSWR(
    enabled && uuid ? ["load-records", uuid, rangeKey, loadType] : null,
    () =>
      komari.getLoadRecords({
        uuid,
        ...recordWindow(range),
        load_type: loadType,
        maxCount: 1000,
      }),
    {
      refreshInterval: typeof range === "number" ? HISTORY_INTERVAL : SHORT_HISTORY_INTERVAL,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );
}

export function usePingRecords(
  uuid: string | undefined,
  range: number | { minutes: number },
  enabled = true,
) {
  const rangeKey = typeof range === "number" ? `${range}h` : `${range.minutes}m`;
  return useSWR(
    enabled && uuid ? ["ping-records", uuid, rangeKey] : null,
    () => komari.getPingRecords({ uuid, ...recordWindow(range), maxCount: 1000 }),
    {
      refreshInterval: typeof range === "number" ? HISTORY_INTERVAL : SHORT_HISTORY_INTERVAL,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );
}

export function useNodeRecentStatus(uuid: string | undefined, enabled = true) {
  return useSWR(
    enabled && uuid ? ["recent-status", uuid] : null,
    () => komari.getNodeRecentStatus(uuid!),
    { refreshInterval: LIVE_INTERVAL, revalidateOnFocus: false, keepPreviousData: true },
  );
}

function recordWindow(range: number | { minutes: number }) {
  if (typeof range === "number") return { hours: range };
  const end = new Date();
  const start = new Date(end.getTime() - range.minutes * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}
