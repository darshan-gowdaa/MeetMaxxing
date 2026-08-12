"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { RiMailLine, RiLockPasswordLine, RiSparkling2Fill, RiUserLine } from "@remixicon/react";
import { PasswordStrength, isValidPassword } from "@/components/molecules/PasswordStrength";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [origin, setOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'signup' || urlMode === 'forgot') setMode(urlMode as Mode);
  }, []);

  let next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/' : '/';
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  const handleGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else router.push(next);
    } else if (mode === "signup") {
      if (name.trim().length < 2) {
        setError("Display name must be at least 2 characters.");
        setLoading(false);
        return;
      }
      if (!isValidPassword(password)) {
        setError("Please meet all password requirements.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ 
        email, password, options: { 
          data: { name: name.trim() },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` 
        }
      });
      if (error) setError(error.message);
      else if (data?.session) router.push(next);
      else setSuccess("Check your email for the confirmation link!");
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
      if (error) setError(error.message); else setSuccess("Password reset email sent!");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 w-full bg-bg flex flex-col md:flex-row text-text animate-fade-scale">
      {/* Hero Section */}
      <div className="md:w-1/2 hidden md:flex flex-col justify-center p-12 lg:p-24 bg-surface-container-low border-r border-border">
        <div className="flex items-center gap-3 mb-8">
          <RiSparkling2Fill className="w-10 h-10 text-primary" />
          <span className="font-black text-4xl text-text">MeetMaxxing</span>
        </div>
        <h1 className="text-5xl font-black mb-6 leading-tight">
          Supercharge your <br/><span className="text-primary">meetings.</span>
        </h1>
        <p className="text-xl text-text-muted max-w-md">
          Join MeetMaxxing to instantly summarize, transcribe, and remember everything from your calls.
        </p>
        <div className="mt-16 md3-loading-indicator md3-loading-indicator-lg"></div>
      </div>

      {/* Auth Section */}
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-12 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-md mx-auto bg-surface-container rounded-[32px] p-6 sm:p-8 md3-glow-primary border border-border">
          <div className="h-10 mb-8 flex items-center justify-center">
            <h2 className="text-3xl font-black text-center text-text">
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Reset password"}
            </h2>
          </div>

          <button onClick={handleGoogle} disabled={loading} className="w-full h-14 bg-surface-container-highest text-text font-bold rounded-full flex items-center justify-center gap-3 hover:bg-surface-highest transition-colors disabled:opacity-50 border border-border mb-8 spring">
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-8 text-center flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm font-bold text-text-muted">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col">
            <div className="flex flex-col gap-4">
              <div className="relative h-14 shrink-0">
                <RiMailLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-variant" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full h-full bg-surface border border-border rounded-[16px] pl-12 pr-4 text-text placeholder:text-text-variant focus:outline-none focus:border-primary focus:bg-surface-container-high transition-colors spring-sm" />
              </div>

              <div className={`relative overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${mode === 'signup' ? 'h-14 opacity-100' : 'h-0 opacity-0 -mt-4'}`}>
                <RiUserLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-variant" />
                <input type="text" required={mode === "signup"} value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full h-full bg-surface border border-border rounded-[16px] pl-12 pr-4 text-text placeholder:text-text-variant focus:outline-none focus:border-primary focus:bg-surface-container-high transition-colors spring-sm" />
              </div>

              <div className={`relative overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${mode !== 'forgot' ? 'h-14 opacity-100' : 'h-0 opacity-0 -mt-4'}`}>
                <RiLockPasswordLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-variant" />
                <input type="password" required={mode !== "forgot"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full h-full bg-surface border border-border rounded-[16px] pl-12 pr-4 text-text placeholder:text-text-variant focus:outline-none focus:border-primary focus:bg-surface-container-high transition-colors spring-sm" />
              </div>
              <PasswordStrength password={password} visible={mode === 'signup' && password.length > 0} />
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out w-full flex items-center justify-center shrink-0 ${error || success ? 'h-14 mt-4 opacity-100' : 'h-0 mt-0 opacity-0'}`}>
              {error && <div className="w-full h-full flex items-center justify-center text-on-risk bg-risk-container text-sm text-center px-4 rounded-[16px] font-medium">{error}</div>}
              {success && <div className="w-full h-full flex items-center justify-center text-on-success-container bg-success-container text-sm text-center px-4 rounded-[16px] font-medium">{success}</div>}
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 shrink-0 bg-primary text-on-primary font-bold rounded-full hover:bg-primary-container hover:text-on-primary-container active:opacity-80 transition-colors disabled:opacity-50 mt-6 spring">
              {loading ? "Please wait..." : (mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link")}
            </button>
          </form>

          <div className="mt-8 h-10 flex flex-col items-center justify-center gap-2 text-sm font-bold">
            {mode === "signin" ? (
              <>
                <button onClick={(e) => { e.preventDefault(); setError(""); setSuccess(""); setMode("forgot"); }} className="text-text-variant hover:text-primary transition-colors h-5 flex items-center">Forgot password?</button>
                <button onClick={(e) => { e.preventDefault(); setError(""); setSuccess(""); setMode("signup"); }} className="text-primary hover:text-primary-container transition-colors h-5 flex items-center">Don&apos;t have an account? Sign up</button>
              </>
            ) : (
              <button onClick={(e) => { e.preventDefault(); setError(""); setSuccess(""); setMode("signin"); }} className="text-primary hover:text-primary-container transition-colors h-5 flex items-center">Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
