/** Pure helpers that turn raw RPC data into the view models the UI renders. */

import type {
  KomariNode,
  NodeCollection,
  NodeView,
  StatusMap,
  StatusRecord,
} from "./types";

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
  /** mean CPU / memory usage (0-100) across online nodes */
  avgCpu: number;
  avgMemory: number;
}

export function computeStats(views: NodeView[]): DashboardStats {
  const regions = new Set<string>();
  let online = 0;
  let uploadSpeed = 0;
  let downloadSpeed = 0;
  let totalUp = 0;
  let totalDown = 0;
  let cpuSum = 0;
  let memSum = 0;

  for (const { node, status, online: isOnline } of views) {
    if (node.region) regions.add(node.region);
    if (isOnline && status) {
      online += 1;
      uploadSpeed += status.net_out || 0;
      downloadSpeed += status.net_in || 0;
      cpuSum += status.cpu || 0;
      const memTotal = status.ram_total || node.mem_total;
      if (memTotal > 0) memSum += ((status.ram || 0) / memTotal) * 100;
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
    avgCpu: online > 0 ? cpuSum / online : 0,
    avgMemory: online > 0 ? memSum / online : 0,
  };
}

/** Distinct group names in node order (excluding the empty group). */
export function groupNames(views: NodeView[]): string[] {
  const names = new Set<string>();
  for (const view of views) if (view.node.group) names.add(view.node.group);
  return [...names];
}

/** One fleet-wide aggregate sample over time (mirrors the live stat fields). */
export interface StatsSample {
  /** Sample timestamp (ms). */
  t: number;
  avgCpu: number;
  avgMemory: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

interface BucketAcc {
  cpu: number;
  mem: number;
  up: number;
  down: number;
  n: number;
}

/**
 * Collapse per-node history records into a fleet-wide time series: CPU and
 * memory are averaged across nodes, up/down speeds are summed. Records are
 * binned into ~`targetPoints` time buckets so nodes reporting on slightly
 * different clocks still line up. Accepts either response shape of
 * `common:getRecords` (flat array or `{ [uuid]: records }` map).
 */
export function aggregateFleetRecords(
  records: StatusRecord[] | Record<string, StatusRecord[]>,
  targetPoints = 120,
): StatsSample[] {
  const map = Array.isArray(records) ? { _: records } : records;

  let min = Infinity;
  let max = -Infinity;
  const entries: { uuid: string; t: number; r: StatusRecord }[] = [];
  for (const [uuid, recs] of Object.entries(map)) {
    for (const r of recs) {
      const t = new Date(r.time).getTime();
      if (Number.isNaN(t)) continue;
      entries.push({ uuid, t, r });
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  if (entries.length === 0 || !Number.isFinite(min)) return [];

  const span = Math.max(1, max - min);
  const bucketMs = Math.max(1, Math.floor(span / targetPoints));

  // bucket index -> uuid -> running totals
  const buckets = new Map<number, Map<string, BucketAcc>>();
  for (const { uuid, t, r } of entries) {
    const b = Math.floor((t - min) / bucketMs);
    let byNode = buckets.get(b);
    if (!byNode) {
      byNode = new Map();
      buckets.set(b, byNode);
    }
    let acc = byNode.get(uuid);
    if (!acc) {
      acc = { cpu: 0, mem: 0, up: 0, down: 0, n: 0 };
      byNode.set(uuid, acc);
    }
    acc.cpu += r.cpu || 0;
    acc.mem += r.ram_total > 0 ? ((r.ram || 0) / r.ram_total) * 100 : 0;
    acc.up += r.net_out || 0;
    acc.down += r.net_in || 0;
    acc.n += 1;
  }

  const samples: StatsSample[] = [];
  for (const [b, byNode] of [...buckets.entries()].sort((a, z) => a[0] - z[0])) {
    let cpu = 0;
    let mem = 0;
    let up = 0;
    let down = 0;
    let nodes = 0;
    for (const acc of byNode.values()) {
      // Per-node average within the bucket first, then combine across nodes.
      cpu += acc.cpu / acc.n;
      mem += acc.mem / acc.n;
      up += acc.up / acc.n;
      down += acc.down / acc.n;
      nodes += 1;
    }
    samples.push({
      t: min + b * bucketMs + bucketMs / 2,
      avgCpu: nodes > 0 ? cpu / nodes : 0,
      avgMemory: nodes > 0 ? mem / nodes : 0,
      uploadSpeed: up,
      downloadSpeed: down,
    });
  }
  return samples;
}
