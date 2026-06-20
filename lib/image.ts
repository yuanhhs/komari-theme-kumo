"use client";

/**
 * Turn an uploaded image File into a compact data URL suitable for persisting
 * in localStorage as a custom background. Large photos are downscaled and
 * re-encoded as WebP so we stay comfortably under the ~5 MB storage quota.
 */

const MAX_DIM = 1920;
const QUALITY = 0.82;
/** Keep the original data URL only if it's both un-scaled and already small. */
const KEEP_ORIGINAL_BELOW = 500_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function decode(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

export async function fileToBackgroundDataUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await decode(original);
  const largest = Math.max(img.width, img.height);
  const scale = Math.min(1, MAX_DIM / largest);

  if (scale >= 1 && original.length < KEEP_ORIGINAL_BELOW) return original;

  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/webp", QUALITY);
}
