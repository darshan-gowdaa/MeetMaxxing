"use client";

import { useEffect } from "react";
import Link from"next/link";
import { RiErrorWarningLine, RiRefreshLine } from"@remixicon/react";

/**
 * Route error boundary — M3 styled to match the 404 card language.
 * Errors stay visible (no auto-retry loops); "Try again" re-renders the segment.
 */
export default function Error({
	 error,
	 reset,
}: {
	 error: Error & { digest?: string };
	 reset: () => void;
}) {
	 useEffect(() => {
	 // Surface for diagnostics without leaking details into the UI
	 console.error(error);
	 }, [error]);

	 return (
	 <div className="min-h-screen bg-bg flex items-center justify-center p-4 animate-fade-scale">
	 <div className="text-center bg-surface-container rounded-[32px] p-12 max-w-lg w-full border border-border md3-glow-primary">
	 <div className="w-16 h-16 rounded-full bg-risk-container flex items-center justify-center mx-auto mb-8">
	 <RiErrorWarningLine className="w-8 h-8 text-risk" aria-hidden="true" />
	 </div>
	 <h1 className="text-2xl font-black text-text mb-3">Something went wrong</h1>
	 <p className="text-text-muted mb-10 max-w-sm mx-auto font-medium text-sm leading-relaxed">
	 An unexpected error occurred while loading this page. Your data is safe — try again, or head back to the dashboard.
	 </p>
	 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
	 <button
	 onClick={reset}
	 className="inline-flex h-14 px-8 bg-primary text-on-primary font-bold rounded-full items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors spring"
	 >
	 <RiRefreshLine className="w-4 h-4" aria-hidden="true" />
	 Try again
	 </button>
	 <Link
	 href="/"
	 className="inline-flex h-14 px-8 border border-border text-text font-bold rounded-full items-center justify-center hover:bg-surface2 transition-colors spring-colors"
	 >
	 Go to Dashboard
	 </Link>
	 </div>
	 </div>
	 </div>
	 );
}
