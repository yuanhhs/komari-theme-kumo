"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Dialog, Button, cn } from "@cloudflare/kumo";
import {
  SunIcon,
  MoonIcon,
  DesktopIcon,
  XIcon,
  SquaresFourIcon,
  ListIcon,
  CheckIcon,
  ImageIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/segmented";
import { BackgroundBrightnessSlider } from "@/components/background-brightness-slider";
import {
  useSettings,
  ACCENT_KEYS,
  type Accent,
  type Appearance,
  type Columns,
  type OverviewVisibility,
  type Surface,
  type ViewMode,
} from "@/components/providers";
import { saveThemeSettings } from "@/lib/admin";
import { readFileAsDataUrl } from "@/lib/file";
import type { Lang } from "@/lib/i18n";
import type { PublicInfo } from "@/lib/types";
import type { ReactNode } from "react";

const ACCENT_SWATCH: Record<Accent, string> = {
  default: "#f6821f",
  blue: "#3b82f6",
  violet: "#7c5cff",
  emerald: "#10b981",
  rose: "#f43f5e",
  cyan: "#06b6d4",
};
const BACKGROUND_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-kumo-subtle text-xs font-medium tracking-wide uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  info,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info?: PublicInfo;
}) {
  const {
    t,
    appearance,
    setAppearance,
    view,
    setView,
    lang,
    setLang,
    accent,
    setAccent,
    columns,
    setColumns,
    surface,
    setSurface,
    overview,
    setOverview,
    background,
    backgroundBrightness,
    setBackgroundBrightness,
    setBackgroundImageUrl,
    clearBackground,
  } = useSettings();
  const { mutate } = useSWRConfig();

  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<Record<string, unknown>>({});
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesStatus, setPreferencesStatus] = useState<"saved" | "error" | "">("");
  const [backgroundSettingImageUrl, setBackgroundSettingImageUrl] = useState("");
  const [savingBackgroundSetting, setSavingBackgroundSetting] = useState(false);
  const [backgroundSettingStatus, setBackgroundSettingStatus] = useState<
    "saved" | "error" | ""
  >("");

  useEffect(() => {
    const settings = (info?.theme_settings ?? {}) as Record<string, unknown>;
    settingsRef.current = settings;
    const nextBackgroundUrl =
      typeof settings.backgroundUrl === "string" ? settings.backgroundUrl : "";
    setBackgroundSettingImageUrl(nextBackgroundUrl);
    setBackgroundSettingStatus("");
  }, [info?.theme_settings]);

  const saveThemePatch = useCallback(
    async (patch: Record<string, unknown>) => {
      const next = {
        ...settingsRef.current,
        ...patch,
      };
      settingsRef.current = next;
      if (!info?.theme) return;
      await saveThemeSettings(info.theme, next);
      await mutate("public-info");
    },
    [info?.theme, mutate],
  );

  const savePreferencePatch = useCallback(
    async (patch: Record<string, unknown>) => {
      setSavingPreferences(true);
      setPreferencesStatus("");
      try {
        await saveThemePatch(patch);
        setPreferencesStatus("saved");
      } catch {
        setPreferencesStatus("error");
      } finally {
        setSavingPreferences(false);
      }
    },
    [saveThemePatch],
  );

  const handleSaveBackgroundSetting = async () => {
    if (!info?.theme) return;
    setSavingBackgroundSetting(true);
    setBackgroundSettingStatus("");
    try {
      await saveThemePatch({
        backgroundUrl: backgroundSettingImageUrl.trim(),
        backgroundVideoUrl: "",
        backgroundBrightness: String(backgroundBrightness),
      });
      setBackgroundSettingStatus("saved");
    } catch {
      setBackgroundSettingStatus("error");
    } finally {
      setSavingBackgroundSetting(false);
    }
  };

  const handleBackgroundFile = async (file: File) => {
    if (!BACKGROUND_IMAGE_TYPES.has(file.type)) {
      setBackgroundSettingStatus("error");
      return;
    }
    setSavingBackgroundSetting(true);
    setBackgroundSettingStatus("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setBackgroundSettingImageUrl(dataUrl);
      setBackgroundImageUrl(dataUrl);
      if (info?.theme) {
        await saveThemePatch({
          backgroundUrl: dataUrl,
          backgroundVideoUrl: "",
          backgroundBrightness: String(backgroundBrightness),
        });
      }
      setBackgroundSettingStatus("saved");
    } catch {
      setBackgroundSettingStatus("error");
    } finally {
      setSavingBackgroundSetting(false);
    }
  };

  const handleClearBackground = async () => {
    clearBackground();
    setBackgroundSettingImageUrl("");
    setBackgroundSettingStatus("");
    if (!info?.theme) return;
    setSavingBackgroundSetting(true);
    try {
      await saveThemePatch({
        backgroundUrl: "",
        backgroundVideoUrl: "",
        backgroundBrightness: String(backgroundBrightness),
      });
      setBackgroundSettingStatus("saved");
    } catch {
      setBackgroundSettingStatus("error");
    } finally {
      setSavingBackgroundSetting(false);
    }
  };

  const handleAppearanceChange = (value: Appearance) => {
    setAppearance(value);
    void savePreferencePatch({ defaultAppearance: value });
  };

  const handleViewChange = (value: ViewMode) => {
    setView(value);
    void savePreferencePatch({ defaultView: value });
  };

  const handleColumnsChange = (value: Columns) => {
    setColumns(value);
    void savePreferencePatch({ defaultColumns: String(value) });
  };

  const handleSurfaceChange = (value: Surface) => {
    setSurface(value);
    void savePreferencePatch({ cardStyle: value });
  };

  const handleOverviewChange = (value: OverviewVisibility) => {
    setOverview(value);
    void savePreferencePatch({ overviewVisibility: value });
  };

  const handleLangChange = (value: Lang) => {
    setLang(value);
    void savePreferencePatch({ defaultLang: value });
  };

  const handleAccentChange = (value: Accent) => {
    setAccent(value);
    void savePreferencePatch({ defaultAccent: value });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="base" className="w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <Dialog.Title className="text-kumo-default text-base font-semibold">
            {t("settings")}
          </Dialog.Title>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("close")}
            className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint rounded-md p-1 transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <Section label={t("appearance")}>
            <Segmented<Appearance>
              value={appearance}
              onChange={handleAppearanceChange}
              size="sm"
              options={[
                { value: "light", label: <><SunIcon size={15} />{t("light")}</> },
                { value: "dark", label: <><MoonIcon size={15} />{t("dark")}</> },
                {
                  value: "system",
                  label: <><DesktopIcon size={15} />{t("systemMode")}</>,
                },
              ]}
            />
          </Section>

          <Section label={t("view")}>
            <Segmented<ViewMode>
              value={view}
              onChange={handleViewChange}
              size="sm"
              options={[
                {
                  value: "grid",
                  label: <><SquaresFourIcon size={15} />{t("gridView")}</>,
                },
                { value: "list", label: <><ListIcon size={15} />{t("listView")}</> },
              ]}
            />
          </Section>

          <Section label={t("columns")}>
            <Segmented<Columns>
              value={columns}
              onChange={handleColumnsChange}
              size="sm"
              options={[
                { value: 4, label: "4" },
                { value: 5, label: "5" },
              ]}
            />
          </Section>

          <Section label={t("cardStyle")}>
            <Segmented<Surface>
              value={surface}
              onChange={handleSurfaceChange}
              size="sm"
              options={[
                { value: "solid", label: t("solid") },
                { value: "glass", label: t("frosted") },
              ]}
            />
          </Section>

          <Section label={t("overviewInfo")}>
            <Segmented<OverviewVisibility>
              value={overview}
              onChange={handleOverviewChange}
              size="sm"
              options={[
                { value: "show", label: t("show") },
                { value: "hide", label: t("hide") },
              ]}
            />
          </Section>

          <Section label={t("background")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleBackgroundFile(file);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <ImageIcon size={15} />
                {t("uploadImage")}
              </Button>
              {background ? (
                <>
                  <span
                    aria-hidden
                    className="border-kumo-hairline h-9 w-14 shrink-0 rounded-md border bg-cover bg-center"
                    style={{ backgroundImage: `url("${background}")` }}
                  />
                  <button
                    type="button"
                    onClick={handleClearBackground}
                    className="text-kumo-subtle hover:text-kumo-danger inline-flex items-center gap-1 text-xs transition-colors"
                  >
                    <TrashIcon size={14} />
                    {t("removeBackground")}
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={backgroundSettingImageUrl}
                onChange={(e) => {
                  setBackgroundSettingImageUrl(e.target.value);
                  setBackgroundImageUrl(e.target.value);
                  setBackgroundSettingStatus("");
                }}
                placeholder={t("backgroundImageUrl")}
                aria-label={t("backgroundImageUrl")}
                className="bg-kumo-base border-kumo-line text-kumo-default placeholder:text-kumo-placeholder focus:ring-kumo-focus focus:border-kumo-focus h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="mt-3 space-y-2">
              <BackgroundBrightnessSlider
                value={backgroundBrightness}
                onChange={(value) => {
                  setBackgroundBrightness(value);
                  setBackgroundSettingStatus("");
                }}
                label={t("backgroundBrightness")}
                enabled={open}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!info?.theme || savingBackgroundSetting}
                  onClick={handleSaveBackgroundSetting}
                >
                  {savingBackgroundSetting ? t("saving") : t("save")}
                </Button>
                {backgroundSettingStatus ? (
                  <div
                    className={cn(
                      "text-xs",
                      backgroundSettingStatus === "saved"
                        ? "text-kumo-success"
                        : "text-kumo-danger",
                    )}
                  >
                    {backgroundSettingStatus === "saved" ? t("saved") : t("saveFailed")}
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <Section label={t("language")}>
            <Segmented<Lang>
              value={lang}
              onChange={handleLangChange}
              size="sm"
              options={[
                { value: "zh-CN", label: "中文" },
                { value: "en", label: "English" },
              ]}
            />
          </Section>

          <Section label={t("accent")}>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_KEYS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAccentChange(a)}
                  aria-label={a}
                  title={a}
                  className={cn(
                    "ring-offset-kumo-base relative h-7 w-7 rounded-full ring-2 ring-offset-2 transition",
                    accent === a
                      ? "ring-kumo-focus"
                      : "ring-transparent hover:ring-kumo-hairline",
                  )}
                  style={{ background: ACCENT_SWATCH[a] }}
                >
                  {accent === a ? (
                    <CheckIcon
                      size={14}
                      weight="bold"
                      className="absolute inset-0 m-auto text-white"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </Section>

          {savingPreferences || preferencesStatus ? (
            <div
              className={cn(
                "text-xs",
                preferencesStatus === "error" ? "text-kumo-danger" : "text-kumo-success",
              )}
            >
              {savingPreferences
                ? t("saving")
                : preferencesStatus === "saved"
                  ? t("saved")
                  : t("saveFailed")}
            </div>
          ) : null}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
