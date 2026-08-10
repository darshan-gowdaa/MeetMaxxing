"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export const ProfileSecurity = () => {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

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
  );
};
