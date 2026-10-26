"use client";

import * as React from "react";

export interface M3SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Material 3 shape variant:
   * - text: rounded-full (for lines of text, chip labels, metadata)
   * - circular: rounded-full aspect-square (for avatars, icon buttons)
   * - rounded: rounded-2xl (medium-large containers, badges, thumb previews)
   * - card: rounded-[28px] (M3 extra-large card surfaces)
   */
  variant?: "text" | "circular" | "rounded" | "card";
  /**
   * Animation style:
   * - wave: continuous smooth Material 3 shimmer wave (default)
   * - pulse: rhythmic opacity pulse
   * - none: static placeholder background
   */
  animation?: "wave" | "pulse" | "none";
  /** Explicit width override (number as px, or CSS string) */
  width?: string | number;
  /** Explicit height override (number as px, or CSS string) */
  height?: string | number;
}

const variantStyles: Record<NonNullable<M3SkeletonProps["variant"]>, string> = {
  text: "rounded-full",
  circular: "rounded-full aspect-square shrink-0",
  rounded: "rounded-2xl",
  card: "rounded-[28px]",
};

const animationStyles: Record<NonNullable<M3SkeletonProps["animation"]>, string> = {
  wave: "m3-skeleton",
  pulse: "animate-pulse bg-surface-container-highest",
  none: "bg-surface-container-high",
};

/**
 * Material 3 & M3E Skeleton Component
 * Provides continuous smooth shimmer wave or pulse loading state adhering to M3 shape scale.
 */
export function M3Skeleton({
  variant = "text",
  animation = "wave",
  width,
  height,
  className = "",
  style,
  children,
  ...props
}: M3SkeletonProps) {
  const inlineStyle: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={`${animationStyles[animation]} ${variantStyles[variant]} ${className}`}
      style={inlineStyle}
      {...props}
    >
      {children}
    </div>
  );
}

export default M3Skeleton;
