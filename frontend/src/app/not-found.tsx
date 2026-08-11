import Link from"next/link";
import { RiSparkling2Fill } from"@remixicon/react";

export default function NotFound() {
 return (
 <div className="min-h-screen bg-bg flex items-center justify-center p-4 animate-fade-scale">
 <div className="text-center bg-surface-container rounded-[32px] p-12 max-w-lg w-full border border-border md3-glow-primary">
 <div className="flex flex-col items-center justify-center gap-3 mb-8">
 <RiSparkling2Fill className="w-12 h-12 text-primary"/>
 <span className="font-black text-2xl text-text">MeetMaxxing</span>
 </div>
 <h1 className="text-8xl font-black text-surface-highest mb-2 select-none">404</h1>
 <h2 className="text-2xl font-black text-text mb-4">Page not found</h2>
 <p className="text-text-muted mb-10 max-w-sm mx-auto font-medium text-sm">
 The page you&apos;re looking for doesn&apos;t exist or has been moved.
 </p>
 <Link href="/"className="inline-flex h-14 px-8 bg-primary text-on-primary font-bold rounded-full items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors spring">
 Go to Dashboard
 </Link>
 </div>
 </div>
 );
}
