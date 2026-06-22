"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, Badge, cn } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import {
  Cpu,
  MemoryStick,
  ReplaceAll,
  HardDrive,
  ArrowDownUp,
  Network,
  ListTree,
  Clock,
  Gauge,
  Thermometer,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { OsIcon } from "@/components/ui/os-icon";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart, type ChartSeries } from "@/components/charts/time-series-chart";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import { useLoadRecords, usePingRecords } from "@/hooks/useKomari";
import type { NodeView, PingSummary, StatusRecord } from "@/lib/types";
import {
  formatBytes,
  formatDate,
  formatPercent,
  formatSpeed,
  formatTemp,
  formatUptime,
  ratioPercent,
} from "@/lib/format";
import { trafficUsedByType } from "@/lib/traffic";

type Range = "1" | "6" | "24";
type MotionPhase = "idle" | "entering" | "open" | "closing";

const DETAIL_MOTION_MS = 110;

function Chip({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="bg-kumo-tint flex flex-col gap-0.5 rounded-lg px-3 py-2">
      <span className="text-kumo-subtle flex items-center gap-1 text-[11px] tracking-wide uppercase">
        {icon}
        {label}
      </span>
      <span className="text-kumo-default text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
  icon,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <Card variant="flat" className={cn("p-4", className)}>
      <div className="text-kumo-subtle mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="border-kumo-hairline flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-kumo-subtle flex shrink-0 items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-kumo-default text-right text-xs font-medium break-all">
        {value}
      </span>
    </div>
  );
}

function NoData({ label }: { label: string }) {
  return (
    <div className="text-kumo-inactive flex h-[180px] items-center justify-center text-sm">
      {label}
    </div>
  );
}

const ts = (r: { time: string }) => new Date(r.time).getTime();

function latencyColor(ping: PingSummary, colors: ReturnType<typeof chartColors>): string {
  if (ping.latest < 0 || ping.loss >= 50 || ping.avg >= 250) return colors.danger;
  if (ping.loss >= 10 || ping.avg >= 120) return colors.warning;
  return colors.success;
}

function formatLatency(value: number): string {
  return value >= 0 ? `${Math.round(value)} ms` : "—";
}

function LatencyOverview({
  ping,
  colors,
}: {
  ping: Record<string, PingSummary> | undefined;
  colors: ReturnType<typeof chartColors>;
}) {
  const entries = Object.entries(ping ?? {}).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );
  if (entries.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([taskId, item]) => {
        const color = latencyColor(item, colors);
        return (
          <div
            key={taskId}
            className="bg-kumo-tint border-kumo-hairline flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-kumo-default truncate text-sm font-semibold">
                {item.name}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                style={{ color }}
              >
                {formatLatency(item.latest)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-kumo-subtle">Avg</div>
                <div className="text-kumo-default font-medium tabular-nums">
                  {formatLatency(item.avg)}
                </div>
              </div>
              <div>
                <div className="text-kumo-subtle">Loss</div>
                <div className="text-kumo-default font-medium tabular-nums">
                  {item.loss.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-kumo-subtle">Min / Max</div>
                <div className="text-kumo-default font-medium tabular-nums">
                  {Math.round(item.min)} / {Math.round(item.max)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrafficSummary({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-kumo-tint rounded-lg px-3 py-2">
      <div className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div
        className="text-kumo-default mt-1 text-sm font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function NodeDetailDialog({
  view,
  open,
  origin,
  onOpenChange,
}: {
  view: NodeView | null;
  open: boolean;
  origin?: DOMRect | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, mode, lang } = useSettings();
  const [range, setRange] = useState<Range>("6");
  const [motionPhase, setMotionPhase] = useState<MotionPhase>("idle");
  const closeTimerRef = useRef<number | null>(null);
  const hours = Number(range);
  const uuid = view?.node.uuid;

  const loadQuery = useLoadRecords(uuid, hours, "all", open && !!uuid);
  const pingQuery = usePingRecords(uuid, hours, open && !!uuid);
  const colors = chartColors(mode);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setMotionPhase("idle");
      return;
    }

    let openFrame = 0;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMotionPhase("entering");
    openFrame = requestAnimationFrame(() => setMotionPhase("open"));

    return () => {
      cancelAnimationFrame(openFrame);
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      onOpenChange(true);
      return;
    }
    setMotionPhase("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange(false);
    }, DETAIL_MOTION_MS);
  };

  if (!view) return null;
  const { node, status, online } = view;

  // The live server returns load records as a { [uuid]: StatusRecord[] } map
  // even for a single node; fall back to a flat array just in case.
  const loadData = loadQuery.data?.records;
  const records: StatusRecord[] = (
    Array.isArray(loadData) ? loadData : (loadData?.[node.uuid] ?? [])
  )
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));

  const cpuRam: ChartSeries[] = [
    { name: t("cpu"), color: colors.brand, area: true, data: records.map((r) => [ts(r), r.cpu]) },
    {
      name: t("memory"),
      color: colors.info,
      area: true,
      data: records.map((r) => [ts(r), ratioPercent(r.ram, r.ram_total)]),
    },
  ];
  if (node.swap_total > 0) {
    cpuRam.push({
      name: t("swap"),
      color: colors.success,
      data: records.map((r) => [ts(r), ratioPercent(r.swap, r.swap_total)]),
    });
  }
  const netSeries: ChartSeries[] = [
    { name: t("upload"), color: colors.up, data: records.map((r) => [ts(r), r.net_out]) },
    { name: t("download"), color: colors.down, data: records.map((r) => [ts(r), r.net_in]) },
  ];
  const connSeries: ChartSeries[] = [
    { name: "TCP", color: colors.brand, area: true, data: records.map((r) => [ts(r), r.connections]) },
    { name: "UDP", color: colors.info, data: records.map((r) => [ts(r), r.connections_udp]) },
  ];
  const procSeries: ChartSeries[] = [
    {
      name: t("processes"),
      color: colors.success,
      area: true,
      data: records.map((r) => [ts(r), r.process]),
    },
  ];

  const pingPalette = [colors.brand, colors.info, colors.success, colors.warning, colors.danger];
  const byTask = new Map<number, [number, number][]>();
  for (const r of [...(pingQuery.data?.records ?? [])].sort((a, b) =>
    a.time.localeCompare(b.time),
  )) {
    if (r.value < 0) continue;
    const arr = byTask.get(r.task_id) ?? [];
    arr.push([new Date(r.time).getTime(), r.value]);
    byTask.set(r.task_id, arr);
  }
  const pingSeries: ChartSeries[] = [...byTask.entries()].map(([id, data], i) => ({
    name: status?.ping?.[String(id)]?.name ?? `#${id}`,
    color: pingPalette[i % pingPalette.length],
    data,
  }));

  const hasLoad = records.length > 0;
  const expiry = formatDate(node.expired_at, lang);
  const trafficLimit = node.traffic_limit ?? 0;
  const trafficUsed = status
    ? trafficUsedByType(
        node.traffic_limit_type,
        status.net_total_up ?? 0,
        status.net_total_down ?? 0,
      )
    : 0;
  const trafficPercent = trafficLimit > 0 ? (trafficUsed / trafficLimit) * 100 : 0;
  const trafficRemaining = trafficLimit > 0 ? Math.max(0, trafficLimit - trafficUsed) : 0;
  const trafficColor =
    trafficPercent >= 100
      ? colors.danger
      : trafficPercent >= 80
        ? colors.warning
        : colors.info;

  // Quick-stat chips: only include metrics the agent actually reports
  // (e.g. hide temperature / swap when there's no reading instead of showing "—").
  const chips: { label: string; value: ReactNode; icon: ReactNode }[] = [];
  if (status) {
    if (status.uptime)
      chips.push({
        label: t("uptime"),
        value: formatUptime(status.uptime),
        icon: <Clock size={12} />,
      });
    chips.push({
      label: t("load"),
      value: `${status.load.toFixed(2)} / ${status.load5.toFixed(2)} / ${status.load15.toFixed(2)}`,
      icon: <Gauge size={12} />,
    });
    if (status.process > 0)
      chips.push({ label: t("processes"), value: status.process, icon: <ListTree size={12} /> });
    if (status.connections > 0 || status.connections_udp > 0)
      chips.push({
        label: t("connections"),
        value: `${status.connections} / ${status.connections_udp}`,
        icon: <Network size={12} />,
      });
    if (node.swap_total > 0)
      chips.push({
        label: t("swap"),
        value: formatPercent(ratioPercent(status.swap, status.swap_total), 0),
        icon: <ReplaceAll size={12} />,
      });
    if (status.temp > 0)
      chips.push({
        label: t("temperature"),
        value: formatTemp(status.temp),
        icon: <Thermometer size={12} />,
      });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog
        size="xl"
        className={cn(
          "node-detail-motion-panel kumo-dialog-surface w-full max-w-4xl p-0",
          motionPhase === "entering" && "node-detail-motion-from",
          motionPhase === "open" && "node-detail-motion-open",
          motionPhase === "closing" && "node-detail-motion-to",
        )}
      >
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <StatusDot online={online} />
              <div className="min-w-0">
                <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
                  <span className="truncate">{node.name}</span>
                  {node.region ? <RegionFlag region={node.region} /> : null}
                </Dialog.Title>
                <div className="text-kumo-subtle truncate text-xs">{node.cpu_name}</div>
              </div>
              {node.group ? <Badge variant="secondary">{node.group}</Badge> : null}
              <Badge variant={online ? "primary" : "destructive"}>
                {online ? t("online") : t("offline")}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              aria-label={t("close")}
              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-[color,background-color] duration-100"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {/* Live quick stats (only metrics the agent reports) */}
            {chips.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {chips.map((c) => (
                  <Chip key={c.label} label={c.label} value={c.value} icon={c.icon} />
                ))}
              </div>
            ) : null}

            {/* Range selector */}
            <div className="flex items-center justify-end">
              <Segmented<Range>
                value={range}
                onChange={setRange}
                size="sm"
                options={[
                  { value: "1", label: t("range1h") },
                  { value: "6", label: t("range6h") },
                  { value: "24", label: t("range24h") },
                ]}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={
                  node.swap_total > 0
                    ? `${t("cpu")} / ${t("memory")} / ${t("swap")}`
                    : `${t("cpu")} / ${t("memory")}`
                }
                icon={
                  <span className="flex items-center gap-1">
                    <Cpu size={13} />
                    <MemoryStick size={13} />
                    {node.swap_total > 0 ? <ReplaceAll size={13} /> : null}
                  </span>
                }
              >
                {hasLoad ? (
                  <TimeSeriesChart
                    series={cpuRam}
                    mode={mode}
                    yMax={100}
                    valueFormatter={(v) => `${Math.round(v)}%`}
                  />
                ) : (
                  <NoData label={t("loading")} />
                )}
              </Panel>
              <Panel title={t("networkSpeed")} icon={<ArrowDownUp size={13} />}>
                {hasLoad ? (
                  <TimeSeriesChart
                    series={netSeries}
                    mode={mode}
                    valueFormatter={(v) => formatSpeed(v, 0)}
                  />
                ) : (
                  <NoData label={t("loading")} />
                )}
              </Panel>
              <Panel title={t("connections")} icon={<Network size={13} />}>
                {hasLoad ? (
                  <TimeSeriesChart
                    series={connSeries}
                    mode={mode}
                    valueFormatter={(v) => String(Math.round(v))}
                  />
                ) : (
                  <NoData label={t("loading")} />
                )}
              </Panel>
              <Panel title={t("processes")} icon={<ListTree size={13} />}>
                {hasLoad ? (
                  <TimeSeriesChart
                    series={procSeries}
                    mode={mode}
                    valueFormatter={(v) => String(Math.round(v))}
                  />
                ) : (
                  <NoData label={t("loading")} />
                )}
              </Panel>
            </div>

            {status ? (
              <Panel title={t("traffic")} icon={<ArrowDownUp size={13} />}>
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <TrafficSummary
                      label={t("upload")}
                      value={formatBytes(status.net_total_up)}
                      accent={colors.up}
                    />
                    <TrafficSummary
                      label={t("download")}
                      value={formatBytes(status.net_total_down)}
                      accent={colors.down}
                    />
                    {trafficLimit > 0 ? (
                      <>
                        <TrafficSummary
                          label={`${t("used")} (${node.traffic_limit_type})`}
                          value={`${formatBytes(trafficUsed)} · ${formatPercent(trafficPercent, 0)}`}
                          accent={trafficColor}
                        />
                        <TrafficSummary
                          label={t("remaining")}
                          value={`${formatBytes(trafficRemaining)} / ${formatBytes(trafficLimit)}`}
                        />
                      </>
                    ) : (
                      <>
                        <TrafficSummary
                          label={t("used")}
                          value={formatBytes(status.net_total_up + status.net_total_down)}
                        />
                        <TrafficSummary label={t("limit")} value={t("unlimited")} />
                      </>
                    )}
                  </div>
                </div>
              </Panel>
            ) : null}

            {/* System info */}
            <Panel title={t("system")}>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow
                    label={t("os")}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <OsIcon os={node.os} size={13} className="opacity-80" />
                        {node.os}
                      </span>
                    }
                  />
                  <InfoRow label={t("kernel")} value={node.kernel_version} />
                  <InfoRow label={t("arch")} value={node.arch} />
                  <InfoRow label={t("virtualization")} value={node.virtualization} />
                </div>
                <div>
                  <InfoRow
                    label={t("cores")}
                    icon={<Cpu size={12} />}
                    value={
                      node.cpu_physical_cores
                        ? `${node.cpu_cores} / ${node.cpu_physical_cores}`
                        : String(node.cpu_cores)
                    }
                  />
                  <InfoRow label={t("memory")} icon={<MemoryStick size={12} />} value={formatBytes(node.mem_total)} />
                  {node.swap_total > 0 ? (
                    <InfoRow
                      label={t("swap")}
                      icon={<ReplaceAll size={12} />}
                      value={formatBytes(node.swap_total)}
                    />
                  ) : null}
                  <InfoRow label={t("disk")} icon={<HardDrive size={12} />} value={formatBytes(node.disk_total)} />
                  {node.price > 0 ? (
                    <InfoRow
                      label={t("price")}
                      value={`${node.currency}${node.price} · ${t("days", { count: node.billing_cycle })}`}
                    />
                  ) : null}
                  {expiry ? <InfoRow label={t("expiresAt")} value={expiry} /> : null}
                </div>
              </div>
            </Panel>

            {(status?.ping && Object.keys(status.ping).length > 0) || pingSeries.length > 0 ? (
              <Panel title={t("networkLatency")} icon={<Activity size={13} />}>
                <div className="space-y-4">
                  <LatencyOverview ping={status?.ping} colors={colors} />
                  {pingSeries.length > 0 ? (
                    <TimeSeriesChart
                      series={pingSeries}
                      mode={mode}
                      valueFormatter={(v) => `${Math.round(v)} ms`}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
