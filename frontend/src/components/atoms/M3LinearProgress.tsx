"use client";

import { useEffect, useState } from "react";
import { M3eLinearProgressIndicator } from "@m3e/react/progress-indicator";

export interface M3LinearProgressProps {
  /** Mode: "determinate" for percentage completion, "indeterminate" for continuous motion */
  mode?: "determinate" | "indeterminate" | "buffer" | "query";
  /** Value between 0 and max (defaults to 100) */
  value?: number;
  /** Max value (defaults to 100) */
  max?: number;
  /** Buffer value between 0 and max */
  bufferValue?: number;
  className?: string;
}

/**
 * Material 3 Expressive Linear Progress Indicator component.
 * Spec: https://matraic.github.io/m3e/#/components/progress-indicator.html
 * Displays a horizontal track bar for process or loading tracking.
 */
export function M3LinearProgress({
  mode = "indeterminate",
  value = 0,
  max = 100,
  bufferValue = 0,
  className = "",
}: M3LinearProgressProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={mode === "determinate" ? value : undefined}
        className={`w-full h-1 bg-surface-container-highest rounded-full overflow-hidden ${className}`}
      >
        <div
          className={`h-full bg-primary rounded-full ${
            mode === "indeterminate" ? "w-1/2 animate-pulse" : ""
          }`}
          style={mode === "determinate" ? { width: `${Math.min(Math.max((value / max) * 100, 0), 100)}%` } : undefined}
        />
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={mode === "determinate" ? value : undefined}
      className={`w-full inline-flex items-center ${className}`}
      style={{
        ["--m3e-linear-progress-indicator-thickness" as string]: "4px",
        ["--m3e-linear-progress-indicator-shape" as string]: "9999px",
        ["--m3e-progress-indicator-color" as string]: "var(--primary, #0b57d0)",
        ["--m3e-progress-indicator-track-color" as string]: "var(--surface-container-highest, #d6d6d6)",
      }}
    >
      <M3eLinearProgressIndicator
        mode={mode}
        value={value}
        max={max}
        bufferValue={bufferValue}
        className="w-full"
      />
    </div>
  );
}
