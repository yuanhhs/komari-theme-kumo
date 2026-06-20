"use client";

import { cn, Badge } from "@cloudflare/kumo";
import { ArrowUpIcon, ArrowDownIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { StatusDot, UsageBar } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { OsIcon } from "@/components/ui/os-icon";
import { useSettings } from "@/components/providers";
import type { NodeView } from "@/lib/types";
import {
  formatPercent,
  formatSpeed,
  formatUptime,
  loadLevel,
  ratioPercent,
} from "@/lib/format";

function MiniMetric({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="w-24">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-kumo-subtle text-[10px] font-medium tracking-wide uppercase">
          {label}
        </span>
        <span className="text-kumo-default text-[11px] font-semibold tabular-nums">
          {formatPercent(percent, 0)}
        </span>
      </div>
      <UsageBar percent={percent} level={loadLevel(percent)} />
    </div>
  );
}

function NodeRow({
  view,
  onOpen,
}: {
  view: NodeView;
  onOpen: (uuid: string) => void;
}) {
  const { t } = useSettings();
  const { node, status, online } = view;
  const memPct = ratioPercent(status?.ram ?? 0, status?.ram_total || node.mem_total);
  const diskPct = ratioPercent(status?.disk ?? 0, status?.disk_total || node.disk_total);
  const swapTotal = status?.swap_total ?? node.swap_total ?? 0;
  const swapPct = ratioPercent(status?.swap ?? 0, swapTotal);
  const open = () => onOpen(node.uuid);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "hover:bg-kumo-tint focus-visible:bg-kumo-tint flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors outline-none",
        !online && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <StatusDot online={online} />
        <div className="min-w-0">
          <span className="text-kumo-default block truncate text-sm font-medium" title={node.name}>
            {node.name}
          </span>
          <span className="text-kumo-subtle flex items-center gap-1 truncate text-xs">
            <OsIcon os={node.os} size={11} className="shrink-0 opacity-80" />
            <span className="truncate">{node.os}</span>
          </span>
        </div>
      </div>

      <span className="hidden w-8 shrink-0 items-center justify-center sm:flex">
        {node.region ? <RegionFlag region={node.region} /> : null}
      </span>

      <div className="hidden w-20 shrink-0 sm:block">
        {node.group ? (
          <Badge variant="secondary" className="max-w-full truncate">
            {node.group}
          </Badge>
        ) : null}
      </div>

      {online && status ? (
        <>
          <div className="hidden md:block">
            <MiniMetric label={t("cpu")} percent={status.cpu} />
          </div>
          <div className="hidden md:block">
            <MiniMetric label={t("memory")} percent={memPct} />
          </div>
          <div className="hidden lg:block">
            <MiniMetric label={t("disk")} percent={diskPct} />
          </div>
          <div className="hidden w-24 xl:block">
            {swapTotal > 0 ? <MiniMetric label={t("swap")} percent={swapPct} /> : null}
          </div>
          <div className="text-kumo-subtle hidden w-28 shrink-0 flex-col gap-0.5 text-xs tabular-nums xl:flex">
            <span className="inline-flex items-center gap-1">
              <ArrowUpIcon size={12} weight="bold" className="text-kumo-info" />
              {formatSpeed(status.net_out)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownIcon size={12} weight="bold" className="text-kumo-success" />
              {formatSpeed(status.net_in)}
            </span>
          </div>
          <span className="text-kumo-subtle hidden w-16 shrink-0 text-right text-xs tabular-nums lg:block">
            {formatUptime(status.uptime)}
          </span>
        </>
      ) : (
        <span className="text-kumo-danger w-auto flex-1 text-right text-xs font-medium md:flex-none">
          {t("offline")}
        </span>
      )}
    </div>
  );
}

export function NodeList({
  views,
  onOpen,
}: {
  views: NodeView[];
  onOpen: (uuid: string) => void;
}) {
  return (
    <Card
      variant="raised"
      className="divide-kumo-hairline kumo-fade-in divide-y overflow-hidden p-0"
    >
      {views.map((view) => (
        <NodeRow key={view.node.uuid} view={view} onOpen={onOpen} />
      ))}
    </Card>
  );
}
