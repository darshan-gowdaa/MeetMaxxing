"use client";

import * as React from "react";
import Link from "next/link";
import { Md3LoadingIndicator } from "./Md3Loading";

export interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "tonal" | "outlined" | "text" | "elevated";
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentType<{ className?: string }>;
  trailingIcon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Material 3 Expressive Button component.
 * Specs:
 * - https://m3.material.io/components/all-buttons
 * - https://matraic.github.io/m3e/#/components/button.html
 */
export function M3Button({
  variant = "filled",
  size = "md",
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  disabled = false,
  href,
  className = "",
  children,
  onClick,
  type = "button",
  ...rest
}: M3ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeClasses = {
    sm: "h-9 px-4 text-xs font-semibold gap-1.5 rounded-full",
    md: "h-11 px-6 text-sm font-bold gap-2 rounded-full",
    lg: "h-14 px-8 text-base font-extrabold gap-2.5 rounded-full",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  const variantClasses = {
    filled:
      "bg-primary text-on-primary hover:brightness-110 active:brightness-95 shadow-xs border border-transparent",
    tonal:
      "bg-surface-container-high text-text hover:bg-surface-container-highest active:bg-surface-container-high border border-outline-variant/20 shadow-xs",
    outlined:
      "bg-transparent text-text border border-outline-variant hover:bg-surface-container-high/60 active:bg-surface-container-high",
    text:
      "bg-transparent text-primary hover:bg-primary-container/20 active:bg-primary-container/30 border border-transparent",
    elevated:
      "bg-surface-container-low text-primary shadow-sm hover:shadow-md hover:bg-surface-container border border-outline-variant/15 active:scale-[0.98]",
  }[variant];

  const baseClasses = `inline-flex items-center justify-center select-none cursor-pointer outline-none transition-all duration-200 active:scale-[0.98] ${
    isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
  } ${sizeClasses} ${variantClasses} ${className}`;

  const content = (
    <>
      {loading ? (
        <Md3LoadingIndicator size="sm" className="shrink-0" />
      ) : (
        Icon && <Icon className={`${iconSizes} shrink-0`} aria-hidden="true" />
      )}
      <span className="truncate">{children}</span>
      {!loading && TrailingIcon && (
        <TrailingIcon className={`${iconSizes} shrink-0`} aria-hidden="true" />
      )}
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={baseClasses}
      {...rest}
    >
      {content}
    </button>
  );
}
