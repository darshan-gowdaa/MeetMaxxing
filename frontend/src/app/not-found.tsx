import Link from "next/link";
import { RiSparkling2Fill } from "@remixicon/react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-[#4a9eff]"><RiSparkling2Fill className="w-8 h-8" /></span>
          <span className="font-black text-2xl bg-gradient-to-r from-white to-[#4a9eff] bg-clip-text text-transparent">MeetMaxxing</span>
        </div>
        <h1 className="text-8xl font-black text-white/10 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Page not found</h2>
        <p className="text-white/50 mb-8 max-w-sm">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="inline-flex h-12 px-8 bg-gradient-to-r from-[#4a9eff] to-[#3a7bd5] text-white font-semibold rounded-xl items-center justify-center hover:opacity-90 transition-opacity">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
