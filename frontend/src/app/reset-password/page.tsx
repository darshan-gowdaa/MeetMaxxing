"use client";
import { useState } from"react";
import { supabase } from"@/lib/supabase";
import { RiLockPasswordLine, RiSparkling2Fill, RiCheckLine } from"@remixicon/react";
import Link from"next/link";

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
 setLoading(true); setError("");
 const { error } = await supabase.auth.updateUser({ password });
 if (error) setError(error.message); else setSuccess(true);
 setLoading(false);
 };

 if (success) return (
 <div className="min-h-screen bg-bg flex items-center justify-center p-4">
 <div className="bg-surface-container rounded-[32px] p-8 max-w-sm w-full text-center border border-border md3-glow-primary">
 <div className="w-16 h-16 bg-success-container rounded-full flex items-center justify-center mx-auto mb-6">
 <RiCheckLine className="w-8 h-8 text-on-success-container"/>
 </div>
 <h2 className="text-2xl font-black text-text mb-2">Password updated!</h2>
 <p className="text-text-muted mb-8">You can now sign in with your new password.</p>
 <Link href="/login"className="block w-full h-14 bg-primary text-on-primary font-bold rounded-full flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors spring">
 Go to Sign In
 </Link>
 </div>
 </div>
 );

 return (
 <div className="min-h-screen bg-bg flex items-center justify-center p-4 animate-fade-scale">
 <div className="w-full max-w-md relative z-10">
 <div className="text-center mb-8 flex flex-col items-center">
 <RiSparkling2Fill className="w-10 h-10 text-primary mb-2"/>
 <h1 className="font-black text-3xl tracking-tight text-text">MeetMaxxing</h1>
 </div>
 
 <div className="bg-surface-container rounded-[32px] p-8 md3-glow-primary border border-border">
 <h2 className="text-2xl font-black text-text mb-2 text-center">Reset Password</h2>
 <p className="text-text-muted mb-8 text-center text-sm font-medium">Set a new password for your account</p>
 
 <form onSubmit={handleReset} className="space-y-4">
 <div className="relative">
 <RiLockPasswordLine className="absolute left-4 top-1/2 /2 w-5 h-5 text-text-variant"/>
 <input type="password"required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password"className="w-full h-14 bg-surface border border-border rounded-[16px] pl-12 pr-4 text-text placeholder:text-text-variant focus:outline-none focus:border-primary focus:bg-surface-container-high transition-colors spring-sm"/>
 </div>
 <div className="relative">
 <RiLockPasswordLine className="absolute left-4 top-1/2 /2 w-5 h-5 text-text-variant"/>
 <input type="password"required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password"className="w-full h-14 bg-surface border border-border rounded-[16px] pl-12 pr-4 text-text placeholder:text-text-variant focus:outline-none focus:border-primary focus:bg-surface-container-high transition-colors spring-sm"/>
 </div>
 
 {error && <div className="text-on-risk bg-risk-container text-sm text-center py-3 rounded-[16px] font-medium">{error}</div>}
 
 <button type="submit"disabled={loading} className="w-full h-14 bg-primary text-on-primary font-bold rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50 mt-4 spring">
 {loading ?"Updating...":"Update Password"}
 </button>
 </form>
 
 <div className="mt-8 text-center">
 <Link href="/login"className="text-primary hover:text-primary-container text-sm font-bold transition-colors">
 Back to sign in
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}
