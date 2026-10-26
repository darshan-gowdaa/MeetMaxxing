"use client";

import * as React from "react";
import { RiCheckLine } from "@remixicon/react";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface M3SegmentedButtonProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
  "aria-label"?: string;
}

/**
 * Material 3 Expressive Segmented Button component.
 * Spec: https://matraic.github.io/m3e/#/components/segmented-button.html
 * Container with connected pill segments for single-choice selection.
 */
export function M3SegmentedButton<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
  name,
  "aria-label": ariaLabel = "Options",
}: M3SegmentedButtonProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 rounded-full bg-surface-container-low border border-outline-variant/20 shadow-xs max-w-full overflow-x-auto touch-pan-x no-scrollbar ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const IconComponent = opt.icon;

        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={`flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 touch-manipulation px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 outline-none select-none cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              isSelected
                ? "bg-primary-container text-on-primary-container font-bold shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-container-high/60"
            } ${opt.disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
          >
            {isSelected ? (
              <RiCheckLine className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            ) : (
              IconComponent && <IconComponent className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
