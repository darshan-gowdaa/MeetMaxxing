"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { RiRefreshLine, RiBuildingLine, RiUserLine } from "@remixicon/react";

export const ProfileHero = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [orgName, setOrgName] = useState(
    user?.user_metadata?.org_name || user?.user_metadata?.organization || ""
  );
  const { showMessage } = useSnackbar();

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        name,
        org_name: orgName,
        organization: orgName
      }
    });
    setLoading(false);
    if (!error) {
      showMessage("Profile updated successfully", { variant: "success" });
    } else {
      showMessage("Failed to update profile", { variant: "error" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];

    if (file.size > MAX_SIZE) {
      showMessage("Image must be smaller than 5MB", { variant: "error" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTS.includes(fileExt)) {
      showMessage("Please upload a valid image (JPG, PNG, WebP)", { variant: "error" });
      return;
    }

    setLoading(true);

    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      showMessage("Failed to upload avatar", { variant: "error" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    setLoading(false);
    if (!updateError) {
      showMessage("Avatar updated", { variant: "success" });
    } else {
      showMessage("Failed to update avatar", { variant: "error" });
    }
  };

  const handleResetAvatar = async () => {
    if (!user) return;
    setLoading(true);
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || user.id || "fallback")}`;
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: fallbackUrl } });
    setLoading(false);
    if (!error) {
      showMessage("Avatar reset to default fallback", { variant: "success" });
    } else {
      showMessage("Failed to reset avatar", { variant: "error" });
    }
  };

  const avatarUrl = user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

  return (
    <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-start p-5 md:p-6 rounded-[24px] bg-surface border border-border shadow-sm mb-2">
      {/* Avatar column */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-surface shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          <label className="absolute inset-0 bg-surface-container-high text-on-primary-container flex items-center justify-center opacity-0 focus-within:opacity-100 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
            Upload
            <input type="file" accept="image/*" className="sr-only" aria-label="Upload avatar" onChange={handleAvatarUpload} disabled={loading} />
          </label>
        </div>
        <button
          type="button"
          onClick={handleResetAvatar}
          disabled={loading}
          className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
        >
          <RiRefreshLine className="w-3.5 h-3.5" />
          Reset Avatar
        </button>
      </div>

      {/* Profile Form Details */}
      <div className="flex-1 flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-[13px] font-bold text-text flex items-center gap-1.5">
              <RiUserLine className="w-4 h-4 text-primary" /> Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              placeholder="Your Name"
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface2 text-text px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary text-[15px] sm:text-sm transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-name" className="text-[13px] font-bold text-text flex items-center gap-1.5">
              <RiBuildingLine className="w-4 h-4 text-primary" /> Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              placeholder="Company or Team name"
              autoComplete="organization"
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-surface2 text-text px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary text-[15px] sm:text-sm transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[13px] text-text-muted font-mono">{user?.email}</p>
          <button
            type="button"
            onClick={handleUpdateProfile}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-on-primary rounded-full text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80 flex items-center justify-center cursor-pointer shadow-sm"
          >
            {loading ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
