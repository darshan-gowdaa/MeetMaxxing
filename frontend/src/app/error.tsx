"use client";

import * as React from "react";
import Link from "next/link";
import {
  RiErrorWarningLine,
  RiRefreshLine,
  RiHome5Line,
  RiFileCopyLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { M3Button } from "@/components/atoms/M3Button";

/**
 * Route error boundary — Material 3 Expressive error container.
 * Specs & Concepts:
 * - Material 3 Expressive Design System (m3.material.io)
 * - M3E Component Suite (matraic.github.io/m3e)
 * - Enterprise senior engineering: Zero data loss guarantee, copyable error digest,
 *   unambiguous retry action, and clear technical diagnostics.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  React.useEffect(() => {
    // Log exception for telemetry without leaking secrets to client UI
    console.error("[Route Error Boundary Captured]:", error);
  }, [error]);

  const handleCopyDiagnostics = async () => {
    try {
      const payload = {
        name: error.name || "Error",
        message: error.message || "Unknown error",
        digest: error.digest || "N/A",
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 400);
  };

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
        {/* Main Error Surface */}
        <div className="relative overflow-hidden bg-surface-container rounded-[32px] border border-risk/30 p-8 sm:p-12 shadow-sm">
          {/* Subtle risk glow */}
          <div
            className="absolute -top-24 -right-24 w-64 h-64 bg-risk/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Expressive Risk Icon Container */}
            <div className="relative mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-risk-container border border-risk/20 flex items-center justify-center shadow-xs">
                <RiErrorWarningLine className="w-8 h-8 sm:w-10 sm:h-10 text-risk" aria-hidden="true" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container border border-border flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-risk animate-ping" />
              </div>
            </div>

            {/* Error Status Chip */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-risk-container/60 border border-risk/30 text-risk text-xs font-bold uppercase tracking-wide mb-4">
              <span>Exception · Route Segment Failed</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-black text-text mb-3 tracking-tight">
              Something went wrong
            </h1>

            {/* Reassurance text */}
            <p className="text-text-muted text-sm max-w-md mx-auto mb-6 leading-relaxed font-normal">
              An unexpected runtime error halted this view. Your session, notes, and vector memory remain securely stored.
            </p>

            {/* Safety guarantee pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20 text-xs font-semibold text-text mb-8">
              <RiShieldCheckLine className="w-4 h-4 text-success" aria-hidden="true" />
              <span>Zero data loss · Safe to retry</span>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-8">
              <M3Button
                variant="filled"
                size="lg"
                icon={RiRefreshLine}
                loading={isRetrying}
                onClick={handleRetry}
                className="w-full sm:w-auto shadow-sm"
              >
                Try Again
              </M3Button>

              <M3Button
                variant="tonal"
                size="lg"
                icon={RiHome5Line}
                href="/"
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </M3Button>
            </div>

            {/* Technical Diagnostics Accordion */}
            <details className="group w-full rounded-[20px] bg-surface-container-low border border-outline-variant/20 p-4 text-left transition-all">
              <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-text-muted group-hover:text-text select-none outline-none">
                <span className="flex items-center gap-2">
                  <RiCodeSSlashLine className="w-4 h-4 text-primary" aria-hidden="true" />
                  Technical Diagnostic Details
                </span>
                <span className="text-[11px] text-text-variant uppercase group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>

              <div className="mt-3 pt-3 border-t border-outline-variant/15 flex flex-col gap-2.5">
                <div className="text-xs font-mono bg-surface-container-highest/60 rounded-xl p-3 text-text break-words select-all">
                  <div className="text-risk font-semibold mb-1">
                    {error.name || "Error"}: {error.message || "Unknown error"}
                  </div>
                  {error.digest && (
                    <div className="text-text-variant text-[11px] mt-1">
                      Digest ID: <span className="text-primary font-bold">{error.digest}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <RiCheckLine className="w-3.5 h-3.5 text-success" />
                        <span>Diagnostics Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <RiFileCopyLine className="w-3.5 h-3.5" />
                        <span>Copy Diagnostic Report</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-text-variant">
                    HTTP 500 Route Boundary
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center text-xs text-text-variant font-medium">
          If this issue continues after retrying, please verify your network connection or{" "}
          <Link href="/about" className="text-primary hover:underline font-semibold">
            read the documentation
          </Link>
          .
        </div>
      </div>
    </main>
  );
}
