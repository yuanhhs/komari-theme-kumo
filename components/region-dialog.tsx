"use client";

import { useMemo, useState, useEffect } from "react";
import { Dialog, Badge } from "@cloudflare/kumo";
import { XIcon, GlobeIcon } from "@phosphor-icons/react";
import { RegionGlobe, type GlobeMarker } from "@/components/region-globe";
import { RegionFlag } from "@/components/ui/region-flag";
import { useSettings } from "@/components/providers";
import { regionToCode, regionName, COUNTRY_COORDS } from "@/lib/region";
import type { NodeView } from "@/lib/types";

interface RegionEntry {
  region: string;
  code: string | null;
  count: number;
}

export function RegionDialog({
  views,
  open,
  onOpenChange,
}: {
  views: NodeView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useSettings();
  const [shouldRenderGlobe, setShouldRenderGlobe] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRenderGlobe(true);
    } else {
      // Delay unmount to let dialog animation finish
      const timer = setTimeout(() => setShouldRenderGlobe(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const regions = useMemo<RegionEntry[]>(() => {
    const map = new Map<string, RegionEntry>();
    for (const v of views) {
      const region = v.node.region;
      if (!region) continue;
      const code = regionToCode(region);
      const key = code ?? region;
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { region, code, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [views]);

  // Keep the marker array reference stable across polls (only changes when the
  // region set / counts change) so the globe isn't torn down every 2s.
  const markerSig = regions.map((r) => `${r.code ?? "?"}:${r.count}`).join("|");
  const markers = useMemo<GlobeMarker[]>(() => {
    const out: GlobeMarker[] = [];
    for (const r of regions) {
      const coord = r.code ? COUNTRY_COORDS[r.code] : undefined;
      if (!coord) continue;
      out.push({ location: coord, size: 0.04 + Math.min(r.count, 8) * 0.008 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerSig]);
  const countryCodes = useMemo(
    () => regions.flatMap((r) => (r.code ? [r.code] : [])),
    [regions],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="base" className="w-full max-w-lg p-0">
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-5 py-4">
            <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
              <GlobeIcon size={20} className="text-kumo-brand" weight="fill" />
              {t("regions")}
              <Badge variant="secondary">{regions.length}</Badge>
            </Dialog.Title>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t("close")}
              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            <div className="mx-auto aspect-square w-full max-w-[340px]">
              {shouldRenderGlobe ? (
                <RegionGlobe markers={markers} countryCodes={countryCodes} />
              ) : null}
            </div>

            {regions.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {regions.map((r) => (
                  <div
                    key={r.code ?? r.region}
                    className="bg-kumo-tint flex items-center gap-2 rounded-lg px-3 py-2"
                  >
                    <RegionFlag region={r.region} />
                    <span className="text-kumo-default min-w-0 flex-1 truncate text-xs font-medium">
                      {r.code ? regionName(r.code, lang) : r.region}
                    </span>
                    <span className="text-kumo-subtle text-xs font-semibold tabular-nums">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
