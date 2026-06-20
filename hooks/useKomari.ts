"use client";

import useSWR from "swr";
import { komari, type LoadMetric } from "@/lib/rpc2";
import { buildNodeViews } from "@/lib/aggregate";

/** Live status polls fast; node metadata and site config change rarely. */
const LIVE_INTERVAL = 2000;
const NODES_INTERVAL = 30_000;
const CONFIG_INTERVAL = 60_000;

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
  hours: number,
  loadType: LoadMetric = "all",
  enabled = true,
) {
  return useSWR(
    enabled && uuid ? ["load-records", uuid, hours, loadType] : null,
    () =>
      komari.getLoadRecords({
        uuid,
        hours,
        load_type: loadType,
        maxCount: 1000,
      }),
    { refreshInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );
}

export function usePingRecords(
  uuid: string | undefined,
  hours: number,
  enabled = true,
) {
  return useSWR(
    enabled && uuid ? ["ping-records", uuid, hours] : null,
    () => komari.getPingRecords({ uuid, hours, maxCount: 1000 }),
    { refreshInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );
}
