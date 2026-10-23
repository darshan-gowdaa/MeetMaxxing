"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  RiEyeLine,
  RiEyeOffLine,
  RiDownloadLine,
  RiLockPasswordLine,
  RiAlertLine,
} from "@remixicon/react";

import { PasswordStrength, isValidPassword } from "@/components/molecules/PasswordStrength";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { DeleteDialog } from "@/components/organisms/DeleteDialog";

export const ProfileSecurity = () => {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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

  const handleExportData = async () => {
    if (!session?.access_token) return;
    setExportLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

    try {
      const res = await fetch(`${backendUrl}/api/settings/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meetmaxxing-data-export.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage("Data export downloaded successfully", { variant: "success" });
    } catch (e) {
      console.error(e);
      showMessage("Failed to export account data", { variant: "error" });
    } finally {
      setExportLoading(false);
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
      {/* Card 1: Security & Authentication */}
      <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <RiLockPasswordLine className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base sm:text-lg font-bold text-text">Security & Authentication</h3>
            <p className="text-xs sm:text-sm text-text-muted font-medium">
              Manage your credentials and sign-in credentials.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
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
                className="w-full bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 pr-12 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text spring-colors cursor-pointer"
              >
                {showPassword ? <RiEyeOffLine className="w-4 h-4" aria-hidden="true" /> : <RiEyeLine className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={pwdLoading || !password}
              className="w-full sm:w-auto rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-primary text-on-primary hover:brightness-110 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {pwdLoading && <Md3LoadingIndicator size="sm" className="text-on-primary" />}
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
          <PasswordStrength password={password} visible={password.length > 0} />
          {message && <p className="text-sm font-medium text-text-variant">{message}</p>}
        </div>
      </div>

      {/* Card 2: Data Privacy & Portability */}
      <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <RiDownloadLine className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base sm:text-lg font-bold text-text">Data Privacy & Portability</h3>
            <p className="text-xs sm:text-sm text-text-muted font-medium">
              Request an archive of your profile, meeting transcripts, intelligence summaries, and action items in standard JSON format.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exportLoading}
            className="w-full sm:w-auto rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-all bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-text disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {exportLoading ? (
              <Md3LoadingIndicator size="sm" className="text-text" />
            ) : (
              <RiDownloadLine className="w-4 h-4 text-primary" />
            )}
            {exportLoading ? "Preparing Export…" : "Export All Data (GDPR)"}
          </button>
        </div>
      </div>

      {/* Card 3: Danger Zone */}
      <div className="bg-risk-container/20 border border-risk/30 rounded-[28px] p-6 sm:p-8 text-on-risk-container flex flex-col gap-6 shadow-none">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-risk/10 text-risk flex items-center justify-center shrink-0 mt-0.5">
            <RiAlertLine className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base sm:text-lg font-bold text-risk">Danger Zone</h3>
            <p className="text-xs sm:text-sm text-risk/80 font-medium">
              Permanently delete your account, saved meeting recordings, and all processed notes. This action cannot be undone.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            disabled={loading}
            className="w-full sm:w-auto rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-all bg-risk text-on-risk hover:brightness-110 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
