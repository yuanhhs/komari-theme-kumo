"use client";

/**
 * Read an uploaded image File as a data URL and use it unchanged as a custom
 * background (no downscaling or re-encoding). Note: very large images may exceed
 * the localStorage quota and then won't persist across reloads.
 */
export function fileToBackgroundDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
