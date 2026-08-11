"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

import { supabase } from "@/lib/supabase";

export const ProfileSecurity = () => {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setPwdLoading(true);
    setMessage("");
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Password updated successfully.");
        setPassword("");
      }
    } catch {
      setMessage("An unexpected error occurred.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.access_token) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        await signOut();
      } else {
        alert("Failed to delete account");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-surface-container border border-border shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-bold text-text">Change Password</h3>
          <p className="text-[13px] text-text-muted font-medium">Update your account password. Must be at least 6 characters.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full sm:w-auto flex-1 px-4 py-3 rounded-xl bg-surface border border-outline-variant text-text focus:outline-none focus:border-primary transition-colors"
            required
            minLength={6}
          />
          <button 
            type="submit"
            disabled={pwdLoading || !password}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80"
          >
            {pwdLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
        {message && <p className="text-sm font-medium text-text-variant">{message}</p>}
      </div>

      <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-risk-container border border-risk/20 text-on-risk-container shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-bold text-risk">Danger Zone</h3>
          <p className="text-[13px] text-risk/80 font-medium">Permanently delete your account and all associated data. This action is irreversible.</p>
        </div>
        <div className="mt-2">
          <button 
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-6 py-3 bg-risk text-on-risk rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80"
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
};
