"use client";

import * as React from "react";
import Link from "next/link";
import { RiArrowDownSLine } from "@remixicon/react";

export interface M3SplitButtonProps {
  /** Label for the primary action segment */
  label: React.ReactNode;
  /** Optional icon for the primary action segment */
  icon?: React.ComponentType<{ className?: string }>;
  /** Direct link for the primary action. If provided, renders an anchor link. */
  href?: string;
  /** Click handler for primary action if not a link */
  onClick?: () => void;
  /** Click handler / toggle for the trailing menu chevron */
  onToggleMenu: () => void;
  /** Whether the dropdown menu is currently expanded */
  isOpen?: boolean;
  /** Accessibility label for the menu trigger */
  menuAriaLabel?: string;
  /** Visual variant according to M3 Expressive tokens */
  variant?: "tonal" | "filled" | "outlined";
  /** Disabled state */
  disabled?: boolean;
  className?: string;
  menuTriggerRef?: React.Ref<HTMLButtonElement>;
}

/**
 * Material 3 Expressive Split Button component
 * Dual-segmented button combining a primary action button and an adjacent menu dropdown trigger.
 * Spec: https://matraic.github.io/m3e/#/components/split-button.html
 */
export function M3SplitButton({
  label,
  icon: Icon,
  href,
  onClick,
  onToggleMenu,
  isOpen = false,
  menuAriaLabel = "Toggle options menu",
  variant = "tonal",
  disabled = false,
  className = "",
  menuTriggerRef,
}: M3SplitButtonProps) {
  const containerVariantClasses = {
    tonal: "bg-surface-container-high border border-outline-variant/25 text-text hover:bg-surface-container-highest",
    filled: "bg-primary border border-primary text-on-primary hover:brightness-110",
    outlined: "bg-transparent border border-outline-variant text-text hover:bg-surface-container-high",
  }[variant];

  const dividerVariantClasses = {
    tonal: "bg-outline-variant/30",
    filled: "bg-on-primary/30",
    outlined: "bg-outline-variant/30",
  }[variant];

  const primarySegmentClasses =
    "inline-flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-l-full text-xs sm:text-sm font-semibold tracking-wide transition-colors active:scale-[0.98] outline-none select-none";

  const trailingSegmentClasses =
    "inline-flex items-center justify-center px-2.5 py-2 rounded-r-full text-xs transition-colors active:scale-[0.98] outline-none cursor-pointer";

  return (
    <div
      className={`inline-flex items-center rounded-full shadow-xs transition-all duration-200 ${containerVariantClasses} ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      {/* Primary Action Segment */}
      {href ? (
        <Link href={href} className={primarySegmentClasses}>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span>{label}</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${primarySegmentClasses} cursor-pointer`}
        >
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span>{label}</span>
        </button>
      )}

      {/* Vertical Segment Divider */}
      <div className={`w-[1px] h-4 shrink-0 ${dividerVariantClasses}`} aria-hidden="true" />

      {/* Trailing Menu Trigger Segment */}
      <button
        ref={menuTriggerRef}
        type="button"
        onClick={onToggleMenu}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={menuAriaLabel}
        className={trailingSegmentClasses}
      >
        <RiArrowDownSLine
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
