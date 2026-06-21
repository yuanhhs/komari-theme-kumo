"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
import type { NodeView, StatusRecord } from "@/lib/types";
import {
  formatBytes,
  formatDate,
  formatPercent,
  formatSpeed,
  formatTemp,
  formatUptime,
  ratioPercent,
} from "@/lib/format";

type Range = "1" | "6" | "24";
type MotionPhase = "idle" | "entering" | "open" | "closing";

const DETAIL_MOTION_MS = 240;

function motionVars(origin: DOMRect, target: DOMRect): CSSProperties {
  return {
    "--detail-x": `${origin.left - target.left}px`,
    "--detail-y": `${origin.top - target.top}px`,
    "--detail-scale-x": String(Math.max(0.08, origin.width / target.width)),
    "--detail-scale-y": String(Math.max(0.08, origin.height / target.height)),
  } as CSSProperties;
}

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
  const [motionStyle, setMotionStyle] = useState<CSSProperties>({});
  const hours = Number(range);
  const uuid = view?.node.uuid;
  const originKey = useMemo(
    () =>
      origin
        ? `${origin.left}:${origin.top}:${origin.width}:${origin.height}`
        : "none",
    [origin],
  );

  const loadQuery = useLoadRecords(uuid, hours, "all", open && !!uuid);
  const pingQuery = usePingRecords(uuid, hours, open && !!uuid);
  const colors = chartColors(mode);

  useEffect(() => {
    if (!open) {
      setMotionPhase("idle");
      setMotionStyle({});
      return;
    }

    if (!origin) {
      setMotionPhase("open");
      setMotionStyle({});
      return;
    }

    let measureFrame = 0;
    let openFrame = 0;
    setMotionPhase("entering");
    measureFrame = requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(".node-detail-motion-panel");
      if (!panel) {
        setMotionPhase("open");
        return;
      }
      setMotionStyle(motionVars(origin, panel.getBoundingClientRect()));
      openFrame = requestAnimationFrame(() => setMotionPhase("open"));
    });

    return () => {
      cancelAnimationFrame(measureFrame);
      cancelAnimationFrame(openFrame);
    };
  }, [open, origin, originKey]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (!origin) {
      onOpenChange(false);
      return;
    }

    const panel = document.querySelector<HTMLElement>(".node-detail-motion-panel");
    if (!panel) {
      onOpenChange(false);
      return;
    }
    setMotionStyle(motionVars(origin, panel.getBoundingClientRect()));
    setMotionPhase("closing");
    window.setTimeout(() => onOpenChange(false), DETAIL_MOTION_MS);
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
      color: colors.warning,
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
        style={motionStyle}
        className={cn(
          "node-detail-motion-panel w-full max-w-4xl p-0",
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
              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-colors"
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
              {pingSeries.length > 0 ? (
                <Panel title={t("latency")} icon={<Activity size={13} />} className="lg:col-span-2">
                  <TimeSeriesChart
                    series={pingSeries}
                    mode={mode}
                    valueFormatter={(v) => `${Math.round(v)} ms`}
                  />
                </Panel>
              ) : null}
            </div>

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
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
