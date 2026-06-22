/** Pure helpers that turn raw RPC data into the view models the UI renders. */

import type { KomariNode, NodeCollection, NodeView, StatusMap } from "./types";

/**
 * Join nodes with their latest status and drop hidden nodes, using the
 * dashboard order saved by the backend (`weight`).
 */
export function buildNodeViews(
  nodes: NodeCollection | undefined,
  status: StatusMap | undefined,
): NodeView[] {
  if (!nodes) return [];
  return normalizeNodes(nodes)
    .filter((node) => !node.hidden)
    .sort(compareNodesByWeight)
    .map((node) => {
      const s = status?.[node.uuid];
      return { node, status: s, online: Boolean(s?.online) } satisfies NodeView;
    });
}

function normalizeNodes(nodes: NodeCollection): KomariNode[] {
  return Array.isArray(nodes) ? [...nodes] : Object.values(nodes);
}

function compareNodesByWeight(a: KomariNode, b: KomariNode): number {
  const byWeight = (a.weight ?? 0) - (b.weight ?? 0);
  if (byWeight !== 0) return byWeight;

  const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (!Number.isNaN(byCreatedAt) && byCreatedAt !== 0) return byCreatedAt;

  return a.uuid.localeCompare(b.uuid);
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

/** Distinct group names in node order (excluding the empty group). */
export function groupNames(views: NodeView[]): string[] {
  const names = new Set<string>();
  for (const view of views) if (view.node.group) names.add(view.node.group);
  return [...names];
}
