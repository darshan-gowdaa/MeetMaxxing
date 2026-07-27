"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparkling2Fill,
  RiFolderOpenLine,
} from "@remixicon/react";

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 mx-4 sm:mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl bg-[#1e2023]/95 backdrop-blur-2xl border border-border rounded-full shadow-2xl transition-all">
      <div className="px-5 sm:px-8 h-[60px] flex items-center justify-between gap-4">
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
        <nav className="flex items-center gap-1 sm:gap-2 relative">
          {[
            { name: "Dashboard", href: "/", match: (p: string) => p === "/" || p.startsWith("/meetings/"), icon: RiVideoChatLine },
            { name: "Context", href: "/context", match: (p: string) => p === "/context", icon: RiFolderOpenLine },
            { name: "Memory", href: "/memory", match: (p: string) => p === "/memory", icon: RiBrainLine },
          ].map((tab) => {
            const isActive = tab.match(pathname);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`relative flex items-center gap-2 px-4 sm:px-5 h-10 rounded-full text-sm font-bold z-10 transition-colors active:scale-[0.95] ${
                  isActive ? "text-on-primary-container" : "text-text-muted hover:text-text hover:bg-surface2"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="topbar-active-tab"
                    className="absolute inset-0 bg-primary-container rounded-full z-[-1]"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

