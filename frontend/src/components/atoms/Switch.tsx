import * as React from "react";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, disabled, className = "", ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 touch-manipulation before:absolute before:-inset-2 before:content-[''] disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest"
      } ${className}`}
      {...props}
    >
      <span
        className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full shadow-xs transition-transform duration-200 ${
          checked 
            ? "translate-x-[22px] bg-on-primary text-primary" 
            : "translate-x-0.5 bg-outline text-surface-container-highest"
        }`}
      >
        {checked ? (
          <RiCheckLine className="w-4 h-4 text-primary" />
        ) : (
          <RiCloseLine className="w-3.5 h-3.5 text-surface-container-highest" />
        )}
      </span>
    </button>
  );
}
