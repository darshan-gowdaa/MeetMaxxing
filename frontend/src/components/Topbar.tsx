"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparkling2Fill,
  RiFolderOpenLine,
} from "@remixicon/react";

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#1e2023] backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-2 group transition-all">
          <div className="relative flex items-center justify-center">
            {/* Subtle glow aura */}
            <div className="absolute inset-0 bg-white/5 rounded-full blur-sm group-hover:bg-white/10 transition-all duration-300" />
            <span className="relative text-blue-400 flex items-center justify-center shrink-0 drop-shadow-[0_2px_4px_rgba(255,255,255,0.15)]">
              <RiSparkling2Fill className="w-6 h-6" />
            </span>
          </div>
          <span className="font-black text-[17px] tracking-tight bg-gradient-to-br from-white via-blue-200 to-blue-500 bg-clip-text text-transparent truncate drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)]">
            MeetMaxxing
          </span>
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
            href="/context"
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium spring-colors ${
              pathname === "/context"
                ? "bg-primary-container text-on-primary-container"
                : "text-text-muted hover:text-text hover:bg-surface2"
            }`}
          >
            <RiFolderOpenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Context</span>
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
