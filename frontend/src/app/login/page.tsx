/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RiMailLine, RiLockPasswordLine } from "@remixicon/react";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [origin, setOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'signup' || urlMode === 'forgot') {
      setMode(urlMode as Mode);
    }
  }, []);

  let next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/' : '/';
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
      else router.push(next);
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      });
      if (error) setError(error.message);
      else if (data?.session) router.push(next);
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-[32px] p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 mb-8 text-center">
                {mode === "signin" && "Welcome back"}
                {mode === "signup" && "Create an account"}
                {mode === "forgot" && "Reset password"}
              </h2>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-14 bg-zinc-800 text-white font-semibold rounded-full flex items-center justify-center gap-3 hover:bg-zinc-700 hover:-translate-y-1 hover:shadow-xl active:scale-[0.97] transition-all duration-300 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <span className="relative bg-[#18181b] px-4 text-xs font-bold uppercase tracking-wider text-zinc-500">or</span>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <RiMailLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-14 bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1">
                    <div className="relative">
                      <RiLockPasswordLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full h-14 bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-2xl border border-red-400/20">{error}</div>}
                {success && <div className="text-green-400 text-sm text-center bg-green-400/10 py-3 rounded-2xl border border-green-400/20">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold rounded-full hover:bg-indigo-500/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.97] transition-all duration-300 disabled:opacity-50 mt-4"
                >
                  {loading ? "Please wait..." : (
                    mode === "signin" ? "Sign in" :
                    mode === "signup" ? "Sign up" :
                    "Send reset link"
                  )}
                </button>
              </form>

              <div className="mt-8 flex flex-col items-center gap-3 text-sm font-medium">
                {mode === "signin" ? (
                  <>
                    <button onClick={() => setMode("forgot")} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      Forgot password?
                    </button>
                    <button onClick={() => setMode("signup")} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                      Don't have an account? Sign up
                    </button>
                  </>
                ) : (
                  <button onClick={() => setMode("signin")} className="text-indigo-400 hover:text-indigo-300 transition-colors">
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

