"use client";

import type { ReactNode } from "react";
import { cn, Badge } from "@cloudflare/kumo";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  DatabaseIcon,
  HourglassIcon,
} from "@phosphor-icons/react";
import { Cpu, MemoryStick, ReplaceAll, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UsageBar } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { OsIcon } from "@/components/ui/os-icon";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import { relativeFromSeconds } from "@/lib/i18n";
import type { NodeView } from "@/lib/types";
import { trafficUsedByType } from "@/lib/traffic";
import {
  daysUntil,
  formatBytes,
  formatPercent,
  formatSpeed,
  formatUptime,
  loadLevel,
  ratioPercent,
  secondsSince,
  splitBytes,
} from "@/lib/format";

/** Network speed (bytes/s) → 0..1 ring fill, log-scaled so idle reads near-empty
 *  and a busy ~100 MB/s link reads full. */
const SPEED_FULL = 100 * 1024 * 1024;
function speedFraction(bytesPerSec: number): number {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return 0;
  return Math.min(1, Math.log10(bytesPerSec + 1) / Math.log10(SPEED_FULL));
}

function MetricRow({
  label,
  percent,
  detail,
  icon,
}: {
  label: string;
  percent: number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-kumo-subtle flex items-center" title={label}>
          {icon ?? label}
        </span>
        <span className="text-kumo-default text-xs font-semibold tabular-nums">
          {detail ?? formatPercent(percent, 0)}
        </span>
      </div>
      <UsageBar percent={percent} level={loadLevel(percent)} />
    </div>
  );
}

export function NodeCard({
  view,
  onOpen,
}: {
  view: NodeView;
  onOpen: (uuid: string, origin?: DOMRect) => void;
}) {
  const { t, lang, mode } = useSettings();
  const colors = chartColors(mode);
  const { node, status, online } = view;

  const memTotal = status?.ram_total || node.mem_total;
  const diskTotal = status?.disk_total || node.disk_total;
  const cpu = status?.cpu ?? 0;
  const memPct = ratioPercent(status?.ram ?? 0, memTotal);
  const diskPct = ratioPercent(status?.disk ?? 0, diskTotal);
  const swapTotal = status?.swap_total ?? node.swap_total ?? 0;
  const swapPct = ratioPercent(status?.swap ?? 0, swapTotal);
  const trafficLimit = node.traffic_limit ?? 0;
  const trafficUsed = status
    ? trafficUsedByType(
        node.traffic_limit_type,
        status.net_total_up ?? 0,
        status.net_total_down ?? 0,
      )
    : 0;
  const hasTrafficLimit = trafficLimit > 0;
  const trafficFraction = hasTrafficLimit ? Math.max(0, trafficUsed / trafficLimit) : 0;
  const trafficPercent = trafficFraction * 100;
  const trafficColor =
    trafficPercent >= 100
      ? colors.danger
      : trafficPercent >= 80
        ? colors.warning
        : colors.info;

  // Expiry countdown ring: fills with days left over the billing cycle and
  // shifts amber/red as it nears expiry. No expiry date → a full "∞" ring.
  const daysLeft = daysUntil(node.expired_at);
  const cycleDays = node.billing_cycle > 0 ? node.billing_cycle : 30;
  const hasExpiry = daysLeft !== null;
  const expiryFraction = hasExpiry ? Math.max(0, Math.min(1, daysLeft / cycleDays)) : 1;
  const expiryColor = !hasExpiry
    ? colors.success
    : daysLeft <= 3
      ? colors.danger
      : daysLeft <= 14
        ? colors.warning
        : colors.success;
  const expiryCaption = !hasExpiry
    ? "∞"
    : daysLeft <= 0
      ? t("expired")
      : t("days", { count: daysLeft });

  const open = (element: HTMLElement) => onOpen(node.uuid, element.getBoundingClientRect());

  return (
    <Card
      variant="raised"
      role="button"
      tabIndex={0}
      onClick={(e) => open(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e.currentTarget);
        }
      }}
      className={cn(
        "kumo-fade-in flex cursor-pointer flex-col gap-3 p-4 transition-[transform,box-shadow,border-color,background-color] duration-150 ease-out will-change-transform",
        "hover:ring-kumo-line hover:-translate-y-0.5 hover:ring-2",
        "focus-visible:ring-kumo-focus focus-visible:ring-2 focus-visible:outline-none",
        !online && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="text-kumo-default min-w-0 truncate text-sm font-semibold"
            title={node.name}
          >
            {node.name}
          </span>
          {node.group ? (
            <Badge variant="secondary" className="max-w-[6rem] shrink-0 truncate">
              {node.group}
            </Badge>
          ) : null}
        </div>
        {/* System icon + flag, right-aligned (full OS name on hover) */}
        <div className="text-kumo-subtle flex shrink-0 items-center gap-1.5" title={node.os}>
          <OsIcon os={node.os} size={16} className="shrink-0" />
          {node.region ? <RegionFlag region={node.region} /> : null}
        </div>
      </div>

      {online && status ? (
        <>
          <div className="space-y-2.5">
            <MetricRow label={t("cpu")} percent={cpu} icon={<Cpu size={14} />} />
            <MetricRow
              label={t("memory")}
              percent={memPct}
              detail={formatPercent(memPct, 0)}
              icon={<MemoryStick size={14} />}
            />
            {swapTotal > 0 ? (
              <MetricRow
                label={t("swap")}
                percent={swapPct}
                detail={formatPercent(swapPct, 0)}
                icon={<ReplaceAll size={14} />}
              />
            ) : null}
            <MetricRow
              label={t("disk")}
              percent={diskPct}
              detail={formatPercent(diskPct, 0)}
              icon={<HardDrive size={14} />}
            />
          </div>

          <div className="border-kumo-hairline border-t pt-3">
            <div
              className={cn(
                "grid place-items-center gap-2",
                hasTrafficLimit ? "grid-cols-4" : "grid-cols-3",
              )}
            >
              <CircularGauge
                fraction={speedFraction(status.net_out)}
                color={colors.up}
                title={t("upload")}
                center={<ArrowUpIcon size={16} weight="bold" color={colors.up} />}
                caption={formatSpeed(status.net_out)}
              />
              <CircularGauge
                fraction={speedFraction(status.net_in)}
                color={colors.down}
                title={t("download")}
                center={<ArrowDownIcon size={16} weight="bold" color={colors.down} />}
                caption={formatSpeed(status.net_in)}
              />
              {hasTrafficLimit ? (
                <CircularGauge
                  fraction={trafficFraction}
                  color={trafficColor}
                  title={`${t("traffic")} (${node.traffic_limit_type}): ${formatBytes(trafficUsed)} / ${formatBytes(trafficLimit)}`}
                  center={<DatabaseIcon size={15} weight="bold" color={trafficColor} />}
                  caption={formatPercent(trafficPercent, 0)}
                />
              ) : null}
              <CircularGauge
                fraction={expiryFraction}
                color={expiryColor}
                title={hasExpiry ? t("expiresAt") : t("neverExpires")}
                center={<HourglassIcon size={15} weight="bold" color={expiryColor} />}
                caption={expiryCaption}
              />
            </div>
          </div>
          {status.uptime ? (
            <div className="text-kumo-subtle mt-auto flex items-center justify-center gap-1 text-[10px] tabular-nums">
              <ClockIcon size={11} weight="bold" />
              {formatUptime(status.uptime)}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex h-[7.5rem] flex-col items-center justify-center gap-1 text-center">
          <span className="text-kumo-danger text-sm font-medium">{t("offline")}</span>
          {status ? (
            <span className="text-kumo-subtle text-xs">
              {t("lastReport")}: {relativeFromSeconds(lang, secondsSince(status.time))}
            </span>
          ) : null}
          <OfflineFootprint memTotal={memTotal} diskTotal={diskTotal} />
        </div>
      )}
    </Card>
  );
}

function OfflineFootprint({
  memTotal,
  diskTotal,
}: {
  memTotal: number;
  diskTotal: number;
}) {
  const [memValue, memUnit] = splitBytes(memTotal, 0);
  const [diskValue, diskUnit] = splitBytes(diskTotal, 0);
  return (
    <span className="text-kumo-inactive mt-1 text-xs tabular-nums">
      {memValue} {memUnit} RAM · {diskValue} {diskUnit} disk
    </span>
  );
}
