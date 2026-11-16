"use client";

import * as React from "react";

/**
 * Root Global Error Boundary.
 * Self-contained HTML with responsive light & dark Material 3 styling.
 * Handles critical application-level exceptions where the root layout failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Root Global Error]:", error);
  }, [error]);

  const handleHardReload = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <html lang="en">
      <head>
        <title>Application Error · MeetMaxxing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          :root {
            --bg: #f8f9fa;
            --surface: #ffffff;
            --surface-container: #ebebeb;
            --surface-highest: #d6d6d6;
            --text: #1f1f1f;
            --text-muted: #444746;
            --primary: #0b57d0;
            --on-primary: #ffffff;
            --risk: #b3261e;
            --risk-container: #f9dedc;
            --border: #c4c7c5;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #141518;
              --surface: #1d1f24;
              --surface-container: #27292e;
              --surface-highest: #3b3d46;
              --text: #e2e2e6;
              --text-muted: #c4c7c5;
              --primary: #a8c7fa;
              --on-primary: #041e49;
              --risk: #f2b8b5;
              --risk-container: #601410;
              --border: #444746;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            background-color: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          .m3-card {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 32px;
            padding: 40px 32px;
            max-width: 520px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          }
          .m3-icon-badge {
            width: 72px;
            height: 72px;
            border-radius: 24px;
            background-color: var(--risk-container);
            color: var(--risk);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: 900;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 12px;
            letter-spacing: -0.02em;
          }
          p {
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.6;
            margin: 0 0 28px;
          }
          .m3-btn-row {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 28px;
          }
          .m3-btn {
            height: 48px;
            padding: 0 28px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s, transform 0.15s;
          }
          .m3-btn:active { transform: scale(0.98); }
          .m3-btn-primary {
            background-color: var(--primary);
            color: var(--on-primary);
          }
          .m3-btn-tonal {
            background-color: var(--surface-container);
            color: var(--text);
            border: 1px solid var(--border);
          }
          .m3-code {
            font-family: monospace;
            font-size: 11px;
            background-color: var(--surface-container);
            border-radius: 12px;
            padding: 12px;
            text-align: left;
            word-break: break-all;
            color: var(--text-muted);
          }
        `}</style>
      </head>
      <body>
        <div className="m3-card">
          <div className="m3-icon-badge" aria-hidden="true">
            ⚠
          </div>
          <h1>System Exception</h1>
          <p>
            A critical error halted MeetMaxxing&apos;s root shell. Your data is preserved on the server — please try recovering or restarting the workspace.
          </p>

          <div className="m3-btn-row">
            <button
              type="button"
              onClick={() => reset()}
              className="m3-btn m3-btn-primary"
            >
              Recover Session
            </button>
            <button
              type="button"
              onClick={handleHardReload}
              className="m3-btn m3-btn-tonal"
            >
              Restart App
            </button>
          </div>

          <div className="m3-code">
            <strong>Error:</strong> {error.name || "Error"}: {error.message || "Root layout initialization failure"}
            {error.digest && <div><strong>Digest:</strong> {error.digest}</div>}
          </div>
        </div>
      </body>
    </html>
  );
}
