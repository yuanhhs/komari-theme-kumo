"use client";

import { useState } from "react";
import { cn } from "@cloudflare/kumo";

/**
 * Komari's `region` is a flag emoji (e.g. "🇺🇸"). Windows/Chrome can't render
 * regional-indicator emoji as flags (they show as "US"), so we convert the
 * emoji to an ISO 3166-1 alpha-2 code and render a real flag image, with the
 * original string as a text fallback.
 */
function regionToCode(region: string): string | null {
  const chars = [...region];
  if (chars.length >= 2) {
    const a = chars[0].codePointAt(0) ?? 0;
    const b = chars[1].codePointAt(0) ?? 0;
    if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
      return (
        String.fromCharCode(a - 0x1f1e6 + 97) + String.fromCharCode(b - 0x1f1e6 + 97)
      );
    }
  }
  const trimmed = region.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function RegionFlag({
  region,
  className,
}: {
  region: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!region) return null;

  const code = regionToCode(region);
  if (!code || failed) {
    return (
      <span className={cn("text-kumo-subtle text-xs", className)} title={region}>
        {region}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "inline-block h-3.5 w-[1.4rem] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10",
        className,
      )}
    />
  );
}
