"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

interface ApiResponse<T> {
  status?: string;
  message?: string;
  data?: T;
}

export async function saveThemeSettings(
  theme: string,
  settings: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  const response = await fetch(
    `${API_BASE}/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
      credentials: "same-origin",
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<unknown>;
  if (payload.status === "error") {
    throw new Error(payload.message || "Save failed");
  }
  return payload;
}
