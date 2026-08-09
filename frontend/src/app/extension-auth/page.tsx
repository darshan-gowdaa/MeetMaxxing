/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  RiCheckLine,
  RiChromeFill,
  RiLoader4Line,
  RiGoogleFill,
  RiFileCopyLine,
  RiErrorWarningLine,
} from "@remixicon/react";
import { supabase } from "@/lib/supabase";

type ConnectState = "connecting" | "connected" | "timeout";

export default function ExtensionAuthPage() {
  const { session, loading } = useAuth();
  const [connectState, setConnectState] = useState<ConnectState>("connecting");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;

    // Provision org_id for new users (no-op for existing)
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "https://meetmaxxing-api.onrender.com";
    fetch(`${backendUrl}/api/auth/provision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});

    // Auto-send token to auth-capture.js content script
    window.postMessage(
      {
        type: "MEETMAXXING_AUTH_TOKEN",
        token: session.access_token,
        refreshToken: session.refresh_token,
      },
      "*"
    );

    // Listen for confirmation from auth-capture.js
    const handleMessage = (e: MessageEvent) => {
      if (e.source === window && e.data?.type === "MEETMAXXING_AUTH_SUCCESS") {
        setConnectState("connected");
      }
    };
    window.addEventListener("message", handleMessage);

    // After 6s with no confirmation, show fallback (extension not installed or old version)
    const fallbackTimer = setTimeout(() => {
      setConnectState((prev) =>
        prev === "connecting" ? "timeout" : prev
      );
    }, 6000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, [session]);

  const handleCopy = () => {
    if (!session?.access_token) return;
    navigator.clipboard.writeText(session.access_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/extension-auth`,
      },
    });
  };

  // Shared background wrapper
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl max-w-md w-full text-center relative z-10">
        <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
        {children}
      </div>
    </div>
  );

  // Loading session
  if (loading) return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-white/50">
        <RiLoader4Line className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );

  // Not logged in — show sign-in options
  if (!session) return (
    <Wrapper>
      <p className="text-white/60 mb-8 text-sm">
        Sign in to connect the MeetMaxxing extension to your account.
      </p>
      <button
        onClick={handleGoogleSignIn}
        className="w-full h-12 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-colors mb-3"
      >
        <RiGoogleFill className="w-5 h-5 text-[#ea4335]" />
        Continue with Google
      </button>
      <a
        href="/login?next=/extension-auth"
        className="block w-full h-12 border border-white/10 text-white font-semibold rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-sm"
      >
        Sign in with Email
      </a>
    </Wrapper>
  );

  // Connected!
  if (connectState === "connected") return (
    <Wrapper>
      <div className="mt-2 space-y-4">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-[scale-in_0.3s_ease-out]">
          <RiCheckLine className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-green-400 font-semibold">Successfully connected!</p>
        <p className="text-white/50 text-sm">
          You can close this tab and go back to your meeting.
        </p>
      </div>
    </Wrapper>
  );

  // Timed out — extension not detected, show manual copy as fallback
  if (connectState === "timeout") return (
    <Wrapper>
      <div className="mt-2 space-y-4">
        <div className="flex items-center gap-2 justify-center text-yellow-400 text-sm">
          <RiErrorWarningLine className="w-4 h-4 shrink-0" />
          <span>Extension not detected. Make sure it's installed and enabled.</span>
        </div>
        <p className="text-white/50 text-xs">
          As a fallback, copy this token and paste it into the extension's token field.
        </p>
        {/* Token display — last-resort manual fallback only */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-left">
          <p className="text-white/30 font-mono text-[10px] break-all line-clamp-2">
            {session.access_token}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="w-full h-11 bg-[#4a9eff] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#3a8eef] transition-colors"
        >
          {copied ? <RiCheckLine className="w-5 h-5" /> : <RiFileCopyLine className="w-5 h-5" />}
          {copied ? "Copied!" : "Copy Token"}
        </button>
        <button
          onClick={() => {
            setConnectState("connecting");
            window.postMessage(
              { type: "MEETMAXXING_AUTH_TOKEN", token: session.access_token, refreshToken: session.refresh_token },
              "*"
            );
            setTimeout(() => setConnectState((p) => p === "connecting" ? "timeout" : p), 6000);
          }}
          className="text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          Retry auto-connect
        </button>
      </div>
    </Wrapper>
  );

  // Connecting (default) — spinner
  return (
    <Wrapper>
      <div className="mt-4 space-y-4">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <RiLoader4Line className="w-8 h-8 animate-spin text-[#4a9eff]" />
          <p className="text-sm text-white/60">Connecting to extension…</p>
        </div>
        <p className="text-white/30 text-xs">
          No action needed. This page closes automatically once connected.
        </p>
      </div>
    </Wrapper>
  );
}
