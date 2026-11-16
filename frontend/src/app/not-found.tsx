"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiHome5Line, RiArrowLeftLine } from "@remixicon/react";
import { M3Button } from "@/components/atoms/M3Button";

/**
 * Minimalist Material 3 Expressive 404 Not Found Page.
 * - Zero shapes, zero logos.
 * - Perfectly fitted to viewport with zero scrollbars across all screen sizes.
 * - High-contrast Display 404 typography.
 * - Dual M3 action buttons (Filled + Tonal).
 */
export default function NotFound() {
  const router = useRouter();

  // Ensure body scrollbars remain suppressed while viewing 404
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-4 py-6 sm:px-6 text-center select-none overflow-hidden my-auto">
      <div className="w-full max-w-md mx-auto text-center flex flex-col items-center animate-fade-scale">
        {/* Display Code */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-text leading-none select-none mb-3 sm:mb-4">
          404
        </h1>

        {/* Headline & Body */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-text tracking-tight mb-2 sm:mb-3">
          Page not found
        </h2>
        <p className="text-sm sm:text-base text-text-muted max-w-xs sm:max-w-sm mx-auto leading-relaxed mb-6 sm:mb-8 font-normal">
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
    </div>
  );
}
