"use client";

import { useState, useRef, useEffect } from "react";
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
  RiInformationLine,
  RiLogoutBoxRLine,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

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
  {
    id: "about",
    label: () => "About",
    icon: () => RiInformationLine,
    href: "/about",
    match: (p: string) => p.startsWith("/about"),
  },
];

export default function Topbar() {
  const pathname = usePathname();
  const isMeetingDetail = pathname.startsWith("/meetings/");
  const { user, signOut } = useAuth();

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
          {NAV_TABS.filter((tab) => user || tab.id === "about").map((tab) => {
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

        {/* Right side: User Profile or Login */}
        <div className="flex items-center gap-3">
          {user ? (
            <ProfileDropdown user={user} signOut={signOut} />
          ) : (
            <Link
              href="/login"
              className="h-8 px-4 flex items-center justify-center rounded-full bg-[#4a9eff] hover:bg-[#3a7bd5] text-white text-[13px] font-semibold transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileDropdown({ user, signOut }: { user: { email?: string; user_metadata?: { name?: string; avatar_url?: string } }; signOut: () => void }) {
  const [openState, setOpenState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenState(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = user?.email?.[0].toUpperCase() || "U";
  
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpenState(o => !o)}
        className="w-8 h-8 rounded-full bg-surface2 hover:bg-surface3 border border-border flex items-center justify-center shrink-0 overflow-hidden spring-colors focus:outline-none"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Avatar" width={32} height={32} />
        ) : (
          <span className="text-sm font-semibold">{initial}</span>
        )}
      </button>

      <AnimatePresence>
        {openState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full right-0 mt-2 w-64 bg-surface-highest rounded-[20px] border border-border shadow-2xl overflow-hidden z-50 flex flex-col p-1.5"
          >
            <div className="px-3 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface2 flex flex-shrink-0 items-center justify-center overflow-hidden">
                {avatarUrl ? <Image src={avatarUrl} alt="Avatar" width={40} height={40} /> : <span className="font-semibold text-lg">{initial}</span>}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-text truncate">{user.user_metadata?.name || "User"}</span>
                <span className="text-[12px] text-text-muted truncate">{user.email}</span>
              </div>
            </div>
            
            <div className="h-px bg-border mx-2 my-1" />
            
            <Link onClick={() => setOpenState(false)} href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-text hover:bg-surface2 spring-colors">
              <RiInformationLine className="w-4 h-4 text-text-muted" /> Profile
            </Link>
            <Link onClick={() => setOpenState(false)} href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-text hover:bg-surface2 spring-colors">
              <RiFolderOpenLine className="w-4 h-4 text-text-muted" /> Settings
            </Link>
            <Link onClick={() => setOpenState(false)} href="/settings/api-keys" className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-text hover:bg-surface2 spring-colors">
              <RiBrainLine className="w-4 h-4 text-text-muted" /> API Keys
            </Link>
            
            <div className="h-px bg-border mx-2 my-1" />
            
            <button onClick={() => { setOpenState(false); signOut(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-risk hover:bg-risk-container/30 spring-colors">
              <RiLogoutBoxRLine className="w-4 h-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

