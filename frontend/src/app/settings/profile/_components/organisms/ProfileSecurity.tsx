"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";

import { PasswordStrength, isValidPassword } from "@/components/molecules/PasswordStrength";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { DeleteDialog } from "@/components/organisms/DeleteDialog";

export const ProfileSecurity = () => {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { showMessage } = useSnackbar();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setMessage("Please meet all password requirements.");
      return;
    }
    setPwdLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Password updated successfully.");
        setPassword("");
        showMessage("Password updated", { variant: "success" });
      }
    } catch {
      setMessage("An unexpected error occurred.");
    } finally {
      setPwdLoading(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!session?.access_token) return;

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
        showMessage("Failed to delete account", { variant: "error" });
      }
    } catch (e) {
      console.error(e);
      showMessage("Error deleting account", { variant: "error" });
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 p-5 md:p-6 rounded-[24px] bg-surface-container border border-border shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-bold text-text">Change Password</h3>
          <p className="text-[13px] text-text-muted font-medium">Update your account password securely.</p>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <form onSubmit={handleUpdatePassword} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative w-full sm:w-auto flex-1">
              <label htmlFor="new-password" className="sr-only">New password</label>
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-surface border border-outline-variant text-text focus:outline-none focus:border-primary text-[16px] sm:text-sm transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text spring-colors"
              >
                {showPassword ? <RiEyeOffLine className="w-4 h-4" aria-hidden="true" /> : <RiEyeLine className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={pwdLoading || !password}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded-full text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80 flex items-center justify-center gap-2"
            >
              {pwdLoading && <Md3LoadingIndicator size="sm" className="text-on-primary" />}
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
          <PasswordStrength password={password} visible={password.length > 0} />
        </div>
        {message && <p className="text-sm font-medium text-text-variant">{message}</p>}
      </div>

      <div className="flex flex-col gap-4 p-5 md:p-6 rounded-[24px] bg-risk-container border border-risk/20 text-on-risk-container shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-bold text-risk">Danger Zone</h3>
          <p className="text-[13px] text-risk/80 font-medium">Permanently delete your account and all associated data. This action is irreversible.</p>
        </div>
        <div className="mt-2">
          <button
            onClick={() => setIsDeleteOpen(true)}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-risk text-on-risk rounded-full text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80 flex items-center justify-center gap-2"
          >
            {loading && <Md3LoadingIndicator size="sm" className="text-on-risk" />}
            {loading ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>

      {isDeleteOpen && (
        <DeleteDialog
          title="Your Account"
          itemName="Account"
          busy={loading}
          onConfirm={confirmDeleteAccount}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </div>
  );
};
