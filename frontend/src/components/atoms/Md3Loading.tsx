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
 * Expressive shape-morphing indicator that spins and morphs across multiple shapes.
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
    sm: 22,
    md: 38,
    lg: 48,
  };

  const px = sizeMap[size];

  if (!mounted) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
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
        ["--m3e-loading-indicator-size" as string]: `${px}px`,
        ["--m3e-loading-indicator-container-size" as string]: `${px}px`,
        ["--m3e-loading-indicator-active-indicator-color" as string]: "currentColor",
        ["--m3e-loading-indicator-contained-active-indicator-color" as string]: "currentColor",
      }}
    >
      <M3eLoadingIndicator
        variant={variant}
        className="w-full h-full flex items-center justify-center"
        style={{
          width: `${px}px`,
          height: `${px}px`,
          ["--m3e-loading-indicator-size" as string]: `${px}px`,
          ["--m3e-loading-indicator-container-size" as string]: `${px}px`,
          ["--m3e-loading-indicator-active-indicator-color" as string]: "currentColor",
          ["--m3e-loading-indicator-contained-active-indicator-color" as string]: "currentColor",
        }}
      />
    </div>
  );
}
