"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparkling2Fill,
  RiFolderOpenLine,
  RiArrowLeftLine,
  RiCalendarEventLine,
} from "@remixicon/react";

const NAV_TABS = [
  {
    id: "dashboard",
    label: (isMeeting: boolean) => (isMeeting ? "Meeting" : "Dashboard"),
    icon: (isMeeting: boolean) =>
      isMeeting ? RiCalendarEventLine : RiVideoChatLine,
    href: "/",
    match: (p: string) => p === "/" || p.startsWith("/meetings/"),
  },
  {
    id: "context",
    label: () => "Context",
    icon: () => RiFolderOpenLine,
    href: "/context",
    match: (p: string) => p.startsWith("/context"),
  },
  {
    id: "memory",
    label: () => "Memory",
    icon: () => RiBrainLine,
    href: "/memory",
    match: (p: string) => p.startsWith("/memory"),
  },
];

export default function Topbar() {
  const pathname = usePathname();
  const isMeetingDetail = pathname.startsWith("/meetings/");

  return (
    <header className="sticky top-4 z-50 mx-4 sm:mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl bg-[#1a1c20]/95 backdrop-blur-2xl border border-white/[0.08] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="px-3 sm:px-5 h-[60px] flex items-center justify-between gap-4">

        {/* Left: Logo or Back */}
        <AnimatePresence mode="wait" initial={false}>
          {isMeetingDetail ? (
            <motion.div
              key="back"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-shrink-0"
            >
              <Link
                href="/"
                className="group flex items-center gap-2 pl-1 pr-3 h-8 rounded-full text-[13px] font-semibold text-[#8eaaff]/80 hover:text-[#8eaaff] transition-colors duration-150"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.06] group-hover:bg-white/[0.1] border border-white/[0.08] transition-colors">
                  <RiArrowLeftLine className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform duration-150" />
                </span>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-shrink-0"
            >
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-[#4a9eff] drop-shadow-[0_0_8px_rgba(74,158,255,0.5)]">
                  <RiSparkling2Fill className="w-5 h-5" />
                </span>
                <span className="font-black text-[16px] tracking-tight bg-gradient-to-r from-white via-[#a8c8ff] to-[#4a9eff] bg-clip-text text-transparent">
                  MeetMaxxing
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav pills */}
        <nav className="flex items-center bg-white/[0.04] rounded-full p-1 border border-white/[0.06]">
          {NAV_TABS.map((tab) => {
            const isActive = tab.match(pathname);
            const label = tab.label(isMeetingDetail);
            const IconComponent = tab.icon(isMeetingDetail);

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex items-center gap-1.5 px-3.5 sm:px-4 h-9 rounded-full text-[13px] font-semibold z-10 transition-colors duration-150 active:scale-[0.96] select-none"
                style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.45)" }}
              >
                {/* Sliding bubble — always rendered when active so layoutId tracks it */}
                {isActive && (
                  <motion.span
                    layoutId="nav-bubble"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(74,158,255,0.28) 0%, rgba(30,100,220,0.18) 100%)",
                      boxShadow: "inset 0 0 0 1px rgba(74,158,255,0.25)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 38,
                      mass: 0.8,
                    }}
                  />
                )}
                <IconComponent
                  className="w-[15px] h-[15px] shrink-0 relative z-10"
                  style={{
                    color: isActive ? "#7bbfff" : "rgba(255,255,255,0.4)",
                  }}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={label}
                    className="hidden sm:inline relative z-10 leading-none"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    {label}
                  </motion.span>
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
