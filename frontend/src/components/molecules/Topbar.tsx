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
  RiArrowDownSLine,
  RiSettings3Line,
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
    <header className="sticky top-0 z-50 w-full bg-surface border-b border-border transition-colors">
      <div className="h-16 px-4 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left: Logo or Back (Small Top App Bar styling) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {isMeetingDetail ? (
              <motion.div
                key="back"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Link
                  href="/"
                  className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-container-high transition-colors"
                  aria-label="Back to Dashboard"
                >
                  <RiArrowLeftLine className="w-6 h-6 text-text" />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Link href="/" className="flex items-center gap-3 pr-4 h-12">
                  <span className="text-on-primary-container bg-primary-container w-10 h-10 rounded-full flex items-center justify-center">
                    <RiSparkling2Fill className="w-6 h-6" />
                  </span>
                  <span className="font-medium text-[22px] tracking-tight text-text">
                    MeetMaxxing
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: MD3 Tabs */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-2 h-full">
          {NAV_TABS.filter((tab) => user || tab.id === "about").map((tab) => {
            const isActive = tab.match(pathname);
            const label = tab.label(isMeetingDetail);
            const IconComponent = tab.icon(isMeetingDetail);

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex items-center gap-2 h-14 px-4 rounded-full group outline-none"
              >
                <div className="flex items-center gap-2 z-10 relative">
                  <span className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-text-muted group-hover:bg-surface-container-high group-hover:text-text'}`}>
                    <IconComponent className="w-5 h-5" />
                  </span>
                  <span className={`text-[14px] font-medium transition-colors ${isActive ? 'text-text' : 'text-text-muted group-hover:text-text'}`}>
                    {label}
                  </span>
                </div>
                {/* Optional Active underline for Primary Tabs */}
                {isActive && (
                  <motion.div
                    layoutId="md3-active-tab"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side: User Profile or Login */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {user ? (
            <ProfileDropdown user={user} signOut={signOut} />
          ) : (
            <Link
              href="/login"
              className="h-10 px-6 flex items-center justify-center rounded-full bg-primary text-on-primary text-[14px] font-medium transition-colors hover:opacity-90"
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
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors outline-none"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary-container text-on-primary-container font-medium text-sm">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={32} height={32} />
          ) : (
            initial
          )}
        </div>
        <RiArrowDownSLine className="w-5 h-5 text-text-muted" />
      </button>

      <AnimatePresence>
        {openState && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className="absolute top-full right-0 mt-3 w-72 bg-surface-container-highest rounded-[24px] shadow-sm flex flex-col p-2 z-50 origin-top-right"
          >
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex flex-shrink-0 items-center justify-center overflow-hidden font-medium text-xl">
                {avatarUrl ? <Image src={avatarUrl} alt="Avatar" width={48} height={48} /> : initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-medium text-text truncate">{user.user_metadata?.name || "User"}</span>
                <span className="text-sm text-text-muted truncate">{user.email}</span>
              </div>
            </div>
            
            <div className="h-[1px] bg-border mx-3 my-1" />
            
            <Link onClick={() => setOpenState(false)} href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none">
              <RiSettings3Line className="w-5 h-5 text-text-muted" /> Settings
            </Link>
            
            <button onClick={() => { setOpenState(false); signOut(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-medium text-risk hover:bg-risk-container hover:text-on-risk-container transition-colors outline-none">
              <RiLogoutBoxRLine className="w-5 h-5" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
