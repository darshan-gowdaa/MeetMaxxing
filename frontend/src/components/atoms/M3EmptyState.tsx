"use client";

import * as React from "react";
import { M3Button } from "./M3Button";

export interface M3EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Material 3 Expressive Empty State Component.
 * Implements M3 container styling, high-contrast typography, and actionable CTA slots.
 * Spec: https://m3.material.io/foundations/empty-states
 */
export function M3EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionIcon,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  className = "",
  compact = false,
}: M3EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center text-center rounded-[32px] border border-outline-variant/20 bg-surface-container-low/60 backdrop-blur-xs p-8 sm:p-12 transition-all duration-300 ${
        compact ? "py-8 px-4" : "min-h-[300px]"
      } ${className}`}
    >
      <div className="relative mb-5 flex items-center justify-center">
        {/* Expressive tonal background shape */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-surface-container-highest/80 border border-outline-variant/25 flex items-center justify-center shadow-xs transition-transform duration-300 hover:scale-105">
          <Icon className="w-8 h-8 sm:w-9 sm:h-9 text-primary" aria-hidden="true" />
        </div>
        {/* Subtle decorative dot ring */}
        <div className="absolute -inset-1 rounded-[28px] border border-primary/10 pointer-events-none" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-text mb-2 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed mb-6 font-normal">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <M3Button
              variant="filled"
              size="md"
              icon={actionIcon}
              href={actionHref}
              onClick={onAction}
            >
              {actionLabel}
            </M3Button>
          )}

          {secondaryActionLabel && (
            <M3Button
              variant="tonal"
              size="md"
              href={secondaryActionHref}
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </M3Button>
          )}
        </div>
      )}
    </div>
  );
}
