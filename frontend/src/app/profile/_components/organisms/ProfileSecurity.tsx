"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export const ProfileSecurity = () => {
  const { session, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      alert(error.message);
    } else {
      setPassword("");
      alert("Password updated successfully.");
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
    <div className="flex flex-col gap-6 p-6 rounded-3xl bg-surface-variant text-on-surface-variant shadow-sm">
      <h2 className="text-xl font-bold">Security</h2>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium opacity-80">New Password</label>
        <div className="flex gap-2">
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-surface text-on-surface px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter new password"
          />
          <button 
            onClick={handleUpdatePassword} 
            disabled={loading || !password}
            className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Update
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-outline/20">
        <h3 className="text-lg font-bold text-error mb-2">Danger Zone</h3>
        <p className="text-sm opacity-80 mb-4">Permanently delete your account and all associated data.</p>
        <button 
          onClick={handleDeleteAccount}
          disabled={loading}
          className="px-6 py-2 bg-error text-on-error rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};
