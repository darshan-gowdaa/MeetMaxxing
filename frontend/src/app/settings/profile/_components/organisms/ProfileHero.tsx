"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import {
  RiRefreshLine,
  RiBuildingLine,
  RiUserLine,
  RiUpload2Line,
  RiGoogleFill,
  RiSparklingLine,
  RiCameraLine,
} from "@remixicon/react";

export const ProfileHero = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string>(user?.user_metadata?.name || "");
  const [orgName, setOrgName] = useState<string>(
    user?.user_metadata?.org_name || user?.user_metadata?.organization || ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.user_metadata?.avatar_url || ""
  );
  const { showMessage } = useSnackbar();

  // Helper to obtain a valid access token for backend calls
  const getAccessToken = useCallback(async () => {
    if (session?.access_token) return session.access_token;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, [session?.access_token]);

  // Sync profile/avatar data with backend database
  const syncWithBackend = async (payload: {
    avatar_url?: string;
    name?: string;
    org_name?: string;
  }) => {
    const token = await getAccessToken();
    if (!token) return;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

    try {
      await fetch(`${backendUrl}/api/settings/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[ProfileHero] Backend sync error:", err);
    }
  };

  // Google avatar detection
  const googleAvatar: string | undefined | null =
    user?.identities?.find((i) => i.provider === "google")?.identity_data?.avatar_url ||
    user?.identities?.find((i) => i.provider === "google")?.identity_data?.picture ||
    (user?.app_metadata?.provider === "google" ? user?.user_metadata?.avatar_url : null) ||
    user?.user_metadata?.picture;

  // Hydrate from user metadata whenever user auth changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
    if (user?.user_metadata?.name) {
      setName((prev: string) => prev || (user.user_metadata.name as string));
    }
    const metaOrg =
      user?.user_metadata?.org_name || user?.user_metadata?.organization;
    if (metaOrg) {
      setOrgName((prev: string) => prev || (metaOrg as string));
    }
  }, [user]);

  // Hydrate initial name, orgName, and avatar_url from GET /api/settings/ on mount if user auth metadata is empty
  useEffect(() => {
    let isMounted = true;

    const hydrateFromBackend = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

      try {
        const res = await fetch(`${backendUrl}/api/settings/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !isMounted) return;

        if (!user?.user_metadata?.name && data.name) {
          setName((prev: string) => prev || String(data.name));
        }
        if (
          !user?.user_metadata?.org_name &&
          !user?.user_metadata?.organization &&
          data.org_name
        ) {
          setOrgName((prev: string) => prev || String(data.org_name));
        }
        if (!user?.user_metadata?.avatar_url && data.avatar_url) {
          setAvatarUrl((prev: string) => prev || String(data.avatar_url));
        }
      } catch (err) {
        console.error("[ProfileHero] Failed to hydrate profile settings:", err);
      }
    };

    hydrateFromBackend();

    return () => {
      isMounted = false;
    };
  }, [user, getAccessToken]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        name,
        org_name: orgName,
        organization: orgName,
      },
    });

    if (!error) {
      await syncWithBackend({ name, org_name: orgName });
      setLoading(false);
      showMessage("Profile updated successfully", { variant: "success" });
    } else {
      setLoading(false);
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

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    if (!updateError) {
      setAvatarUrl(publicUrl);
      await syncWithBackend({ avatar_url: publicUrl });
      setLoading(false);
      showMessage("Avatar updated", { variant: "success" });
    } else {
      setLoading(false);
      showMessage("Failed to update avatar", { variant: "error" });
    }
  };

  const handleResetToGoogle = async () => {
    if (!user || !googleAvatar) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: googleAvatar },
    });
    if (!error) {
      setAvatarUrl(googleAvatar);
      await syncWithBackend({ avatar_url: googleAvatar });
      setLoading(false);
      showMessage("Avatar reset to Google picture", { variant: "success" });
    } else {
      setLoading(false);
      showMessage("Failed to reset avatar to Google picture", { variant: "error" });
    }
  };

  const handleGenerateInitials = async () => {
    if (!user) return;
    setLoading(true);
    const seed = (
      name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "User"
    ).trim();
    const initialsUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: initialsUrl },
    });
    if (!error) {
      setAvatarUrl(initialsUrl);
      await syncWithBackend({ avatar_url: initialsUrl });
      setLoading(false);
      showMessage("Initials avatar generated", { variant: "success" });
    } else {
      setLoading(false);
      showMessage("Failed to generate initials avatar", { variant: "error" });
    }
  };

  const handleResetAvatar = async () => {
    if (!user) return;
    setLoading(true);
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || user.id || "fallback")}`;
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: fallbackUrl },
    });
    if (!error) {
      setAvatarUrl(fallbackUrl);
      await syncWithBackend({ avatar_url: fallbackUrl });
      setLoading(false);
      showMessage("Avatar reset to default fallback", { variant: "success" });
    } else {
      setLoading(false);
      showMessage("Failed to reset avatar", { variant: "error" });
    }
  };

  const displayedAvatar =
    avatarUrl ||
    user?.user_metadata?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.email || user?.id || "fallback")}`;

  return (
    <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-start p-6 sm:p-8 rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-none mb-2">
      {/* Avatar column */}
      <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
        <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 hover:border-primary/60 transition-all duration-200 bg-surface shrink-0 shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayedAvatar}
            alt="Avatar"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <label
            htmlFor="avatar-file-input"
            className="absolute inset-0 bg-surface-container-highest/85 text-on-surface backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer transition-opacity text-xs font-semibold gap-1"
          >
            <RiCameraLine className="w-4 h-4 text-primary" />
            <span>Edit</span>
          </label>
        </div>

        <input
          id="avatar-file-input"
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload avatar"
          onChange={handleAvatarUpload}
          disabled={loading}
        />

        {/* Clean tonal buttons */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 max-w-[280px]">
          <label
            htmlFor="avatar-file-input"
            className={`rounded-full px-3.5 py-1.5 bg-secondary-container text-on-secondary-container hover:brightness-105 active:scale-[0.98] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              loading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <RiUpload2Line className="w-3.5 h-3.5" />
            Upload Photo
          </label>

          {googleAvatar && (
            <button
              type="button"
              onClick={handleResetToGoogle}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 bg-secondary-container text-on-secondary-container hover:brightness-105 active:scale-[0.98] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RiGoogleFill className="w-3.5 h-3.5 text-[#4285F4]" />
              Reset to Google Picture
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateInitials}
            disabled={loading}
            className="rounded-full px-3.5 py-1.5 bg-secondary-container text-on-secondary-container hover:brightness-105 active:scale-[0.98] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RiSparklingLine className="w-3.5 h-3.5 text-primary" />
            Initials
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetAvatar}
          disabled={loading}
          className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50 mt-0.5"
        >
          <RiRefreshLine className="w-3.5 h-3.5" />
          Reset Avatar
        </button>
      </div>

      {/* Profile Form Details */}
      <div className="flex-1 flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="display-name"
              className="text-[13px] font-bold text-text flex items-center gap-1.5"
            >
              <RiUserLine className="w-4 h-4 text-primary" /> Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              placeholder="Your Name"
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="org-name"
              className="text-[13px] font-bold text-text flex items-center gap-1.5"
            >
              <RiBuildingLine className="w-4 h-4 text-primary" /> Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              placeholder="Company or Team name"
              autoComplete="organization"
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[13px] text-text-muted font-mono">{user?.email}</p>
          <button
            type="button"
            onClick={handleUpdateProfile}
            disabled={loading}
            className="w-full sm:w-auto rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-primary text-on-primary hover:brightness-110 shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {loading ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
