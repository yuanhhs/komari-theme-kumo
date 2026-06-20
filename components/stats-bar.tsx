"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  PulseIcon,
  GlobeIcon,
  ArrowsDownUpIcon,
  DatabaseIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { useSettings } from "@/components/providers";
import type { DashboardStats } from "@/lib/aggregate";
import { formatBytes, formatSpeed } from "@/lib/format";

function StatTile({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <Card variant="flat" className="flex items-center gap-3 p-3.5">
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

export function StatsBar({ stats }: { stats: DashboardStats }) {
  const { t } = useSettings();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile icon={<PulseIcon size={18} />} label={t("online")}>
        <span className="text-kumo-success">{stats.online}</span>
        <span className="text-kumo-subtle"> / {stats.total}</span>
      </StatTile>
      <StatTile icon={<GlobeIcon size={18} />} label={t("regions")}>
        {stats.regions}
      </StatTile>
      <StatTile icon={<ArrowsDownUpIcon size={18} />} label={t("networkSpeed")}>
        <UpDown up={formatSpeed(stats.uploadSpeed)} down={formatSpeed(stats.downloadSpeed)} />
      </StatTile>
      <StatTile icon={<DatabaseIcon size={18} />} label={t("trafficOverview")}>
        <UpDown up={formatBytes(stats.totalUp)} down={formatBytes(stats.totalDown)} />
      </StatTile>
      <StatTile icon={<ClockIcon size={18} />} label={t("currentTime")}>
        <LiveClock />
      </StatTile>
    </div>
  );
}
