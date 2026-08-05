/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { RiFileCopyLine, RiCheckLine, RiChromeFill } from "@remixicon/react";

export default function ExtensionAuthPage() {
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (session?.access_token) {
      navigator.clipboard.writeText(session.access_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4">
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
        <p className="text-white/60 mb-8 text-sm">
          Copy this authentication token and paste it into the MeetMaxxing Chrome extension.
        </p>

        {session ? (
          <div className="space-y-4">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-hidden relative group">
              <p className="text-white/40 font-mono text-xs break-all text-left">
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
        ) : (
          <div className="text-white/50">Loading session...</div>
        )}
      </div>
    </div>
  );
}

