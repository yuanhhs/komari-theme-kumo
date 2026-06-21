"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader, Button, cn } from "@cloudflare/kumo";
import {
  CloudSlashIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { useDashboard, usePublicInfo, useVersion } from "@/hooks/useKomari";
import { computeStats, groupNames } from "@/lib/aggregate";
import { parseThemeOptions } from "@/lib/theme-settings";
import { sanitizeHtml } from "@/lib/sanitize";
import { useSettings, type Columns } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { StatsBar } from "@/components/stats-bar";
import { Toolbar } from "@/components/toolbar";
import { NodeCard } from "@/components/node-card";
import { NodeList } from "@/components/node-list";
import { NodeDetailDialog } from "@/components/node-detail-dialog";
import type { ReactNode } from "react";

/** Responsive column templates, capped at the visitor's chosen count on wide screens. */
const GRID_COLS: Record<Columns, string> = {
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
};

function CenteredState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card
      variant="flat"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="text-kumo-inactive">{icon}</div>
      <div className="text-kumo-default text-base font-semibold">{title}</div>
      {description ? (
        <div className="text-kumo-subtle max-w-sm text-sm">{description}</div>
      ) : null}
      {action}
    </Card>
  );
}

export function Dashboard() {
  const {
    t,
    view,
    columns,
    overview,
    background,
    backgroundType,
    backgroundBrightness,
    logo,
    seedDefaults,
  } = useSettings();
  const { views, isLoading, error, lastUpdated, refresh } = useDashboard();
  const { data: info } = usePublicInfo();
  const { data: version } = useVersion();

  const options = useMemo(() => parseThemeOptions(info), [info]);
  const bgUrl = background || options.backgroundUrl;
  const bgIsVideo = !!background && backgroundType === "video";
  const footerNote = useMemo(
    () => (options.footerNote ? sanitizeHtml(options.footerNote) : ""),
    [options.footerNote],
  );

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrigin, setDetailOrigin] = useState<DOMRect | null>(null);

  const seeded = useRef(false);
  useEffect(() => {
    if (info && !seeded.current) {
      seeded.current = true;
      seedDefaults({
        appearance: options.defaultAppearance,
        view: options.defaultView,
        accent: options.defaultAccent,
        columns: options.defaultColumns,
        surface: options.defaultSurface,
      });
    }
  }, [info, options, seedDefaults]);

  const stats = useMemo(() => computeStats(views), [views]);
  const groups = useMemo(() => groupNames(views), [views]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = group === "all" ? views : views.filter((v) => v.node.group === group);
    if (q) {
      list = list.filter((v) =>
        [v.node.name, v.node.region, v.node.os, v.node.cpu_name, v.node.public_remark ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [views, group, search]);

  const selectedView = useMemo(
    () => views.find((v) => v.node.uuid === selected) ?? null,
    [views, selected],
  );

  const openDetail = (uuid: string, origin?: DOMRect) => {
    setDetailOrigin(origin ?? null);
    setSelected(uuid);
    setDetailOpen(true);
  };

  const showLoading = isLoading && views.length === 0;
  const showError = !!error && views.length === 0;

  return (
    <div className="relative min-h-screen">
      {bgUrl ? (
        bgIsVideo ? (
          <video
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
            src={bgUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ filter: `brightness(${backgroundBrightness}%)` }}
          />
        ) : (
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${bgUrl}")`,
              filter: `brightness(${backgroundBrightness}%)`,
            }}
          />
        )
      ) : null}

      <SiteHeader
        info={info}
        version={version}
        logoUrl={logo || options.logoUrl}
        lastUpdated={lastUpdated}
        search={search}
        onSearch={setSearch}
      />

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
        {showError ? (
          <CenteredState
            icon={<WarningCircleIcon size={40} />}
            title={t("errorTitle")}
            description={error instanceof Error ? error.message : undefined}
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                {t("errorRetry")}
              </Button>
            }
          />
        ) : showLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader size={28} />
          </div>
        ) : (
          <>
            {overview === "show" ? <StatsBar stats={stats} views={views} /> : null}
            <Toolbar
              groups={groups}
              activeGroup={group}
              onGroup={setGroup}
              showGroups={options.enableGroupTabs}
            />

            {filtered.length === 0 ? (
              views.length === 0 ? (
                <CenteredState
                  icon={<CloudSlashIcon size={40} />}
                  title={t("noNodes")}
                  description={t("noNodesDesc")}
                />
              ) : (
                <CenteredState
                  icon={<MagnifyingGlassIcon size={40} />}
                  title={t("noResults")}
                  description={t("noResultsDesc")}
                />
              )
            ) : view === "grid" ? (
              <div className={cn("grid gap-3", GRID_COLS[columns])}>
                {filtered.map((v) => (
                  <NodeCard key={v.node.uuid} view={v} onOpen={openDetail} />
                ))}
              </div>
            ) : (
              <NodeList views={filtered} onOpen={openDetail} />
            )}
          </>
        )}
      </main>

      <footer className="border-kumo-hairline mt-6 border-t">
        <div className="mx-auto max-w-[1400px] px-4 py-6 text-center sm:px-6">
          {footerNote ? (
            <div
              className="text-kumo-subtle mb-2 text-sm"
              dangerouslySetInnerHTML={{ __html: footerNote }}
            />
          ) : null}
          <a
            href="https://github.com/komari-monitor/komari"
            target="_blank"
            rel="noreferrer"
            className="text-kumo-subtle hover:text-kumo-link text-xs"
          >
            Powered by Komari Monitor.
          </a>
        </div>
      </footer>

      <NodeDetailDialog
        view={selectedView}
        open={detailOpen}
        origin={detailOrigin}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
