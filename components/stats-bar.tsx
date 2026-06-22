"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@cloudflare/kumo";
import {
  PulseIcon,
  GlobeIcon,
  ArrowsDownUpIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { RegionDialog } from "@/components/region-dialog";
import { useSettings } from "@/components/providers";
import type { DashboardStats } from "@/lib/aggregate";
import type { NodeView } from "@/lib/types";
import { formatBytes, formatSpeed } from "@/lib/format";

function StatTile({
  icon,
  label,
  children,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      variant="flat"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 p-3.5",
        onClick &&
          "hover:border-kumo-line hover:bg-kumo-tint focus-visible:ring-kumo-focus cursor-pointer transition-colors focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      <div className="bg-kumo-tint text-kumo-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-kumo-subtle truncate text-xs">{label}</div>
        <div className="text-kumo-default truncate text-sm font-semibold tabular-nums">
          {children}
        </div>
      </div>
    </Card>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{now ? now.toLocaleTimeString() : "—"}</>;
}

function UpDown({ up, down }: { up: string; down: string }) {
  return (
    <span className="inline-flex items-center gap-2">
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

export function StatsBar({ stats, views }: { stats: DashboardStats; views: NodeView[] }) {
  const { t } = useSettings();
  const [regionOpen, setRegionOpen] = useState(false);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={<PulseIcon size={18} />} label={t("online")}>
          <span className="text-kumo-success">{stats.online}</span>
          <span className="text-kumo-subtle"> / {stats.total}</span>
        </StatTile>
        <StatTile
          icon={<GlobeIcon size={18} />}
          label={t("regions")}
          onClick={() => setRegionOpen(true)}
        >
          {stats.regions}
        </StatTile>
        <StatTile icon={<ArrowsDownUpIcon size={18} />} label={t("networkSpeed")}>
          <UpDown up={formatSpeed(stats.uploadSpeed)} down={formatSpeed(stats.downloadSpeed)} />
        </StatTile>
        <StatTile icon={<ArrowsDownUpIcon size={18} />} label={t("trafficOverview")}>
          <UpDown up={formatBytes(stats.totalUp)} down={formatBytes(stats.totalDown)} />
        </StatTile>
        <StatTile icon={<ClockIcon size={18} />} label={t("currentTime")}>
          <LiveClock />
        </StatTile>
      </div>
      <RegionDialog views={views} open={regionOpen} onOpenChange={setRegionOpen} />
    </>
  );
}
