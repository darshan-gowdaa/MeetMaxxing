"use client";

import { useEffect, useState } from "react";
import { M3eLoadingIndicator } from "@m3e/react/loading-indicator";

export interface Md3LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  variant?: "uncontained" | "contained";
  className?: string;
}

/**
 * Official Material 3 Expressive Loading Indicator from M3E (@m3e/react/loading-indicator).
 * Spec: https://matraic.github.io/m3e/#/components/loading-indicator.html
 * Expressive shape-morphing indicator designed for short, ongoing processes.
 */
export function Md3LoadingIndicator({
  size = "md",
  variant = "uncontained",
  className = "",
}: Md3LoadingIndicatorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeMap = {
    sm: 20,
    md: 36,
    lg: 48,
  };

  const px = sizeMap[size];

  if (!mounted) {
    // Fast lightweight fallback during SSR / initial hydration
    return (
      <div
        role="status"
        aria-label="Loading"
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <span
          className="rounded-full border-2 border-current border-t-transparent animate-spin"
          style={{ width: Math.max(px * 0.75, 12), height: Math.max(px * 0.75, 12) }}
        />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        // Map M3E token CSS variables to theme colors and size
        ["--m3e-loading-indicator-active-indicator-size" as string]: `${px}px`,
        ["--m3e-loading-indicator-active-indicator-color" as string]: "currentColor",
        ["--m3e-loading-indicator-contained-container-size" as string]: `${px}px`,
      }}
    >
      <M3eLoadingIndicator
        variant={variant}
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
}
