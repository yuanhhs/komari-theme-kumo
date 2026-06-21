/** Reads this theme's `managed` configuration values from `public_info.theme_settings`. */

import type { PublicInfo } from "./types";
import type {
  Accent,
  Appearance,
  BackgroundBrightness,
  Columns,
  Surface,
  ViewMode,
} from "@/components/providers";
import { isSafeResourceUrl } from "@/lib/sanitize";

export interface ThemeOptions {
  footerNote: string;
  backgroundUrl: string;
  backgroundBrightness?: BackgroundBrightness;
  /** Show the per-group filter tabs when groups exist. */
  enableGroupTabs: boolean;
  /** Admin defaults applied only when the visitor has no saved preference. */
  defaultView?: ViewMode;
  defaultAppearance?: Appearance;
  defaultAccent?: Accent;
  defaultColumns?: Columns;
  defaultSurface?: Surface;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "on";
  return fallback;
}

function asResourceUrl(v: unknown): string {
  const url = asString(v);
  return isSafeResourceUrl(url) ? url : "";
}

function asBrightness(v: unknown): BackgroundBrightness | undefined {
  const n = typeof v === "number" ? v : Number(asString(v));
  return n === 20 || n === 40 || n === 60 || n === 80 || n === 100
    ? (n as BackgroundBrightness)
    : undefined;
}

const VIEWS: ViewMode[] = ["grid", "list"];
const APPEARANCES: Appearance[] = ["light", "dark", "system"];
const ACCENTS: Accent[] = ["default", "blue", "violet", "emerald", "rose", "cyan"];

export function parseThemeOptions(info?: PublicInfo): ThemeOptions {
  const s = (info?.theme_settings ?? {}) as Record<string, unknown>;
  const view = asString(s.defaultView);
  const appearance = asString(s.defaultAppearance);
  const accent = asString(s.defaultAccent);
  const columns = asString(s.defaultColumns);
  const cardStyle = asString(s.cardStyle);
  return {
    footerNote: asString(s.footerNote),
    backgroundUrl: asResourceUrl(s.backgroundUrl),
    backgroundBrightness: asBrightness(s.backgroundBrightness),
    enableGroupTabs: asBool(s.enableGroupTabs, true),
    defaultView: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : undefined,
    defaultAppearance: APPEARANCES.includes(appearance as Appearance)
      ? (appearance as Appearance)
      : undefined,
    defaultAccent: ACCENTS.includes(accent as Accent) ? (accent as Accent) : undefined,
    defaultColumns: columns === "4" || columns === "5" ? (Number(columns) as Columns) : undefined,
    defaultSurface:
      cardStyle === "solid" || cardStyle === "glass" ? (cardStyle as Surface) : undefined,
  };
}
