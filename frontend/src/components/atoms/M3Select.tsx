"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react";

export interface M3SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  description?: string;
}

export interface M3SelectProps<T extends string | number = string> {
  options: M3SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  leadingIcon?: React.ElementType;
  id?: string;
}

/**
 * Material 3 Expressive (M3E) Select Component
 * - Tonal container with 20px expressive radius
 * - Spring chevron rotation
 * - Surface container floating listbox with rounded-14px active items
 * - Accessible WAI-ARIA combobox / listbox pattern with keyboard navigation
 */
export function M3Select<T extends string | number = string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  leadingIcon: LeadingIcon,
  id,
}: M3SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectOption = (optValue: T) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const IconToRender = selectedOption?.icon || LeadingIcon;

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 px-1"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full bg-surface-container-high/60 hover:bg-surface-container-high border border-outline-variant/40 rounded-[20px] px-5 py-4 text-sm font-medium text-text flex items-center justify-between gap-3 text-left transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "border-primary bg-surface-container-high ring-2 ring-primary/10" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {IconToRender && (
            <IconToRender className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          )}
          <span className={`truncate ${selectedOption ? "text-text font-medium" : "text-text-muted"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <RiArrowDownSLine
          className={`w-5 h-5 text-text-muted shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Expressive Floating Menu Surface */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-surface-container-high/95 backdrop-blur-xl rounded-[20px] border border-outline-variant/30 shadow-2xl p-2 max-h-64 overflow-y-auto hide-scrollbar animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const ItemIcon = opt.icon;
            return (
              <div
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelectOption(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectOption(opt.value);
                  }
                }}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] text-sm font-medium cursor-pointer transition-all duration-150 active:scale-[0.98] outline-none ${
                  isSelected
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                    : "text-text hover:bg-surface-container-highest/80 focus:bg-surface-container-highest/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {ItemIcon && (
                    <ItemIcon
                      className={`w-4 h-4 shrink-0 ${isSelected ? "text-on-primary-container" : "text-text-muted"}`}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span
                        className={`text-xs opacity-75 truncate ${
                          isSelected ? "text-on-primary-container" : "text-text-muted"
                        }`}
                      >
                        {opt.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <RiCheckLine className="w-4 h-4 text-on-primary-container shrink-0" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
