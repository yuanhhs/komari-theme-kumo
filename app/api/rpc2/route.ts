import type { NextRequest } from "next/server";

/**
 * DEV-ONLY proxy to the live Komari instance.
 *
 * The live server enforces an Origin allowlist (`cors_origin_check_enabled`),
 * so a browser request from localhost is rejected with 403. This handler
 * re-issues the request server-side with the Origin rewritten to the target,
 * which the live server accepts.
 *
 * This file is removed by scripts/package-theme.mjs before the static export,
 * because route handlers are incompatible with `output: export`. In production
 * the theme is served by Komari itself, so the frontend calls `/api/rpc2`
 * same-origin and never hits this handler.
 */
export const dynamic = "force-dynamic";

const TARGET = process.env.KOMARI_DEV_TARGET ?? "https://komari.yuanhhs.online";

export async function POST(request: NextRequest) {
  const body = await request.text();
  try {
    const upstream = await fetch(`${TARGET}/api/rpc2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: TARGET,
      },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -1,
          message: `Dev proxy failed: ${error instanceof Error ? error.message : error}`,
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
