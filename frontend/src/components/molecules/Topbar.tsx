"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiSparkling2Fill,
  RiFolderOpenLine,
  RiArrowLeftLine,
  RiInformationLine,
  RiLogoutBoxRLine,
  RiArrowDownSLine,
  RiSettings3Line,
  RiUserLine,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

const NAV_TABS = [
  {
    id: "dashboard",
    label: () => "Dashboard",
    icon: () => RiVideoChatLine,
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

const MOBILE_NAV_TABS = [
  ...NAV_TABS,
  {
    id: "profile",
    label: () => "Profile",
    icon: () => RiUserLine,
    href: "/settings/profile",
    match: (p: string) => p.startsWith("/settings"),
  },
];

export default function Topbar() {
  const pathname = usePathname();
  const isMeetingDetail = pathname.startsWith("/meetings/");
  const { user, signOut } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border transition-colors">
        <div className="h-16 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">

          {/* Left: Stable Anchor for Logo / Back (Zero CLS) */}
          <div className="min-w-0 md:w-48 h-12 shrink-0 relative flex items-center">
            <AnimatePresence initial={false}>
              {isMeetingDetail ? (
                <motion.div
                  key="back"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: [0.38, 1.21, 0.22, 1] }}
                  className="flex items-center"
                >
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 sm:gap-2 h-10 px-2 sm:px-2.5 -ml-1 rounded-full hover:bg-surface-container-high active:scale-[0.96] transition-all group text-text"
                    aria-label="Back to Dashboard"
                  >
                    <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-surface-container-highest transition-colors shrink-0">
                      <RiArrowLeftLine className="w-5 h-5 text-text group-hover:-translate-x-0.5 transition-transform" />
                    </span>
                    <span className="font-bold text-[13px] sm:text-[14px] text-text tracking-tight">
                      Dashboard
                    </span>
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2, ease: [0.38, 1.21, 0.22, 1] }}
                  className="flex items-center"
                >
                  <Link
                    href="/"
                    className="flex items-center gap-2 sm:gap-2.5 h-10 group active:scale-[0.98] transition-transform"
                  >
                    <span className="text-on-primary-container bg-primary-container w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <RiSparkling2Fill className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-[17px] sm:text-[20px] tracking-tight text-text whitespace-nowrap">
                      MeetMaxxing
                    </span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: MD3 Desktop Navigation Bar (Tonal active pill, zero underline jumps) */}
          <nav aria-label="Primary" className="hidden md:flex md:flex-1 items-center justify-center gap-2 h-full">
            {NAV_TABS.filter((tab) => user || tab.id === "about").map((tab) => {
              const isActive = tab.match(pathname);
              const label = tab.label();
              const IconComponent = tab.icon();

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex items-center justify-center gap-2 h-14 px-4 rounded-full group outline-none active:scale-[0.97] transition-transform"
                >
                  <div className="flex items-center justify-center gap-2 z-10 relative">
                    <span
                      className={`flex items-center justify-center w-12 h-8 rounded-full transition-all duration-200 ${
                        isActive
                          ? "bg-secondary-container text-on-secondary-container shadow-xs"
                          : "text-text-muted group-hover:bg-surface-container-high group-hover:text-text"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span
                      className={`text-[14px] font-medium transition-colors ${
                        isActive ? "text-text font-bold" : "text-text-muted group-hover:text-text"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Right side: User Profile or Login (Symmetric anchor) */}
          <div className="flex items-center justify-end md:w-48 shrink-0">
            {user ? (
              <ProfileDropdown user={user} signOut={signOut} />
            ) : (
              <Link
                href="/login"
                className="h-9 sm:h-10 px-3.5 sm:px-6 flex items-center justify-center rounded-full bg-primary text-on-primary text-[13px] sm:text-[14px] font-medium spring-colors hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (MD3 Expressive, fixed directly to viewport bottom) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border flex items-center justify-around gap-1 min-h-[4rem] pb-safe px-1.5 shadow-lg"
      >
        {(user
          ? MOBILE_NAV_TABS
          : [
              {
                id: "about",
                label: () => "About",
                icon: () => RiInformationLine,
                href: "/about",
                match: (p: string) => p.startsWith("/about"),
              },
              {
                id: "login",
                label: () => "Sign In",
                icon: () => RiUserLine,
                href: "/login",
                match: (p: string) => p === "/login",
              },
            ]
        ).map((tab) => {
          const isActive = tab.match(pathname);
          const label = tab.label();
          const IconComponent = tab.icon();

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center h-full py-1 rounded-xl group outline-none flex-1 active:scale-[0.96] transition-transform min-w-0"
            >
              <div className="flex flex-col items-center justify-center gap-0.5 z-10 relative">
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-secondary-container text-on-secondary-container shadow-xs font-semibold"
                      : "text-text-muted group-hover:bg-surface-container-high group-hover:text-text"
                  }`}
                >
                  <IconComponent className="w-5 h-5" aria-hidden="true" />
                </span>
                <span
                  className={`text-[11px] leading-tight truncate max-w-[64px] text-center transition-colors ${
                    isActive ? "text-text font-bold" : "text-text-muted group-hover:text-text font-medium"
                  }`}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

const MENU_ITEM_SELECTOR = '[role="menuitem"]';

function ProfileDropdown({ user, signOut }: { user: { email?: string; user_metadata?: { name?: string; avatar_url?: string } }; signOut: () => void }) {
  const [openState, setOpenState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  const close = useCallback((refocusTrigger = false) => {
    setOpenState(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenState(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Menu keyboard behaviour: Escape closes + returns focus, Tab closes,
  // ArrowUp/ArrowDown cycle the items (M3 menu pattern).
  useEffect(() => {
    if (!openState) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key === "Tab") {
        close(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []
        );
        if (items.length === 0) return;
        e.preventDefault();
        const activeIndex = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(activeIndex + 1) % items.length]
            : items[(activeIndex - 1 + items.length) % items.length];
        next?.focus();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [openState, close]);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = user?.email?.[0].toUpperCase() || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpenState(o => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !openState) {
            e.preventDefault();
            setOpenState(true);
            requestAnimationFrame(() => {
              ref.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
            });
          }
        }}
        aria-haspopup="menu"
        aria-expanded={openState}
        aria-label={openState ? "Close account menu" : "Open account menu"}
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors outline-none"
      >
        <span className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary-container text-on-primary-container font-medium text-sm" aria-hidden="true">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={32} height={32} />
          ) : (
            initial
          )}
        </span>
        <RiArrowDownSLine className="w-5 h-5 text-text-muted" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {openState && (
           <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -10 }}
            transition={reduced ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40 }}
            role="menu"
            aria-label="Account"
            className="absolute top-full right-0 mt-3 w-72 max-w-[calc(100vw-1.5rem)] bg-surface-container-highest rounded-[32px] shadow-lg flex flex-col p-2 z-50 origin-top-right border border-border"
          >
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex flex-shrink-0 items-center justify-center overflow-hidden font-medium text-xl" aria-hidden="true">
                {avatarUrl ? <Image src={avatarUrl} alt="" width={48} height={48} /> : initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-medium text-text truncate">{user.user_metadata?.name || "User"}</span>
                <span className="text-sm text-text-muted truncate">{user.email}</span>
              </div>
            </div>

            <div className="h-[1px] bg-border mx-3 my-1" aria-hidden="true" />

            <Link onClick={() => close(false)} href="/settings/profile" role="menuitem" className="flex items-center gap-3 px-4 py-3 rounded-3xl text-[14px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none hover:-translate-y-0.5 hover:shadow-sm">
              <RiUserLine className="w-5 h-5 text-text-muted" aria-hidden="true" /> Profile
            </Link>

            <Link onClick={() => close(false)} href="/settings" role="menuitem" className="flex items-center gap-3 px-4 py-3 rounded-3xl text-[14px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none hover:-translate-y-0.5 hover:shadow-sm">
              <RiSettings3Line className="w-5 h-5 text-text-muted" aria-hidden="true" /> Settings
            </Link>

            <button onClick={() => { close(false); signOut(); }} role="menuitem" className="w-full flex items-center gap-3 px-4 py-3 rounded-3xl text-[14px] font-medium text-risk hover:bg-risk-container hover:text-on-risk-container transition-colors outline-none hover:-translate-y-0.5 hover:shadow-sm">
              <RiLogoutBoxRLine className="w-5 h-5" aria-hidden="true" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
