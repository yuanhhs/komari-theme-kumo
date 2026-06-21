"use client";

import { useEffect, useRef } from "react";
import type { Globe } from "cobe";
import { useSettings } from "@/components/providers";

export interface GlobeMarker {
  /** [latitude, longitude] */
  location: [number, number];
  size: number;
}

/**
 * A small WebGL globe (cobe) that auto-rotates and can be dragged to spin,
 * with glowing markers at the countries that have nodes. cobe is imported
 * lazily inside the effect so it never runs during SSR. cobe v2 is driven by
 * calling `globe.update()` each frame (there is no `onRender` callback).
 */
export function RegionGlobe({ markers }: { markers: GlobeMarker[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const { mode } = useSettings();
  const dark = mode === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: Globe | undefined;
    let raf = 0;
    let cancelled = false;
    let phi = 0;
    let width = canvas.offsetWidth || 360;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1);

    const ro = new ResizeObserver(() => {
      width = canvas.offsetWidth || width;
    });
    ro.observe(canvas);

    void import("cobe").then(({ default: createGlobe }) => {
      if (cancelled || !canvas) return;
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * dpr,
        height: width * dpr,
        phi: 0,
        theta: 0.25,
        dark: dark ? 1 : 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: dark ? 5 : 8.5,
        baseColor: dark ? [0.32, 0.37, 0.47] : [0.62, 0.67, 0.74],
        markerColor: [0.97, 0.55, 0.13],
        glowColor: dark ? [0.12, 0.14, 0.2] : [0.86, 0.9, 0.96],
        markers,
      });

      const tick = () => {
        if (cancelled || !globe) return;
        if (pointerInteracting.current === null) phi += 0.004;
        globe.update({
          phi: phi + pointerMovement.current / 200,
          width: width * dpr,
          height: width * dpr,
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      requestAnimationFrame(() => {
        if (!cancelled && canvas) canvas.style.opacity = "1";
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      globe?.destroy();
    };
  }, [markers, dark]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab opacity-0 transition-opacity duration-700"
      style={{ contain: "layout paint size", aspectRatio: "1" }}
      onPointerDown={(e) => {
        pointerInteracting.current = e.clientX - pointerMovement.current;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }}
      onPointerUp={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }}
      onPointerOut={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }}
      onPointerMove={(e) => {
        if (pointerInteracting.current !== null) {
          pointerMovement.current = e.clientX - pointerInteracting.current;
        }
      }}
    />
  );
}
