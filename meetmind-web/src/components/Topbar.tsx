import Link from "next/link";
import { RiVideoChatLine, RiBrainLine } from "@remixicon/react";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border h-16 px-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center transition-colors group-hover:bg-primary/30">
          <RiVideoChatLine className="text-primary w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-text leading-tight">MeetMaxxing</h1>
          <p className="text-xs text-text-muted font-medium">Enterprise AI Copilot</p>
        </div>
      </Link>
      <Link
        href="/memory"
        className="flex items-center gap-2 bg-surface2 hover:bg-surface3 border border-border px-4 h-10 rounded-full text-sm font-bold text-text transition-colors shadow-sm"
      >
        <RiBrainLine className="w-4 h-4 text-primary" />
        Memory Center
      </Link>
    </header>
  );
}
