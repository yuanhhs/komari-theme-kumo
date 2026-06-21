"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  detectLang,
  isLang,
  translate,
  type Lang,
  type TKey,
} from "@/lib/i18n";
import {
  loadBackgroundBlob,
  saveBackgroundBlob,
  clearBackgroundBlob,
} from "@/lib/bg-store";
import { isSafeResourceUrl } from "@/lib/sanitize";

export type Appearance = "light" | "dark" | "system";
export type Mode = "light" | "dark";
export type ViewMode = "grid" | "list";
export type Accent = "default" | "blue" | "violet" | "emerald" | "rose" | "cyan";
/** Cards per row on wide screens. */
export type Columns = 4 | 5;
/** Card surface style: opaque or frosted glass (translucent + backdrop-blur). */
export type Surface = "solid" | "glass";
export type OverviewVisibility = "show" | "hide";
/** Kind of the custom background media. */
export type BackgroundKind = "image" | "video";
export type BackgroundBrightness = 20 | 40 | 60 | 80 | 100;

/** Accent overrides for `--color-kumo-brand`; `light-dark()` keeps both modes correct. */
const ACCENTS: Record<Exclude<Accent, "default">, { brand: string; hover: string }> = {
  blue: {
    brand: "light-dark(oklch(54% 0.2 256), oklch(70% 0.16 256))",
    hover: "light-dark(oklch(48% 0.21 256), oklch(76% 0.15 256))",
  },
  violet: {
    brand: "light-dark(oklch(52% 0.25 295), oklch(70% 0.19 295))",
    hover: "light-dark(oklch(46% 0.26 295), oklch(76% 0.18 295))",
  },
  emerald: {
    brand: "light-dark(oklch(52% 0.15 158), oklch(70% 0.15 158))",
    hover: "light-dark(oklch(46% 0.15 158), oklch(76% 0.14 158))",
  },
  rose: {
    brand: "light-dark(oklch(55% 0.21 14), oklch(70% 0.18 14))",
    hover: "light-dark(oklch(49% 0.22 14), oklch(76% 0.17 14))",
  },
  cyan: {
    brand: "light-dark(oklch(55% 0.12 220), oklch(72% 0.12 220))",
    hover: "light-dark(oklch(49% 0.12 220), oklch(78% 0.11 220))",
  },
};

export const ACCENT_KEYS: Accent[] = [
  "default",
  "blue",
  "violet",
  "emerald",
  "rose",
  "cyan",
];

const LS = {
  appearance: "appearance",
  lang: "language",
  view: "kumo-view",
  accent: "kumo-accent",
  columns: "kumo-cols",
  surface: "kumo-surface",
  overview: "kumo-overview",
  backgroundImageUrl: "kumo-background-image-url",
  backgroundVideoUrl: "kumo-background-video-url",
  backgroundBrightness: "kumo-background-brightness",
} as const;

function readLS(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode, etc.) */
  }
}

function parseBackgroundBrightness(value: string | null): BackgroundBrightness {
  const n = Number(value);
  return n === 20 || n === 40 || n === 60 || n === 80 || n === 100 ? n : 100;
}

interface SettingsContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** Resolved light/dark after applying the system preference. */
  mode: Mode;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  columns: Columns;
  setColumns: (c: Columns) => void;
  surface: Surface;
  setSurface: (s: Surface) => void;
  overview: OverviewVisibility;
  setOverview: (v: OverviewVisibility) => void;
  /** Visitor background as an object URL (image or video); overrides the admin default locally. Empty when none. */
  background: string;
  /** Kind of the visitor background, for choosing <img>/<video> rendering. */
  backgroundType: "" | BackgroundKind;
  backgroundBrightness: BackgroundBrightness;
  setBackgroundBrightness: (value: BackgroundBrightness) => void;
  backgroundImageUrl: string;
  setBackgroundImageUrl: (url: string) => void;
  backgroundVideoUrl: string;
  setBackgroundVideoUrl: (url: string) => void;
  /** Store an uploaded image/video file as the background (persisted in IndexedDB). */
  setBackgroundFile: (file: File) => Promise<void>;
  /** Remove the visitor background. */
  clearBackground: () => void;
  /** Apply admin-provided defaults for any pref the user has not set. */
  seedDefaults: (d: {
    appearance?: Appearance;
    view?: ViewMode;
    accent?: Accent;
    columns?: Columns;
    surface?: Surface;
  }) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  mounted: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [view, setViewState] = useState<ViewMode>("grid");
  const [accent, setAccentState] = useState<Accent>("default");
  const [columns, setColumnsState] = useState<Columns>(4);
  const [surface, setSurfaceState] = useState<Surface>("solid");
  const [overview, setOverviewState] = useState<OverviewVisibility>("show");
  const [background, setBackgroundState] = useState<string>("");
  const [backgroundType, setBackgroundType] = useState<"" | BackgroundKind>("");
  const [backgroundBrightness, setBackgroundBrightnessState] =
    useState<BackgroundBrightness>(100);
  const [backgroundImageUrl, setBackgroundImageUrlState] = useState("");
  const [backgroundVideoUrl, setBackgroundVideoUrlState] = useState("");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate persisted prefs after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const a = readLS(LS.appearance);
    if (a === "light" || a === "dark" || a === "system") setAppearanceState(a);
    const l = readLS(LS.lang);
    setLangState(isLang(l) ? l : detectLang());
    const v = readLS(LS.view);
    if (v === "grid" || v === "list") setViewState(v);
    const ac = readLS(LS.accent);
    if (ac && (ac === "default" || ac in ACCENTS)) setAccentState(ac as Accent);
    const c = readLS(LS.columns);
    if (c === "4" || c === "5") setColumnsState(Number(c) as Columns);
    const sf = readLS(LS.surface);
    if (sf === "solid" || sf === "glass") setSurfaceState(sf);
    const ov = readLS(LS.overview);
    if (ov === "show" || ov === "hide") setOverviewState(ov);
    setBackgroundBrightnessState(parseBackgroundBrightness(readLS(LS.backgroundBrightness)));
    const imageUrl = readLS(LS.backgroundImageUrl)?.trim() ?? "";
    const videoUrl = readLS(LS.backgroundVideoUrl)?.trim() ?? "";
    setBackgroundImageUrlState(imageUrl);
    setBackgroundVideoUrlState(videoUrl);
    if (videoUrl && isSafeResourceUrl(videoUrl)) {
      setBackgroundState(videoUrl);
      setBackgroundType("video");
    } else if (imageUrl && isSafeResourceUrl(imageUrl)) {
      setBackgroundState(imageUrl);
      setBackgroundType("image");
    }
    setMounted(true);
  }, []);

  // Load the persisted custom background (image/video blob) from IndexedDB.
  useEffect(() => {
    let objectUrl: string | null = null;
    const imageUrl = readLS(LS.backgroundImageUrl)?.trim() ?? "";
    const videoUrl = readLS(LS.backgroundVideoUrl)?.trim() ?? "";
    if (isSafeResourceUrl(videoUrl) || isSafeResourceUrl(imageUrl)) return;

    loadBackgroundBlob().then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setBackgroundState(objectUrl);
      setBackgroundType(blob.type.startsWith("video") ? "video" : "image");
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  // Track the system color-scheme preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const mode: Mode =
    appearance === "system" ? (systemDark ? "dark" : "light") : appearance;

  // Reflect resolved mode + language onto <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-mode", mode);
    root.style.colorScheme = mode;
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Reflect the card surface style onto <html> for the glass CSS rule.
  useEffect(() => {
    document.documentElement.setAttribute("data-surface", surface);
  }, [surface]);

  // Apply accent by overriding the kumo brand token on <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (accent === "default") {
      root.style.removeProperty("--color-kumo-brand");
      root.style.removeProperty("--color-kumo-brand-hover");
    } else {
      root.style.setProperty("--color-kumo-brand", ACCENTS[accent].brand);
      root.style.setProperty("--color-kumo-brand-hover", ACCENTS[accent].hover);
    }
  }, [accent]);

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    writeLS(LS.appearance, a);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLS(LS.lang, l);
  }, []);
  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    writeLS(LS.view, v);
  }, []);
  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    writeLS(LS.accent, a);
  }, []);
  const setColumns = useCallback((c: Columns) => {
    setColumnsState(c);
    writeLS(LS.columns, String(c));
  }, []);
  const setSurface = useCallback((s: Surface) => {
    setSurfaceState(s);
    writeLS(LS.surface, s);
  }, []);
  const setOverview = useCallback((v: OverviewVisibility) => {
    setOverviewState(v);
    writeLS(LS.overview, v);
  }, []);
  const setBackgroundBrightness = useCallback((value: BackgroundBrightness) => {
    setBackgroundBrightnessState(value);
    writeLS(LS.backgroundBrightness, String(value));
  }, []);
  const setBackgroundImageUrl = useCallback((url: string) => {
    const next = url.trim();
    void clearBackgroundBlob();
    setBackgroundImageUrlState(next);
    writeLS(LS.backgroundImageUrl, next);
    setBackgroundState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (backgroundVideoUrl && isSafeResourceUrl(backgroundVideoUrl)) return backgroundVideoUrl;
      return next && isSafeResourceUrl(next) ? next : "";
    });
    setBackgroundType(
      backgroundVideoUrl && isSafeResourceUrl(backgroundVideoUrl)
        ? "video"
        : next && isSafeResourceUrl(next)
          ? "image"
          : "",
    );
  }, [backgroundVideoUrl]);
  const setBackgroundVideoUrl = useCallback((url: string) => {
    const next = url.trim();
    void clearBackgroundBlob();
    setBackgroundVideoUrlState(next);
    writeLS(LS.backgroundVideoUrl, next);
    setBackgroundState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (next && isSafeResourceUrl(next)) return next;
      return backgroundImageUrl && isSafeResourceUrl(backgroundImageUrl) ? backgroundImageUrl : "";
    });
    setBackgroundType(
      next && isSafeResourceUrl(next)
        ? "video"
        : backgroundImageUrl && isSafeResourceUrl(backgroundImageUrl)
          ? "image"
          : "",
    );
  }, [backgroundImageUrl]);
  const setBackgroundFile = useCallback(async (file: File) => {
    await saveBackgroundBlob(file);
    setBackgroundImageUrlState("");
    setBackgroundVideoUrlState("");
    writeLS(LS.backgroundImageUrl, "");
    writeLS(LS.backgroundVideoUrl, "");
    const url = URL.createObjectURL(file);
    setBackgroundState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBackgroundType(file.type.startsWith("video") ? "video" : "image");
  }, []);
  const clearBackground = useCallback(() => {
    void clearBackgroundBlob();
    setBackgroundImageUrlState("");
    setBackgroundVideoUrlState("");
    writeLS(LS.backgroundImageUrl, "");
    writeLS(LS.backgroundVideoUrl, "");
    setBackgroundState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setBackgroundType("");
  }, []);

  const seedDefaults = useCallback(
    (d: {
      appearance?: Appearance;
      view?: ViewMode;
      accent?: Accent;
      columns?: Columns;
      surface?: Surface;
    }) => {
      if (d.appearance && readLS(LS.appearance) === null) setAppearance(d.appearance);
      if (d.view && readLS(LS.view) === null) setView(d.view);
      if (d.accent && readLS(LS.accent) === null) setAccent(d.accent);
      if (d.columns && readLS(LS.columns) === null) setColumns(d.columns);
      if (d.surface && readLS(LS.surface) === null) setSurface(d.surface);
    },
    [setAppearance, setView, setAccent, setColumns, setSurface],
  );

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      lang,
      setLang,
      appearance,
      setAppearance,
      mode,
      view,
      setView,
      accent,
      setAccent,
      columns,
      setColumns,
      surface,
      setSurface,
      overview,
      setOverview,
      background,
      backgroundType,
      backgroundBrightness,
      setBackgroundBrightness,
      backgroundImageUrl,
      setBackgroundImageUrl,
      backgroundVideoUrl,
      setBackgroundVideoUrl,
      setBackgroundFile,
      clearBackground,
      seedDefaults,
      t,
      mounted,
    }),
    [lang, setLang, appearance, setAppearance, mode, view, setView, accent, setAccent, columns, setColumns, surface, setSurface, overview, setOverview, background, backgroundType, backgroundBrightness, setBackgroundBrightness, backgroundImageUrl, setBackgroundImageUrl, backgroundVideoUrl, setBackgroundVideoUrl, setBackgroundFile, clearBackground, seedDefaults, t, mounted],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <Providers>");
  return ctx;
}
