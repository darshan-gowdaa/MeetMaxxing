"use client";

import { useState, useRef, useEffect } from "react";
import {
  RiSearchLine,
  RiCloseLine,
  RiSortDesc,
  RiCheckLine,
  RiArrowDownSLine,
} from "@remixicon/react";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export interface FloatingPillToolbarProps<T extends string> {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  sortBy: T;
  onSortChange: (val: T) => void;
  sortOptions: SortOption<T>[];
  onSelectClick: () => void;
}

export default function FloatingPillToolbar<T extends string>({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  sortBy,
  onSortChange,
  sortOptions,
  onSelectClick,
}: FloatingPillToolbarProps<T>) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!sortOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [sortOpen]);

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || "Sort";

  return (
    <div className="flex items-center bg-surface-container-high/90 backdrop-blur-xl border border-border/70 rounded-full shadow-sm p-1 gap-1 w-full sm:w-auto transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
      {/* Integrated Search Input */}
      <div className="relative flex-1 sm:flex-none flex items-center min-w-0">
        <RiSearchLine
          className="w-4 h-4 text-text-muted ml-2.5 sm:ml-3 shrink-0 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full sm:w-44 md:w-52 h-8 sm:h-9 bg-transparent border-0 border-none outline-none ring-0 shadow-none pl-2 pr-7 text-[16px] sm:text-[13px] md:text-[14px] text-text placeholder:text-text-muted focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-highest text-text-muted hover:text-text transition-colors"
            aria-label="Clear search"
          >
            <RiCloseLine className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Subtle Divider */}
      <div className="h-5 w-px bg-border/60 shrink-0" aria-hidden="true" />

      {/* Sort Chip with MD3 Menu */}
      <div className="relative shrink-0" ref={sortRef}>
        <button
          type="button"
          onClick={() => setSortOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          aria-label="Sort options"
          className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] font-medium text-text bg-surface-container hover:bg-surface-container-highest transition-all active:scale-[0.96]"
        >
          <RiSortDesc className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted" aria-hidden="true" />
          <span className="whitespace-nowrap">{currentSortLabel}</span>
          <RiArrowDownSLine className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
        </button>

        {sortOpen && (
          <div
            role="listbox"
            className="absolute top-full right-0 mt-1.5 w-36 bg-surface-container-highest rounded-2xl border border-border shadow-lg p-1 z-40 animate-fade-scale"
          >
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={sortBy === opt.value}
                onClick={() => {
                  onSortChange(opt.value);
                  setSortOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "text-text hover:bg-surface-container-high"
                }`}
              >
                <span>{opt.label}</span>
                {sortBy === opt.value && (
                  <RiCheckLine className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Select Action Pill */}
      <button
        type="button"
        onClick={onSelectClick}
        className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] font-medium text-text bg-surface-container hover:bg-surface-container-highest hover:text-primary transition-all active:scale-[0.96] shrink-0"
        aria-label="Select items"
      >
        <RiCheckLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" aria-hidden="true" />
        <span className="whitespace-nowrap">Select</span>
      </button>
    </div>
  );
}
