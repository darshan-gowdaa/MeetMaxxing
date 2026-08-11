import * as React from "react";

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
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest"
      } ${className}`}
      {...props}
    >
      <span
        className={`pointer-events-none block rounded-full transition-all duration-300 ${
          checked 
            ? "translate-x-[26px] h-6 w-6 bg-on-primary" 
            : "translate-x-1.5 h-4 w-4 bg-outline"
        }`}
      />
    </button>
  );
}
