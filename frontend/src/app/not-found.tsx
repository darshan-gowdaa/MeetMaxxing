"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiHome5Line,
  RiArrowLeftLine,
  RiCompass3Line,
  RiVideoChatLine,
  RiBrainLine,
  RiFolderOpenLine,
  RiSettings4Line,
} from "@remixicon/react";
import { M3Breadcrumb } from "@/components/atoms/M3Breadcrumb";
import { M3Button } from "@/components/atoms/M3Button";
import { M3Shape } from "@/components/atoms/M3Shape";

/**
 * Material 3 Expressive 404 Page.
 * Strictly adheres to Material 3 Expressive design tokens:
 * - Dynamic tonal surface container with 40px expressive rounded corners.
 * - 35-shape morphing hero centerpiece (M3Shape 'soft-burst').
 * - High-contrast expressive typography scale (Display-Large & Headline-Medium).
 * - Full-pill (9999px) primary filled and tonal action buttons.
 * - Horizontal M3 Assist Chips for quick workspace navigation.
 * Spec: https://m3.material.io & https://matraic.github.io/m3e
 */
export default function NotFound() {
  const router = useRouter();

  const assistChips = [
    { label: "Meetings", href: "/meetings", icon: RiVideoChatLine },
    { label: "Memory Intelligence", href: "/memory", icon: RiBrainLine },
    { label: "Context Files", href: "/context", icon: RiFolderOpenLine },
    { label: "Settings", href: "/settings", icon: RiSettings4Line },
  ];

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 sm:gap-6 animate-fade-scale">
        {/* M3 Breadcrumb */}
        <div className="px-3">
          <M3Breadcrumb
            items={[
              { label: "Home", href: "/", icon: RiHome5Line },
              { label: "404 Not Found" },
            ]}
          />
        </div>

        {/* M3 Expressive Card Container */}
        <div className="relative overflow-hidden bg-surface-container-low border border-outline-variant/20 rounded-[36px] sm:rounded-[44px] p-8 sm:p-14 text-center shadow-sm">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-32 -right-32 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -left-32 w-72 h-72 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Expressive M3 Shape Centerpiece */}
            <div className="mb-6 relative transition-transform duration-300 hover:scale-105">
              <M3Shape
                name="soft-burst"
                size={88}
                color="var(--primary-container)"
                className="shadow-sm"
              >
                <RiCompass3Line
                  className="w-10 h-10 text-on-primary-container"
                  aria-hidden="true"
                />
              </M3Shape>
            </div>

            {/* Display Code */}
            <div className="select-none mb-1">
              <span className="text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-text to-text-muted">
                404
              </span>
            </div>

            {/* Headline & Body */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2.5">
              Lost in the Meeting Stream?
            </h1>
            <p className="text-sm sm:text-base text-text-muted max-w-md mx-auto leading-relaxed mb-8 font-normal">
              The page or recording you are looking for doesn&apos;t exist or has been relocated to another workspace.
            </p>

            {/* Primary & Tonal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-10">
              <M3Button
                variant="filled"
                size="lg"
                icon={RiHome5Line}
                href="/"
                className="w-full sm:w-auto shadow-xs"
              >
                Return to Dashboard
              </M3Button>

              <M3Button
                variant="tonal"
                size="lg"
                icon={RiArrowLeftLine}
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Go Back
              </M3Button>
            </div>

            {/* M3 Assist Chips Row */}
            <div className="w-full border-t border-outline-variant/15 pt-6 flex flex-col items-center">
              <span className="text-[11px] font-bold text-text-variant uppercase tracking-wider mb-3.5">
                Quick Navigation
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {assistChips.map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-full bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 hover:bg-surface-container-high text-xs font-semibold text-text transition-all duration-200 active:scale-[0.97]"
                    >
                      <ChipIcon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span>{chip.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ambient status indicator */}
        <div className="text-center text-xs text-text-variant">
          MeetMaxxing · Google Meet Intelligence Platform
        </div>
      </div>
    </main>
  );
}
