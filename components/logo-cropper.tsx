"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@cloudflare/kumo";
import { CheckIcon, XIcon } from "@phosphor-icons/react";

const PREVIEW_SIZE = 220;
const OUTPUT_SIZE = 256;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function calcFrame(
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const baseScale = Math.max(PREVIEW_SIZE / width, PREVIEW_SIZE / height) * zoom;
  const drawW = width * baseScale;
  const drawH = height * baseScale;
  const maxX = Math.max(0, (drawW - PREVIEW_SIZE) / 2);
  const maxY = Math.max(0, (drawH - PREVIEW_SIZE) / 2);
  return {
    width: drawW,
    height: drawH,
    left: (PREVIEW_SIZE - drawW) / 2 + (offsetX / 100) * maxX,
    top: (PREVIEW_SIZE - drawH) / 2 + (offsetY / 100) * maxY,
  };
}

export function LogoCropper({
  file,
  onCancel,
  onApply,
  labels,
}: {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob) => Promise<void> | void;
  labels: {
    cropLogo: string;
    apply: string;
    cancel: string;
    zoom: string;
    horizontal: string;
    vertical: string;
  };
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frame = useMemo(
    () => calcFrame(natural.width, natural.height, zoom, offsetX, offsetY),
    [natural.height, natural.width, offsetX, offsetY, zoom],
  );

  const applyCrop = async () => {
    const image = imgRef.current;
    if (!image) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = OUTPUT_SIZE / PREVIEW_SIZE;
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(
        image,
        frame.left * scale,
        frame.top * scale,
        frame.width * scale,
        frame.height * scale,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.92),
      );
      if (blob) await onApply(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-kumo-line bg-kumo-base rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-kumo-default text-sm font-semibold">{labels.cropLogo}</div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={labels.cancel}
          className="text-kumo-subtle hover:text-kumo-default rounded-md p-1 transition-colors"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className="border-kumo-line bg-kumo-canvas relative overflow-hidden rounded-xl border"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="absolute max-w-none select-none"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNatural({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
            }}
            style={{
              width: frame.width,
              height: frame.height,
              left: frame.left,
              top: frame.top,
            }}
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-white/60 ring-inset" />
        </div>

        <div className="grid w-full gap-2">
          <label className="text-kumo-subtle grid gap-1 text-xs">
            {labels.zoom}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <label className="text-kumo-subtle grid gap-1 text-xs">
            {labels.horizontal}
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={offsetX}
              onChange={(e) => setOffsetX(clamp(Number(e.target.value), -100, 100))}
            />
          </label>
          <label className="text-kumo-subtle grid gap-1 text-xs">
            {labels.vertical}
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={offsetY}
              onChange={(e) => setOffsetY(clamp(Number(e.target.value), -100, 100))}
            />
          </label>
        </div>

        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button size="sm" onClick={applyCrop} disabled={saving}>
            <CheckIcon size={15} />
            {labels.apply}
          </Button>
        </div>
      </div>
    </div>
  );
}
