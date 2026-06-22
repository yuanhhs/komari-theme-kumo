/** Pure, locale-neutral formatting helpers for monitor data (everything is bytes). */

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

/** Human-readable size, base-1024. */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : decimals)} ${BYTE_UNITS[exp]}`;
}

/** Split a size into value + unit so the UI can style them separately. */
export function splitBytes(bytes: number, decimals = 2): [string, string] {
  const formatted = formatBytes(bytes, decimals);
  const [value, unit] = formatted.split(" ");
  return [value, unit];
}

/** Throughput, e.g. "1.2 MB/s". */
export function formatSpeed(bytesPerSec: number, decimals = 1): string {
  return `${formatBytes(Math.max(0, bytesPerSec), decimals)}/s`;
}

/** `value` is already a 0-100 percentage. */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}

/** Used/total → clamped 0-100 percentage. */
export function ratioPercent(used: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

/** Compact uptime, e.g. "12d 3h", "4h 9m", "8m 12s". */
export function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

/** Whole seconds since an ISO timestamp (clamped at 0). */
export function secondsSince(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}

/** Temperature in Celsius; "—" when unreported (0). */
export function formatTemp(celsius?: number): string {
  if (!celsius || celsius <= 0) return "—";
  return `${celsius.toFixed(0)}°C`;
}

/** Localised short date for expiry etc. */
export function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Days until an ISO date (negative if past). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

/** A color name describing how loaded a 0-100 metric is. */
export type LoadLevel = "low" | "mid" | "high" | "critical";
export function loadLevel(percent: number): LoadLevel {
  if (percent >= 90) return "critical";
  if (percent >= 75) return "high";
  if (percent >= 45) return "mid";
  return "low";
}
