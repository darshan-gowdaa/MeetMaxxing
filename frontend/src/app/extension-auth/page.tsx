/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { RiFileCopyLine, RiCheckLine, RiChromeFill, RiLoader4Line, RiSparkling2Fill, RiGoogleFill } from "@remixicon/react";
import { supabase } from "@/lib/supabase";

export default function ExtensionAuthPage() {
  const { session, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  // Send token to extension + provision org_id for new accounts
  useEffect(() => {
    if (!session?.access_token) return;

    // Provision org_id for new users (no-op for existing users)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";
    fetch(`${backendUrl}/api/auth/provision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {}); // non-blocking, best-effort

    window.postMessage({
      type: "MEETMAXXING_AUTH_TOKEN",
      token: session.access_token,
      refreshToken: session.refresh_token,
    }, "*");

    const handleMessage = (e: MessageEvent) => {
      if (e.source === window && e.data?.type === "MEETMAXXING_AUTH_SUCCESS") {
        setConnected(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [session]);

  const handleCopy = () => {
    if (session?.access_token) {
      navigator.clipboard.writeText(session.access_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/extension-auth`,
      },
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-white/50">
        <RiLoader4Line className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );

  // Not logged in - show sign in options
  if (!session) return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl max-w-md w-full text-center relative z-10">
        <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
        <p className="text-white/60 mb-8 text-sm">Sign in to connect the MeetMaxxing extension to your account.</p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full h-12 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-colors mb-3"
        >
          <RiGoogleFill className="w-5 h-5 text-[#ea4335]" />
          Continue with Google
        </button>
        <a href="/login?next=/extension-auth" className="block w-full h-12 border border-white/10 text-white font-semibold rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-sm">
          Sign in with Email
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl max-w-md w-full text-center relative z-10">
        <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
        {connected ? (
          <div className="space-y-4 mt-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <RiCheckLine className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-green-400 font-medium">Successfully connected!</div>
            <p className="text-white/60 text-sm">You can now close this tab and return to your meeting.</p>
          </div>
        ) : (
          <>
            <p className="text-white/60 mb-6 text-sm">
              Connecting automatically... If it doesn't connect, copy your token manually.
            </p>
            <div className="space-y-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-hidden relative group">
                <p className="text-white/40 font-mono text-xs break-all text-left line-clamp-3">
                  {session.access_token}
                </p>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="bg-[#4a9eff] text-white text-sm font-semibold py-1.5 px-4 rounded-full flex items-center gap-2"
                  >
                    {copied ? <RiCheckLine className="w-4 h-4" /> : <RiFileCopyLine className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy Token"}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="w-full h-12 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
              >
                {copied ? <RiCheckLine className="w-5 h-5" /> : <RiFileCopyLine className="w-5 h-5" />}
                {copied ? "Copied to clipboard" : "Copy Token"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
