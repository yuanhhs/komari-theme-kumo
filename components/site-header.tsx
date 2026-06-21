"use client";

import { useState } from "react";
import { Button, cn } from "@cloudflare/kumo";
import {
  GearIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  SignInIcon,
} from "@phosphor-icons/react";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSettings } from "@/components/providers";
import { useMe } from "@/hooks/useKomari";
import { secondsSince } from "@/lib/format";
import { relativeFromSeconds } from "@/lib/i18n";
import type { PublicInfo, VersionInfo } from "@/lib/types";

export function SiteHeader({
  info,
  version,
  logoUrl,
  lastUpdated,
}: {
  info?: PublicInfo;
  version?: VersionInfo;
  logoUrl?: string;
  lastUpdated?: string;
}) {
  const { t, lang, mode, appearance, setAppearance } = useSettings();
  const { data: me } = useMe();
  const loggedIn = !!me?.logged_in;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const sitename = info?.sitename || "Komari";
  const toggleMode = () => setAppearance(mode === "dark" ? "light" : "dark");
  const showLogo = logoUrl && !logoError;

  return (
    <header className="border-kumo-hairline bg-kumo-canvas/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[var(--app-max-width,1400px)] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={sitename}
              onError={() => setLogoError(true)}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="bg-kumo-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <CloudIcon size={20} weight="fill" className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-kumo-default truncate text-base leading-tight font-semibold">
              {sitename}
            </h1>
            {lastUpdated ? (
              <div className="text-kumo-subtle flex items-center gap-1.5 text-xs leading-tight">
                <span className="bg-kumo-success inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                {t("realtime")} · {relativeFromSeconds(lang, secondsSince(lastUpdated))}
              </div>
            ) : version ? (
              <div className="text-kumo-subtle text-xs leading-tight">
                v{version.version}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            shape="square"
            icon={mode === "dark" ? SunIcon : MoonIcon}
            aria-label={t("appearance")}
            onClick={toggleMode}
          />
          {loggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              shape="square"
              icon={GearIcon}
              aria-label={t("settings")}
              onClick={() => setSettingsOpen(true)}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              shape="square"
              icon={SignInIcon}
              aria-label={t("login")}
              onClick={() => {
                window.location.href = "/admin";
              }}
            />
          )}
        </div>
      </div>

      {loggedIn ? (
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      ) : null}
    </header>
  );
}
