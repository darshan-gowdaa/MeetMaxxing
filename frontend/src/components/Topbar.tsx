"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparkling2Fill,
} from "@remixicon/react";

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#1e2023] backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)] hover:drop-shadow-[0_4px_16px_rgba(59,130,246,0.5)] transition-all">
          <span className="text-blue-500 flex items-center justify-center shrink-0">
            <RiSparkling2Fill className="w-6 h-6" />
          </span>
          <span className="font-black text-[17px] tracking-tight bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent truncate">
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
