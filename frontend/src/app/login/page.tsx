/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { RiGoogleFill, RiMailLine, RiLockPasswordLine, RiSparkling2Fill } from "@remixicon/react";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`
        }
      });
      if (error) setError(error.message);
      else setSuccess("Check your email for the confirmation link!");
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSuccess("Password reset email sent!");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8eaaff]/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="text-[#4a9eff] drop-shadow-[0_0_12px_rgba(74,158,255,0.6)]">
              <RiSparkling2Fill className="w-8 h-8" />
            </span>
            <span className="font-black text-3xl tracking-tight bg-gradient-to-r from-white via-[#a8c8ff] to-[#4a9eff] bg-clip-text text-transparent">
              MeetMaxxing
            </span>
          </div>
          <p className="text-white/50 mt-3 text-sm font-medium">Your AI Meeting Copilot</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                {mode === "signin" && "Welcome back"}
                {mode === "signup" && "Create an account"}
                {mode === "forgot" && "Reset password"}
              </h2>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-12 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <RiGoogleFill className="w-5 h-5 text-[#ea4335]" />
                Continue with Google
              </button>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.1]" />
                </div>
                <span className="relative bg-[#1a1c20] px-4 text-sm text-white/40">or</span>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <RiMailLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-12 bg-white/[0.04] border border-white/[0.1] rounded-xl pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4a9eff]/50 focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1">
                    <div className="relative">
                      <RiLockPasswordLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full h-12 bg-white/[0.04] border border-white/[0.1] rounded-xl pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4a9eff]/50 focus:bg-white/[0.06] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}
                {success && <div className="text-green-400 text-sm text-center bg-green-400/10 py-2 rounded-lg">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[#4a9eff] to-[#3a7bd5] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                >
                  {loading ? "Please wait..." : (
                    mode === "signin" ? "Sign in" :
                    mode === "signup" ? "Sign up" :
                    "Send reset link"
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2 text-sm">
                {mode === "signin" ? (
                  <>
                    <button onClick={() => setMode("forgot")} className="text-white/50 hover:text-white transition-colors">
                      Forgot password?
                    </button>
                    <button onClick={() => setMode("signup")} className="text-[#4a9eff] hover:text-[#4a9eff]/80 transition-colors">
                      Don't have an account? Sign up
                    </button>
                  </>
                ) : (
                  <button onClick={() => setMode("signin")} className="text-[#4a9eff] hover:text-[#4a9eff]/80 transition-colors">
                    Back to sign in
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

