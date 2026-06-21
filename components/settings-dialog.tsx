"use client";

import { useEffect, useRef, useState } from "react";
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
import { LogoCropper } from "@/components/logo-cropper";
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
    backgroundType,
    backgroundBrightness,
    setBackgroundBrightness,
    setBackgroundImageUrl,
    setBackgroundVideoUrl,
    setBackgroundFile,
    clearBackground,
    logo,
    setLogoUrl,
    setLogoFile,
    clearLogo,
  } = useSettings();
  const { mutate } = useSWRConfig();

  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
  const [siteName, setSiteName] = useState("");
  const [savingSiteName, setSavingSiteName] = useState(false);
  const [siteNameStatus, setSiteNameStatus] = useState<"saved" | "error" | "">("");
  const [logoSettingUrl, setLogoSettingUrl] = useState("");
  const [savingLogoSetting, setSavingLogoSetting] = useState(false);
  const [logoSettingStatus, setLogoSettingStatus] = useState<"saved" | "error" | "">("");
  const [backgroundSettingImageUrl, setBackgroundSettingImageUrl] = useState("");
  const [backgroundSettingVideoUrl, setBackgroundSettingVideoUrl] = useState("");
  const [savingBackgroundSetting, setSavingBackgroundSetting] = useState(false);
  const [backgroundSettingStatus, setBackgroundSettingStatus] = useState<
    "saved" | "error" | ""
  >("");

  useEffect(() => {
    const settings = (info?.theme_settings ?? {}) as Record<string, unknown>;
    const next =
      typeof settings.titleText === "string"
        ? settings.titleText
        : typeof settings.siteName === "string"
          ? settings.siteName
          : "";
    setSiteName(next);
    setSiteNameStatus("");
    const nextLogoUrl = typeof settings.logoUrl === "string" ? settings.logoUrl : "";
    const nextBackgroundUrl =
      typeof settings.backgroundUrl === "string" ? settings.backgroundUrl : "";
    const nextBackgroundVideoUrl =
      typeof settings.backgroundVideoUrl === "string" ? settings.backgroundVideoUrl : "";
    setLogoSettingUrl(nextLogoUrl);
    setBackgroundSettingImageUrl(nextBackgroundUrl);
    setBackgroundSettingVideoUrl(nextBackgroundVideoUrl);
    setLogoSettingStatus("");
    setBackgroundSettingStatus("");
  }, [info?.theme_settings]);

  const handleSaveSiteName = async () => {
    if (!info?.theme) return;
    setSavingSiteName(true);
    setSiteNameStatus("");
    try {
      await saveThemeSettings(info.theme, {
        ...(info.theme_settings ?? {}),
        titleText: siteName.trim(),
        siteName: "",
      });
      await mutate("public-info");
      setSiteNameStatus("saved");
    } catch {
      setSiteNameStatus("error");
    } finally {
      setSavingSiteName(false);
    }
  };

  const handleSaveLogoSetting = async () => {
    if (!info?.theme) return;
    setSavingLogoSetting(true);
    setLogoSettingStatus("");
    try {
      await saveThemeSettings(info.theme, {
        ...(info.theme_settings ?? {}),
        logoUrl: logoSettingUrl.trim(),
      });
      await mutate("public-info");
      setLogoSettingStatus("saved");
    } catch {
      setLogoSettingStatus("error");
    } finally {
      setSavingLogoSetting(false);
    }
  };

  const handleSaveBackgroundSetting = async () => {
    if (!info?.theme) return;
    setSavingBackgroundSetting(true);
    setBackgroundSettingStatus("");
    try {
      await saveThemeSettings(info.theme, {
        ...(info.theme_settings ?? {}),
        backgroundUrl: backgroundSettingImageUrl.trim(),
        backgroundVideoUrl: backgroundSettingVideoUrl.trim(),
        backgroundBrightness: String(backgroundBrightness),
      });
      await mutate("public-info");
      setBackgroundSettingStatus("saved");
    } catch {
      setBackgroundSettingStatus("error");
    } finally {
      setSavingBackgroundSetting(false);
    }
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
              onChange={setAppearance}
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
              onChange={setView}
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
              onChange={setColumns}
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
              onChange={setSurface}
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
              onChange={setOverview}
              size="sm"
              options={[
                { value: "show", label: t("show") },
                { value: "hide", label: t("hide") },
              ]}
            />
          </Section>

          <Section label={t("siteName")}>
            <div className="flex gap-2">
              <input
                value={siteName}
                onChange={(e) => {
                  setSiteName(e.target.value);
                  setSiteNameStatus("");
                }}
                placeholder={t("siteNamePlaceholder")}
                aria-label={t("siteName")}
                className="bg-kumo-base border-kumo-line text-kumo-default placeholder:text-kumo-placeholder focus:ring-kumo-focus focus:border-kumo-focus h-9 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!info?.theme || savingSiteName}
                onClick={handleSaveSiteName}
              >
                {savingSiteName ? t("saving") : t("save")}
              </Button>
            </div>
            {siteNameStatus ? (
              <div
                className={cn(
                  "text-xs",
                  siteNameStatus === "saved" ? "text-kumo-success" : "text-kumo-danger",
                )}
              >
                {siteNameStatus === "saved" ? t("saved") : t("saveFailed")}
              </div>
            ) : null}
          </Section>

          <Section label={t("logo")}>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLogoCropFile(file);
                if (logoFileRef.current) logoFileRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => logoFileRef.current?.click()}>
                <ImageIcon size={15} />
                {t("uploadLogo")}
              </Button>
              {logo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt=""
                    className="border-kumo-hairline h-9 w-9 shrink-0 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => clearLogo()}
                    className="text-kumo-subtle hover:text-kumo-danger inline-flex items-center gap-1 text-xs transition-colors"
                  >
                    <TrashIcon size={14} />
                    {t("removeLogo")}
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  value={logoSettingUrl}
                  onChange={(e) => {
                    setLogoSettingUrl(e.target.value);
                    setLogoUrl(e.target.value);
                    setLogoSettingStatus("");
                  }}
                  placeholder={t("logoUrl")}
                  aria-label={t("logoUrl")}
                  className="bg-kumo-base border-kumo-line text-kumo-default placeholder:text-kumo-placeholder focus:ring-kumo-focus focus:border-kumo-focus h-9 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!info?.theme || savingLogoSetting}
                  onClick={handleSaveLogoSetting}
                >
                  {savingLogoSetting ? t("saving") : t("save")}
                </Button>
              </div>
              {logoSettingStatus ? (
                <div
                  className={cn(
                    "mt-2 text-xs",
                    logoSettingStatus === "saved" ? "text-kumo-success" : "text-kumo-danger",
                  )}
                >
                  {logoSettingStatus === "saved" ? t("saved") : t("saveFailed")}
                </div>
              ) : null}
            </div>
            {logoCropFile ? (
              <div className="mt-3">
                <LogoCropper
                  file={logoCropFile}
                  onCancel={() => setLogoCropFile(null)}
                  onApply={async (blob) => {
                    await setLogoFile(blob);
                    setLogoCropFile(null);
                  }}
                  labels={{
                    cropLogo: t("cropLogo"),
                    apply: t("apply"),
                    cancel: t("cancel"),
                    zoom: t("zoom"),
                    horizontal: t("horizontal"),
                    vertical: t("vertical"),
                  }}
                />
              </div>
            ) : null}
          </Section>

          <Section label={t("background")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await setBackgroundFile(file);
                } catch {
                  /* ignore unreadable / oversized files */
                }
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <ImageIcon size={15} />
                {t("uploadMedia")}
              </Button>
              {background ? (
                <>
                  {backgroundType === "video" ? (
                    <video
                      aria-hidden
                      className="border-kumo-hairline h-9 w-14 shrink-0 rounded-md border object-cover"
                      src={background}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="border-kumo-hairline h-9 w-14 shrink-0 rounded-md border bg-cover bg-center"
                      style={{ backgroundImage: `url("${background}")` }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => clearBackground()}
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
              <input
                value={backgroundSettingVideoUrl}
                onChange={(e) => {
                  setBackgroundSettingVideoUrl(e.target.value);
                  setBackgroundVideoUrl(e.target.value);
                  setBackgroundSettingStatus("");
                }}
                placeholder={t("backgroundVideoUrl")}
                aria-label={t("backgroundVideoUrl")}
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
              onChange={setLang}
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
                  onClick={() => setAccent(a)}
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
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
