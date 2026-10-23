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
    <div className="flex items-center bg-surface-container-high/65 dark:bg-surface-container-high/50 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 dark:border-white/10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_32px_-4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_-4px_rgba(0,0,0,0.36)] p-1.5 gap-1.5 w-full sm:w-auto transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/60">
      {/* Integrated Search Input with M3 Expressive frosted inset */}
      <div className="relative flex-1 sm:flex-none flex items-center min-w-0 bg-surface-container-low/60 dark:bg-surface-container-lowest/40 hover:bg-surface-container-low/80 focus-within:bg-surface-container-lowest/90 dark:focus-within:bg-surface-container-lowest/80 rounded-full border border-outline-variant/20 dark:border-white/5 transition-all">
        <RiSearchLine
          className="w-4 h-4 text-text-muted ml-3 shrink-0 pointer-events-none transition-colors"
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
            className="absolute right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-surface-container/80 hover:bg-surface-container-highest text-text-muted hover:text-text transition-all active:scale-90"
            aria-label="Clear search"
          >
            <RiCloseLine className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Subtle Divider */}
      <div className="h-5 w-px bg-outline-variant/30 dark:bg-white/10 shrink-0" aria-hidden="true" />

      {/* Sort Chip with M3 Expressive Translucent Menu */}
      <div className="relative shrink-0" ref={sortRef}>
        <button
          type="button"
          onClick={() => setSortOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          aria-label="Sort options"
          className="h-8 sm:h-9 px-3 rounded-full flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-text bg-surface-container-low/60 dark:bg-surface-container-lowest/40 hover:bg-surface-container/80 dark:hover:bg-surface-container-high/60 border border-outline-variant/20 dark:border-white/5 transition-all active:scale-[0.96] shadow-xs"
        >
          <RiSortDesc className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted" aria-hidden="true" />
          <span className="whitespace-nowrap font-medium">{currentSortLabel}</span>
          <RiArrowDownSLine
            className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${sortOpen ? "rotate-180 text-primary" : ""}`}
            aria-hidden="true"
          />
        </button>

        {sortOpen && (
          <div
            role="listbox"
            className="absolute top-full right-0 mt-2 w-40 bg-surface-container-highest/85 dark:bg-surface-container-highest/90 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl border border-white/20 dark:border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.15)] p-1.5 z-50 animate-fade-scale"
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all ${
                  sortBy === opt.value
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                    : "text-text hover:bg-surface-container-high/80 dark:hover:bg-surface-container-high/60"
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
        className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-full flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-text bg-surface-container-low/60 dark:bg-surface-container-lowest/40 hover:bg-surface-container/80 hover:text-primary dark:hover:bg-surface-container-high/60 border border-outline-variant/20 dark:border-white/5 transition-all active:scale-[0.96] shrink-0 shadow-xs"
        aria-label="Select items"
      >
        <RiCheckLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" aria-hidden="true" />
        <span className="whitespace-nowrap font-medium">Select</span>
      </button>
    </div>
  );
}
