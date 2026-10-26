"use client";

import * as React from "react";
import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface M3BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Material 3 Expressive Breadcrumb navigation component.
 * Spec: https://matraic.github.io/m3e/#/components/breadcrumb.html
 * Displays hierarchical path to current page with angular chevron separators.
 */
export function M3Breadcrumb({ items, className = "" }: M3BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs sm:text-sm ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const IconComponent = item.icon;

          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <RiArrowRightSLine
                  className="w-4 h-4 text-outline-variant shrink-0"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-text-muted hover:text-text hover:underline transition-colors font-medium outline-none rounded-sm"
                >
                  {IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className="flex items-center gap-1 text-text font-bold truncate max-w-[200px] sm:max-w-xs"
                  aria-current={isLast ? "page" : undefined}
                >
                  {IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
