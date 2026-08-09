/* eslint-disable */
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { RiLockPasswordLine, RiSparkling2Fill, RiCheckLine } from "@remixicon/react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <RiCheckLine className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Password updated!</h2>
        <p className="text-white/60">You can now sign in with your new password.</p>
        <a href="/login" className="block w-full h-12 bg-gradient-to-r from-[#4a9eff] to-[#3a7bd5] text-white font-semibold rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity">Go to Sign In</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="text-[#4a9eff] drop-shadow-[0_0_12px_rgba(74,158,255,0.6)]"><RiSparkling2Fill className="w-8 h-8" /></span>
            <span className="font-black text-3xl tracking-tight bg-gradient-to-r from-white via-[#a8c8ff] to-[#4a9eff] bg-clip-text text-transparent">MeetMaxxing</span>
          </div>
          <p className="text-white/50 mt-3 text-sm">Set a new password</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Reset Password</h2>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <RiLockPasswordLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-full h-12 bg-white/[0.04] border border-white/[0.1] rounded-xl pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4a9eff]/50 transition-colors" />
            </div>
            <div className="relative">
              <RiLockPasswordLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full h-12 bg-white/[0.04] border border-white/[0.1] rounded-xl pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4a9eff]/50 transition-colors" />
            </div>
            {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-[#4a9eff] to-[#3a7bd5] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-2">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <a href="/login" className="text-[#4a9eff] text-sm hover:opacity-80 transition-opacity">Back to sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
