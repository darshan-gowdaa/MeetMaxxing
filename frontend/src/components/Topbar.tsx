"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparklingLine,
} from "@remixicon/react";

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#1e2023] backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[16px] bg-primary-container flex items-center justify-center shadow-lg"
               style={{ boxShadow: "0 4px 16px var(--primary-glow-hover)" }}>
            <RiVideoChatLine className="text-on-primary-container w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-text leading-none">MeetMaxxing</span>
            <span className="text-[11px] text-text-muted font-medium mt-0.5 flex items-center gap-1">
              <RiSparklingLine className="w-2.5 h-2.5 text-tertiary" />
              AI Copilot
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium spring-colors ${
              pathname === "/" || pathname.startsWith("/meetings/")
                ? "bg-primary-container text-on-primary-container"
                : "text-text-muted hover:text-text hover:bg-surface2"
            }`}
          >
            <RiVideoChatLine className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/memory"
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium spring-colors ${
              pathname === "/memory"
                ? "bg-primary-container text-on-primary-container"
                : "text-text-muted hover:text-text hover:bg-surface2"
            }`}
          >
            <RiBrainLine className="w-4 h-4" />
            <span className="hidden sm:inline">Memory</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
