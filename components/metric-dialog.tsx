"use client";

import { useMemo, type ReactNode } from "react";
import { Dialog, Badge } from "@cloudflare/kumo";
import {
  XIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Cpu, MemoryStick } from "lucide-react";
import { StatusDot, UsageBar } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { TimeSeriesChart, type ChartSeries } from "@/components/charts/time-series-chart";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import type { DashboardStats } from "@/lib/aggregate";
import type { StatsSample } from "@/hooks/useStatsHistory";
import type { NodeView } from "@/lib/types";
import {
  formatBytes,
  formatPercent,
  formatSpeed,
  loadLevel,
  ratioPercent,
} from "@/lib/format";

export type MetricKind = "speed" | "cpu" | "memory";

interface MetricRowData {
  uuid: string;
  name: string;
  region: string;
  /** Usage percent (cpu/memory) or combined speed (speed), used for ranking. */
  rank: number;
  percent: number;
  up: number;
  down: number;
}

const METRIC_ICON: Record<MetricKind, ReactNode> = {
  speed: <ArrowsDownUpIcon size={20} className="text-kumo-brand" weight="fill" />,
  cpu: <Cpu size={18} className="text-kumo-brand" />,
  memory: <MemoryStick size={18} className="text-kumo-brand" />,
};

function memPercent(view: NodeView): number {
  const { node, status } = view;
  if (!status) return 0;
  return ratioPercent(status.ram, status.ram_total || node.mem_total);
}

/** Build the ranked per-node rows for a metric (online nodes only). */
function buildRows(views: NodeView[], metric: MetricKind): MetricRowData[] {
  const rows: MetricRowData[] = [];
  for (const view of views) {
    const { node, status, online } = view;
    if (!online || !status) continue;
    const percent = metric === "cpu" ? status.cpu : memPercent(view);
    const up = status.net_out || 0;
    const down = status.net_in || 0;
    rows.push({
      uuid: node.uuid,
      name: node.name,
      region: node.region,
      rank: metric === "speed" ? up + down : percent,
      percent,
      up,
      down,
    });
  }
  return rows.sort((a, b) => b.rank - a.rank);
}

function UpDown({ up, down }: { up: string; down: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
      <span className="inline-flex items-center gap-0.5">
        <ArrowUpIcon size={12} weight="bold" className="text-kumo-info" />
        {up}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <ArrowDownIcon size={12} weight="bold" className="text-kumo-success" />
        {down}
      </span>
    </span>
  );
}

function SummaryStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-kumo-tint min-w-0 rounded-lg px-3 py-2.5">
      <div className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="text-kumo-default mt-1 text-sm font-semibold tabular-nums">
        {children}
      </div>
    </div>
  );
}

function MetricSummary({ metric, stats }: { metric: MetricKind; stats: DashboardStats }) {
  const { t } = useSettings();

  if (metric === "speed") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SummaryStat label={t("networkSpeed")}>
          <UpDown up={formatSpeed(stats.uploadSpeed)} down={formatSpeed(stats.downloadSpeed)} />
        </SummaryStat>
        {/* Total traffic moved here from the overview bar. */}
        <SummaryStat label={t("trafficOverview")}>
          <UpDown up={formatBytes(stats.totalUp)} down={formatBytes(stats.totalDown)} />
        </SummaryStat>
      </div>
    );
  }

  const avg = metric === "cpu" ? stats.avgCpu : stats.avgMemory;
  return (
    <div className="bg-kumo-tint rounded-lg px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
          {t("average")}
        </span>
        <span className="text-kumo-default text-sm font-semibold tabular-nums">
          {formatPercent(avg, 1)}
        </span>
      </div>
      <UsageBar percent={avg} level={loadLevel(avg)} className="mt-2" />
    </div>
  );
}

function NodeRow({ row, metric }: { row: MetricRowData; metric: MetricKind }) {
  return (
    <div className="bg-kumo-tint flex min-w-0 items-center gap-2 rounded-lg px-3 py-2">
      <StatusDot online />
      <RegionFlag region={row.region} />
      <span className="text-kumo-default min-w-0 flex-1 truncate text-xs font-medium">
        {row.name}
      </span>
      {metric === "speed" ? (
        <span className="text-kumo-default shrink-0 text-xs font-semibold">
          <UpDown up={formatSpeed(row.up)} down={formatSpeed(row.down)} />
        </span>
      ) : (
        <span className="text-kumo-default shrink-0 text-xs font-semibold tabular-nums">
          {formatPercent(row.percent, 0)}
        </span>
      )}
    </div>
  );
}

/**
 * Drill-down dialog opened from an overview stat tile. Shows an aggregate
 * summary, a fleet-wide time-series chart (same type as the node detail page,
 * fed by an in-memory rolling history), and a per-node ranking. The
 * network-speed view also carries the total-traffic figures that used to sit
 * in the overview bar.
 */
export function MetricDialog({
  metric,
  views,
  stats,
  history,
  onOpenChange,
}: {
  metric: MetricKind | null;
  views: NodeView[];
  stats: DashboardStats;
  history: StatsSample[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t, mode } = useSettings();
  const rows = useMemo(
    () => (metric ? buildRows(views, metric) : []),
    [views, metric],
  );

  const series = useMemo<ChartSeries[]>(() => {
    if (!metric) return [];
    const colors = chartColors(mode);
    if (metric === "speed") {
      return [
        { name: t("upload"), color: colors.up, data: history.map((s) => [s.t, s.uploadSpeed]) },
        { name: t("download"), color: colors.down, data: history.map((s) => [s.t, s.downloadSpeed]) },
      ];
    }
    return [
      {
        name: metric === "cpu" ? t("cpu") : t("memory"),
        color: colors.brand,
        area: true,
        data: history.map((s) => [s.t, metric === "cpu" ? s.avgCpu : s.avgMemory]),
      },
    ];
  }, [metric, history, mode, t]);

  const title = metric === "speed" ? t("networkSpeed") : metric === "cpu" ? t("cpu") : t("memory");
  const isSpeed = metric === "speed";

  return (
    <Dialog.Root open={metric !== null} onOpenChange={onOpenChange}>
      <Dialog size="base" className="kumo-dialog-surface w-full max-w-lg p-0">
        {metric ? (
          <div className="flex max-h-[85vh] flex-col">
            <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-5 py-4">
              <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
                {METRIC_ICON[metric]}
                {title}
                <Badge variant="secondary">{rows.length}</Badge>
              </Dialog.Title>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t("close")}
                className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-[color,background-color] duration-100"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <MetricSummary metric={metric} stats={stats} />

              {history.length > 1 ? (
                <TimeSeriesChart
                  series={series}
                  mode={mode}
                  yMax={isSpeed ? undefined : 100}
                  valueFormatter={
                    isSpeed ? (v) => formatSpeed(v, 0) : (v) => `${Math.round(v)}%`
                  }
                />
              ) : (
                <div className="text-kumo-inactive flex h-[180px] items-center justify-center text-sm">
                  {t("loading")}
                </div>
              )}

              {rows.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-kumo-subtle text-xs font-semibold tracking-wide uppercase">
                    {t("byNode")}
                  </div>
                  <div className="space-y-2">
                    {rows.map((row) => (
                      <NodeRow key={row.uuid} row={row} metric={metric} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Dialog>
    </Dialog.Root>
  );
}
