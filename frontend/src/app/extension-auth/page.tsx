/* eslint-disable */
"use client";

import { useEffect, useState } from"react";
import { useAuth } from"@/lib/auth-context";
import {
 RiCheckLine,
 RiChromeFill,
 RiGoogleFill,
 RiFileCopyLine,
 RiErrorWarningLine,
} from"@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { supabase } from"@/lib/supabase";

import Link from"next/link";

type ConnectState ="connecting"|"connected"|"timeout";

// Shared background wrapper
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)" }}/>
    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)" }}/>
    <div className="bg-surface-container border border-border rounded-[32px] p-8 md:p-12 shadow-xl hover:shadow-primary/5 transition-all duration-300 max-w-md w-full text-center relative z-10">
      <div className="w-20 h-20 bg-primary-container text-primary rounded-[24px] flex items-center justify-center mx-auto mb-8">
        <RiChromeFill className="w-10 h-10"/>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight mb-3">Connect Extension</h1>
      {children}
    </div>
  </div>
);

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
 method:"POST",
 headers: { Authorization: `Bearer ${session.access_token}` },
 })
 .then((res) => {
 if (!res.ok) console.error("[Auth] Backend provision returned status:", res.status);
 })
 .catch((err) => console.error("[Auth] Failed to hit backend provision endpoint:", err));

 // Auto-send token to auth-capture.js content script
 window.postMessage(
 {
 type:"MEETMAXXING_AUTH_TOKEN",
 token: session.access_token,
 refreshToken: session.refresh_token,
 },
 window.location.origin
 );

 // Listen for confirmation from auth-capture.js
 const handleMessage = (e: MessageEvent) => {
 if (e.source === window && e.data?.type ==="MEETMAXXING_AUTH_SUCCESS") {
 setConnectState("connected");
 }
 };
 window.addEventListener("message", handleMessage);

 // After 6s with no confirmation, show fallback (extension not installed or old version)
 const fallbackTimer = setTimeout(() => {
 setConnectState((prev) =>
 prev ==="connecting"?"timeout": prev
 );
 }, 6000);

 return () => {
 window.removeEventListener("message", handleMessage);
 clearTimeout(fallbackTimer);
 };
 }, [session?.access_token, session?.refresh_token]);

 const handleCopy = () => {
 if (!session?.access_token) return;
 navigator.clipboard.writeText(session.access_token);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleGoogleSignIn = async () => {
 await supabase.auth.signInWithOAuth({
 provider:"google",
 options: {
 redirectTo: `${window.location.origin}/auth/callback?next=/extension-auth`,
 },
 });
 };

  // Loading session
  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <Md3LoadingIndicator size="md" />
        <span className="text-sm font-bold tracking-widest uppercase">Loading</span>
      </div>
    </div>
  );

  // Not logged in — show sign-in options
  if (!session) return (
    <Wrapper>
      <p className="text-text-muted mb-8 text-sm md:text-base font-medium">
        Sign in to connect the MeetMaxxing extension to your account.
      </p>
      <button
        onClick={handleGoogleSignIn}
        className="w-full h-12 md:h-14 bg-surface2 text-text font-bold rounded-full border border-border flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all mb-4"
      >
        <RiGoogleFill className="w-5 h-5 md:w-6 md:h-6 text-[#ea4335]"/>
        Continue with Google
      </button>
      <Link
        href="/login?next=/extension-auth"
        className="flex w-full h-12 md:h-14 border border-border bg-surface-container-high text-text font-bold rounded-full items-center justify-center hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all text-sm md:text-base"
      >
        Sign in with Email
      </Link>
    </Wrapper>
  );

  // Connected!
  if (connectState === "connected") return (
    <Wrapper>
      <div className="mt-4 space-y-4">
        <div className="w-16 h-16 bg-success-container rounded-[20px] flex items-center justify-center mx-auto animate-fade-scale">
          <RiCheckLine className="w-8 h-8 text-on-success-container"/>
        </div>
        <p className="text-success font-extrabold text-lg">Successfully connected!</p>
        <p className="text-text-muted text-sm md:text-base font-medium">
          You can close this tab and go back to your meeting.
        </p>
      </div>
    </Wrapper>
  );

  // Timed out — extension not detected, show manual copy as fallback
  if (connectState === "timeout") return (
    <Wrapper>
      <div className="mt-4 space-y-5">
        <div className="flex items-center gap-2 justify-center text-warning font-bold text-sm md:text-base">
          <RiErrorWarningLine className="w-5 h-5 shrink-0"/>
          <span>Extension not detected. Make sure it's installed and enabled.</span>
        </div>
        <p className="text-text-muted text-xs md:text-sm font-medium">
          As a fallback, copy this token and paste it into the extension's token field.
        </p>
        {/* Token display — last-resort manual fallback only */}
        <div className="bg-surface2 border border-border rounded-2xl p-4 text-left">
          <p className="text-text-muted font-mono text-xs break-all line-clamp-2">
            {session.access_token}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="w-full h-12 md:h-14 bg-primary text-on-primary font-bold rounded-full flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all"
        >
          {copied ? <RiCheckLine className="w-5 h-5"/> : <RiFileCopyLine className="w-5 h-5"/>}
          {copied ? "Copied!" : "Copy Token"}
        </button>
        <button
          onClick={() => {
            setConnectState("connecting");
            window.postMessage(
              { type: "MEETMAXXING_AUTH_TOKEN", token: session.access_token, refreshToken: session.refresh_token },
              window.location.origin
            );
            setTimeout(() => setConnectState((p) => p === "connecting" ? "timeout" : p), 6000);
          }}
          className="text-text-variant text-xs md:text-sm font-bold hover:text-text transition-colors active:scale-[0.97]"
        >
          Retry auto-connect
        </button>
      </div>
    </Wrapper>
  );

  // Connecting (default) — spinner
  return (
    <Wrapper>
      <div className="mt-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-text-muted">
          <Md3LoadingIndicator size="md" />
          <p className="text-sm md:text-base font-bold text-text-muted">Connecting to extension…</p>
        </div>
        <p className="text-text-variant text-xs font-medium max-w-xs mx-auto">
          No action needed. This page closes automatically once connected.
        </p>
      </div>
    </Wrapper>
  );
}
