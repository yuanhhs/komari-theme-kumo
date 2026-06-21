/** Pure helpers that turn raw RPC maps into the view models the UI renders. */

import type { NodeMap, NodeView, StatusMap } from "./types";

/**
 * Join nodes with their latest status and drop hidden nodes, ordering by
 * ascending `weight` — the same default node order Komari's own frontend uses.
 */
export function buildNodeViews(
  nodes: NodeMap | undefined,
  status: StatusMap | undefined,
): NodeView[] {
  if (!nodes) return [];
  return Object.values(nodes)
    .filter((node) => !node.hidden)
    .map((node) => {
      const s = status?.[node.uuid];
      return { node, status: s, online: Boolean(s?.online) } satisfies NodeView;
    })
    .sort((a, b) => a.node.weight - b.node.weight);
}

export interface DashboardStats {
  total: number;
  online: number;
  offline: number;
  regions: number;
  /** bytes/sec across online nodes */
  uploadSpeed: number;
  downloadSpeed: number;
  /** cumulative bytes since each agent started */
  totalUp: number;
  totalDown: number;
}

export function computeStats(views: NodeView[]): DashboardStats {
  const regions = new Set<string>();
  let online = 0;
  let uploadSpeed = 0;
  let downloadSpeed = 0;
  let totalUp = 0;
  let totalDown = 0;

  for (const { node, status, online: isOnline } of views) {
    if (node.region) regions.add(node.region);
    if (isOnline && status) {
      online += 1;
      uploadSpeed += status.net_out || 0;
      downloadSpeed += status.net_in || 0;
    }
    if (status) {
      totalUp += status.net_total_up || 0;
      totalDown += status.net_total_down || 0;
    }
  }

  return {
    total: views.length,
    online,
    offline: views.length - online,
    regions: regions.size,
    uploadSpeed,
    downloadSpeed,
    totalUp,
    totalDown,
  };
}

export interface NodeGroup {
  name: string;
  views: NodeView[];
}

/** Group views by `node.group`; empty group is bucketed last under "". */
export function groupNodeViews(views: NodeView[]): NodeGroup[] {
  const buckets = new Map<string, NodeView[]>();
  for (const view of views) {
    const key = view.node.group || "";
    const list = buckets.get(key);
    if (list) list.push(view);
    else buckets.set(key, [view]);
  }
  return [...buckets.entries()]
    .map(([name, list]) => ({ name, views: list }))
    .sort((a, b) => {
      if (a.name === "") return 1;
      if (b.name === "") return -1;
      return a.name.localeCompare(b.name);
    });
}

/** Distinct group names in node order (excluding the empty group). */
export function groupNames(views: NodeView[]): string[] {
  const names = new Set<string>();
  for (const view of views) if (view.node.group) names.add(view.node.group);
  return [...names];
}
