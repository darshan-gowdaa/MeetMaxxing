"use client";

import { useEffect } from"react";

/**
 * Global error boundary — must be fully self-contained (globals.css may not
 * be loaded when this renders), so it uses its own <html>/<body> and inline
 * styles matching the Meet palette light scheme.
 */
export default function GlobalError({
	 error,
	 reset,
}: {
	 error: Error & { digest?: string };
	 reset: () => void;
}) {
	 useEffect(() => {
	 console.error(error);
	 }, [error]);

	 return (
	 <html lang="en">
	 <body
	 style={{
	 margin: 0,
	 minHeight: "100vh",
	 background: "#f8f9fa",
	 color: "#1f1f1f",
	 fontFamily: "'Google Sans', system-ui, sans-serif",
	 display: "flex",
	 alignItems: "center",
	 justifyContent: "center",
	 padding: "16px",
	 }}
	 >
	 <div
	 style={{
	 textAlign: "center",
	 background: "#ffffff",
	 border: "1px solid #c4c7c5",
	 borderRadius: "32px",
	 padding: "48px",
	 maxWidth: "480px",
	 width: "100%",
	 }}
	 >
	 <div
	 style={{
	 width: "64px",
	 height: "64px",
	 borderRadius: "9999px",
	 background: "#f9dedc",
	 color: "#b3261e",
	 display: "flex",
	 alignItems: "center",
	 justifyContent: "center",
	 margin: "0 auto 32px",
	 fontSize: "32px",
	 fontWeight: 700,
	 }}
	 aria-hidden="true"
	 >
	 !
	 </div>
	 <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 12px" }}>
	 Something went wrong
	 </h1>
	 <p style={{ color: "#444746", fontSize: "14px", lineHeight: 1.6, margin: "0 0 40px" }}>
	 A critical error occurred. Please try again — if it persists, reload the app.
	 </p>
	 <button
	 onClick={reset}
	 style={{
	 height: "56px",
	 padding: "0 32px",
	 background: "#0b57d0",
	 color: "#ffffff",
	 fontWeight: 700,
	 fontSize: "14px",
	 border: "none",
	 borderRadius: "9999px",
	 cursor: "pointer",
	 }}
	 >
	 Try again
	 </button>
	 </div>
	 </body>
	 </html>
	 );
}
