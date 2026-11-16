"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiSparkling2Fill,
  RiSearchLine,
  RiHome5Line,
  RiArrowLeftLine,
  RiVideoChatLine,
  RiBrainLine,
  RiFolderOpenLine,
  RiSettings4Line,
  RiCompass3Line,
} from "@remixicon/react";
import { M3Breadcrumb } from "@/components/atoms/M3Breadcrumb";
import { M3Button } from "@/components/atoms/M3Button";

/**
 * Material 3 Expressive 404 Not Found Page.
 * Specs & Concepts:
 * - Material 3 Expressive Design System (m3.material.io)
 * - M3E Component Suite (matraic.github.io/m3e)
 * - Features: Tonal surface hierarchy, Display-Large typography, recovery search,
 *   expressive navigation chips, and resilient UX paths.
 */
export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/memory?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const destinations = [
    {
      title: "Recent Meetings",
      desc: "Browse captured Google Meet sessions",
      href: "/meetings",
      icon: RiVideoChatLine,
    },
    {
      title: "Memory Intelligence",
      desc: "Search cross-meeting decisions & topics",
      href: "/memory",
      icon: RiBrainLine,
    },
    {
      title: "Context Library",
      desc: "Inspect uploaded documents and PDFs",
      href: "/context",
      icon: RiFolderOpenLine,
    },
    {
      title: "Settings & Keys",
      desc: "Configure AI providers & integrations",
      href: "/settings",
      icon: RiSettings4Line,
    },
  ];

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* M3 Breadcrumb */}
        <div className="px-2">
          <M3Breadcrumb
            items={[
              { label: "Home", href: "/", icon: RiHome5Line },
              { label: "404 Not Found" },
            ]}
          />
        </div>

        {/* Main M3 Surface Container */}
        <div className="relative overflow-hidden bg-surface-container rounded-[32px] border border-outline-variant/25 p-8 sm:p-12 shadow-sm">
          {/* Subtle decorative radial gradient */}
          <div
            className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Top brand header badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 mb-6 shadow-xs">
              <RiSparkling2Fill className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-bold text-text tracking-wide uppercase">
                MeetMaxxing · HTTP 404
              </span>
            </div>

            {/* Display Large Error Code */}
            <div className="relative mb-3 select-none">
              <h1 className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40 tracking-tight">
                404
              </h1>
              <div
                className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none"
                aria-hidden="true"
              >
                <RiCompass3Line className="w-32 h-32 text-primary" />
              </div>
            </div>

            {/* Headline and Supportive Text */}
            <h2 className="text-2xl sm:text-3xl font-black text-text mb-3 tracking-tight">
              Lost in the Meeting Stream?
            </h2>
            <p className="text-text-muted text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed font-normal">
              The page, recording, or endpoint you are looking for has been moved, renamed, or never existed in your organization.
            </p>

            {/* Quick Search Recovery Bar */}
            <form
              onSubmit={handleSearch}
              className="w-full max-w-md mb-8 flex items-center gap-2 bg-surface-container-low rounded-full border border-outline-variant/30 p-1.5 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
            >
              <div className="pl-3.5 text-text-muted">
                <RiSearchLine className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings, decisions, or files..."
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/60 outline-none px-2 py-1.5 font-medium"
              />
              <M3Button
                type="submit"
                variant="filled"
                size="sm"
                className="shrink-0"
              >
                Search
              </M3Button>
            </form>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-10">
              <M3Button
                variant="filled"
                size="lg"
                icon={RiHome5Line}
                href="/"
                className="w-full sm:w-auto shadow-sm"
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

            {/* Quick Navigation Destinations Grid */}
            <div className="w-full border-t border-outline-variant/20 pt-8">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 text-center">
                Or jump directly to a core workspace
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {destinations.map((dest) => {
                  const Icon = dest.icon;
                  return (
                    <Link
                      key={dest.title}
                      href={dest.href}
                      className="group flex items-start gap-3.5 p-3.5 rounded-[20px] bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 hover:border-outline-variant/30 transition-all duration-200 active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-[14px] bg-surface-container-highest flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                        <Icon className="w-5 h-5 text-primary group-hover:text-on-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                          {dest.title}
                        </h4>
                        <p className="text-xs text-text-muted truncate mt-0.5">
                          {dest.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer status link */}
        <div className="text-center text-xs text-text-variant font-medium">
          MeetMaxxing Workspace · Need technical help?{" "}
          <Link href="/about" className="text-primary hover:underline font-semibold">
            System Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
