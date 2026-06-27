"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardStats, StatsSample } from "@/lib/aggregate";

export type { StatsSample };

const MAX_SAMPLES = 120;

/**
 * Rolling in-memory history of fleet-wide aggregate stats, sampled once per
 * poll (keyed on the newest report timestamp). Feeds the overview drill-down
 * charts so they share the detail page's time-series look without any extra
 * network requests. History only spans the current session — it starts empty
 * on mount and fills as the dashboard polls.
 */
export function useStatsHistory(
  stats: DashboardStats,
  stamp: string | undefined,
): StatsSample[] {
  const [history, setHistory] = useState<StatsSample[]>([]);
  const lastStamp = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!stamp || stamp === lastStamp.current) return;
    lastStamp.current = stamp;
    const parsed = new Date(stamp).getTime();
    const t = Number.isNaN(parsed) ? Date.now() : parsed;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          t,
          avgCpu: stats.avgCpu,
          avgMemory: stats.avgMemory,
          uploadSpeed: stats.uploadSpeed,
          downloadSpeed: stats.downloadSpeed,
        },
      ];
      return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
    });
  }, [stamp, stats]);

  return history;
}
