"use client";

import { useEffect, useRef } from "react";
import {
  M3Animator,
  setupCanvas,
  drawIndicator,
  getMorphedShape,
} from "@alerix/m3-loading-indicator";

/**
 * MD3 Expressive Loading Indicator.
 * Shape-morphing and motion to capture attention.
 */
export function Md3LoadingIndicator({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = {
    sm: 20,
    md: 48,
    lg: 64,
  };
  
  const pxSize = sizeMap[size];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvas(canvas, pxSize);
    const animator = new M3Animator();
    let animationFrameId: number;

    const render = (timestamp: number) => {
      animator.update(timestamp);
      const shape = getMorphedShape(animator.morph);
      
      const computedColor = getComputedStyle(canvas).color || "#6750A4";
      drawIndicator(ctx, pxSize, shape, animator.rotation, {
        color: computedColor,
        sizeRatio: 0.79,
        contained: false,
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [pxSize]);

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: pxSize, height: pxSize }}
    >
      <canvas ref={canvasRef} style={{ width: pxSize, height: pxSize }} />
    </div>
  );
}
