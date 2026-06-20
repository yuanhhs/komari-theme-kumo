"use client";

import { cn } from "@cloudflare/kumo";
import {
  MagnifyingGlassIcon,
  SquaresFourIcon,
  ListIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/segmented";
import { useSettings, type ViewMode } from "@/components/providers";

export function Toolbar({
  search,
  onSearch,
  groups,
  activeGroup,
  onGroup,
  showGroups,
}: {
  search: string;
  onSearch: (value: string) => void;
  groups: string[];
  activeGroup: string;
  onGroup: (group: string) => void;
  showGroups: boolean;
}) {
  const { t, view, setView } = useSettings();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative sm:w-64">
          <MagnifyingGlassIcon
            size={16}
            className="text-kumo-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className={cn(
              "bg-kumo-base border-kumo-line text-kumo-default placeholder:text-kumo-placeholder h-9 w-full rounded-lg border pr-8 pl-9 text-sm outline-none",
              "focus:ring-kumo-focus focus:border-kumo-focus focus:ring-2",
            )}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label={t("close")}
              className="text-kumo-subtle hover:text-kumo-default absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <XIcon size={15} />
            </button>
          ) : null}
        </div>

        {/* Group filter */}
        {showGroups && groups.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
            {["all", ...groups].map((group) => {
              const active = group === activeGroup;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => onGroup(group)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-kumo-brand border-transparent text-white"
                      : "bg-kumo-base border-kumo-hairline text-kumo-subtle hover:text-kumo-default hover:border-kumo-line",
                  )}
                >
                  {group === "all" ? t("all") : group}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* View toggle */}
      <Segmented<ViewMode>
        value={view}
        onChange={setView}
        size="sm"
        options={[
          { value: "grid", label: <SquaresFourIcon size={16} />, title: t("gridView") },
          { value: "list", label: <ListIcon size={16} />, title: t("listView") },
        ]}
      />
    </div>
  );
}
