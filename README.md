# Kumo for Komari

A clean, responsive monitoring theme for [Komari](https://github.com/komari-monitor/komari), built with
**Next.js** and **[Cloudflare Kumo](https://kumo-ui.com)** — Cloudflare's React design system
(Base UI + Tailwind CSS v4).

It renders your fleet live from the Komari **JSON-RPC2** API: a stats overview, a grid/list of
node cards with real-time CPU / memory / disk / network, and a per-node detail view with
historical load, network, and ping charts.

![Preview](.preview/preview.png)

## Features

- **Live data** — polls `common:getNodesLatestStatus` for real-time CPU/RAM/disk/network/uptime.
- **Two layouts** — responsive card **grid** and compact **list**, with search and group filtering.
- **Node detail** — modal with CPU/RAM and network history (ECharts) + ping latency, range
  selector (1h / 6h / 24h), and full system/billing info.
- **Theming** — light / dark / system, six accent colors, all via Kumo semantic tokens (automatic
  dark mode through `light-dark()`).
- **i18n** — 简体中文 + English, auto-detected, switchable.
- **Admin-configurable** — ships a Komari `managed` configuration (default appearance/view/accent,
  offline ordering, group filter, logo, background, footer note).

## Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Framework      | Next.js 15 (App Router, static export → SPA) |
| UI             | `@cloudflare/kumo` + `@phosphor-icons/react` |
| Styling        | Tailwind CSS v4 (kumo semantic tokens only) |
| Charts         | ECharts (tree-shaken core) |
| Data fetching  | SWR (polling) over a typed JSON-RPC2 client |

## Requirements

- A Komari server **≥ 1.0.7** (RPC2 endpoint). Managed theme settings need the server **≥ 1.0.5**.
- Node **≥ 20** for development.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

The frontend always calls a **relative** `/api/rpc2`. In development a small route handler
(`app/api/rpc2/route.ts`) proxies that to a live Komari instance and rewrites the `Origin` header
(the live server enforces an origin allowlist, so a raw localhost request is rejected with 403).

Point dev at your own instance:

```bash
KOMARI_DEV_TARGET=https://your-komari.example.com npm run dev
```

(The default target lives in `app/api/rpc2/route.ts`.)

## Build the theme package

```bash
npm run build:theme
```

This produces **`komari-theme-kumo.zip`**. The script:

1. stashes the dev-only route handler (route handlers can't be statically exported),
2. runs `BUILD_EXPORT=true next build` (static export → `out/`),
3. verifies the required `<title>Komari Monitor</title>` / description placeholders survived,
4. assembles `theme/` (`komari-theme.json` + `dist/` + `preview.png`) and zips it.

## Install into Komari

1. Open the Komari **admin panel → 主题 / Themes**.
2. Upload `komari-theme-kumo.zip`.
3. Activate **Kumo**.

In production the theme is served by Komari at the site root, so `/api/rpc2` is same-origin — no
proxy needed.

## Theme settings (admin panel)

Exposed via the `managed` configuration in `theme.manifest.json` and read back from
`/api/public`'s `theme_settings`:

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `defaultAppearance` | select | `system` | First-visit light/dark mode |
| `defaultView` | select | `grid` | First-visit layout |
| `defaultAccent` | select | `default` | Accent color |
| `showOfflineLast` | switch | `true` | Sort offline nodes to the end |
| `enableGroupTabs` | switch | `true` | Show the group filter |
| `logoUrl` | string | — | Header logo (empty = built-in cloud mark) |
| `backgroundUrl` | string | — | Page background image |
| `footerNote` | richtext | — | HTML shown above the Powered-by line |

Visitor preferences (appearance, language, view, accent) are stored in `localStorage`
(`appearance`, `language`, `kumo-view`, `kumo-accent`) and take precedence over admin defaults.

## Project layout

```
app/                 App Router: layout (title/description placeholders), page, globals.css
  api/rpc2/route.ts  DEV-ONLY proxy (removed from the static export)
  icon.svg           Favicon
lib/
  rpc2.ts            Typed JSON-RPC2 client (POST /api/rpc2)
  types.ts           API response types
  aggregate.ts       Node view-model + stats + grouping (pure)
  format.ts          Bytes / speed / uptime / percent formatters
  i18n.ts            zh-CN + en dictionary
  theme-settings.ts  Parses theme_settings
hooks/useKomari.ts   SWR hooks (live polling)
components/          dashboard, node-card, node-list, node-detail-dialog,
                     site-header, settings-dialog, stats-bar, toolbar, charts/, ui/
scripts/package-theme.mjs   Static export + zip packaging
theme.manifest.json  komari-theme.json source (version injected from package.json)
```

## Design notes

- **Kumo tokens only** for color (`bg-kumo-*`, `text-kumo-*`, …); never raw Tailwind colors or
  `dark:` variants — dark mode is automatic.
- **Single-page** by design: the node detail is a dialog (not a route), so the static export stays a
  clean SPA that plays well with Komari's index.html fallback.
- `<title>Komari Monitor</title>` and `A simple server monitor tool.` are kept verbatim so Komari can
  substitute the operator's custom site title/description at serve time.
- The `Powered by Komari Monitor.` footer is retained as required by the theme guidelines.

## License

MIT
