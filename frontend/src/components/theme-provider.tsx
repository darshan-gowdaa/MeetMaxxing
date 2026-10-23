"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const applyHighContrast = () => {
      try {
        const storedContrast = localStorage.getItem("meetmaxxing_high_contrast") === "true";
        if (storedContrast) {
          document.documentElement.classList.add("high-contrast");
        } else {
          document.documentElement.classList.remove("high-contrast");
        }
      } catch {
        // Ignore localStorage access restrictions
      }
    };

    applyHighContrast();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "meetmaxxing_high_contrast") {
        applyHighContrast();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("meetmaxxing_contrast_change", applyHighContrast);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meetmaxxing_contrast_change", applyHighContrast);
    };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
