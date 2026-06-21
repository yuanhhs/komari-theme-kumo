import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const TARGET = process.env.KOMARI_DEV_TARGET ?? "https://komari.yuanhhs.online";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const theme = request.nextUrl.searchParams.get("theme") ?? "";
  try {
    const upstream = await fetch(
      `${TARGET}/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: TARGET,
          Cookie: request.headers.get("cookie") ?? "",
        },
        body,
      },
    );
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: `Dev proxy failed: ${error instanceof Error ? error.message : error}`,
        data: null,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
