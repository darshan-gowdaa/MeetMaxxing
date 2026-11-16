"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { M3eShape } from "@m3e/react/shape";

export type M3ShapeName =
  | "12-sided-cookie"
  | "9-sided-cookie"
  | "8-leaf-clover"
  | "7-sided-cookie"
  | "6-sided-cookie"
  | "4-sided-cookie"
  | "4-leaf-clover"
  | "arch"
  | "arrow"
  | "boom"
  | "bun"
  | "burst"
  | "diamond"
  | "fan"
  | "flower"
  | "gem"
  | "ghost-ish"
  | "heart"
  | "hexagon"
  | "pentagon"
  | "pill"
  | "puffy"
  | "puffy-diamond"
  | "semicircle"
  | "slanted"
  | "soft-boom"
  | "soft-burst"
  | "square"
  | "circle"
  | "sunny"
  | "very-sunny";

export interface M3ShapeProps {
  name: M3ShapeName;
  size?: number | string;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Material 3 Expressive Shape Component from M3E (@m3e/react/shape).
 * Implements the 35 Material Shape library with smooth morphing and tonal container theming.
 * Spec: https://matraic.github.io/m3e/#/components/shape.html
 */
export function M3Shape({
  name = "soft-burst",
  size = 96,
  color = "var(--primary-container, #d3e3fd)",
  className = "",
  children,
}: M3ShapeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizePx = typeof size === "number" ? `${size}px` : size;

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-[28px] overflow-hidden ${className}`}
        style={{ width: sizePx, height: sizePx, backgroundColor: color }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        ["--m3e-shape-size" as string]: sizePx,
        ["--m3e-shape-container-color" as string]: color,
        ["--m3e-shape-transition" as string]: "var(--m3e-spatial-default, 0.5s ease)",
      }}
    >
      <M3eShape name={name} className="w-full h-full flex items-center justify-center">
        {children}
      </M3eShape>
    </div>
  );
}
