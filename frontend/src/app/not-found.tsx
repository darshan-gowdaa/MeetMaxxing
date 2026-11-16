"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiHome5Line, RiArrowLeftLine, RiSparkling2Fill } from "@remixicon/react";
import { M3Button } from "@/components/atoms/M3Button";
import { M3Shape } from "@/components/atoms/M3Shape";

/**
 * Material 3 Expressive 404 Not Found Page.
 * Clean, minimal, uncluttered design following MD3 Expressive standards:
 * - 35-shape morphing hero centerpiece (M3Shape 'soft-burst').
 * - High-contrast Display-Large typography.
 * - Simple, focused dual-pill M3 actions (Filled + Tonal).
 * - Zero unnecessary navigation clutter.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      <div className="w-full max-w-md mx-auto text-center flex flex-col items-center animate-fade-scale">
        {/* Expressive M3 Shape Icon */}
        <div className="mb-6 transition-transform duration-300 hover:scale-105 select-none">
          <M3Shape
            name="soft-burst"
            size={80}
            color="var(--primary-container)"
            className="shadow-xs"
          >
            <RiSparkling2Fill
              className="w-9 h-9 text-on-primary-container"
              aria-hidden="true"
            />
          </M3Shape>
        </div>

        {/* Display Code */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tight text-text mb-2 select-none">
          404
        </h1>

        {/* Headline & Body */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-3">
          Page not found
        </h2>
        <p className="text-sm sm:text-base text-text-muted max-w-xs sm:max-w-sm mx-auto leading-relaxed mb-8 font-normal">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Clean M3 Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <M3Button
            variant="filled"
            size="lg"
            icon={RiHome5Line}
            href="/"
            className="w-full sm:w-auto shadow-xs"
          >
            Go to Dashboard
          </M3Button>

          <M3Button
            variant="tonal"
            size="lg"
            icon={RiArrowLeftLine}
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Go back
          </M3Button>
        </div>
      </div>
    </main>
  );
}
