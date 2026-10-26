"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import {
  RiRefreshLine,
  RiBuildingLine,
  RiUserLine,
  RiUpload2Line,
  RiSparklingLine,
  RiCameraLine,
  RiMailLine,
  RiCheckboxCircleFill,
  RiArrowGoBackLine,
  RiCheckLine,
} from "@remixicon/react";

/** Official Google 4-color vector SVG */
function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export const ProfileHero = () => {
  const { user, session } = useAuth();
  const { showMessage } = useSnackbar();

  // Form states
  const [name, setName] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [savedName, setSavedName] = useState<string>("");
  const [savedOrgName, setSavedOrgName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [imgError, setImgError] = useState(false);

  // Status & loading states
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to obtain a valid access token for backend calls
  const getAccessToken = useCallback(async () => {
    if (session?.access_token) return session.access_token;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, [session?.access_token]);

  // Sync avatar changes with backend endpoints (both POST /api/settings/avatar and PATCH /api/settings/)
  const syncAvatarWithBackend = useCallback(
    async (url: string) => {
      const token = await getAccessToken();
      if (!token) return;
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

      await Promise.allSettled([
        fetch(`${backendUrl}/api/settings/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatar_url: url }),
        }),
        fetch(`${backendUrl}/api/settings/`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatar_url: url }),
        }),
      ]);
    },
    [getAccessToken]
  );

  // Sync profile details with PATCH /api/settings/
  const syncProfileWithBackend = useCallback(
    async (payload: { name: string; org_name: string }) => {
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
          body: JSON.stringify({
            name: payload.name,
            display_name: payload.name,
            org_name: payload.org_name,
          }),
        });
      } catch (err) {
        console.error("[ProfileHero] Backend sync error:", err);
      }
    },
    [getAccessToken]
  );

  // Google OAuth identity & avatar detection
  const googleIdentity = user?.identities?.find((i) => i.provider === "google");
  const isGoogleUser =
    user?.app_metadata?.provider === "google" || Boolean(googleIdentity);

  const googleAvatar: string | null =
    (googleIdentity?.identity_data?.avatar_url as string) ||
    (googleIdentity?.identity_data?.picture as string) ||
    (user?.app_metadata?.provider === "google"
      ? (user?.user_metadata?.avatar_url as string)
      : null) ||
    (user?.user_metadata?.picture as string) ||
    null;

  const isEmailVerified = Boolean(
    user?.email_confirmed_at || user?.confirmed_at || isGoogleUser
  );

  // Hydrate from user metadata whenever user auth changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
    const metaName =
      (user?.user_metadata?.name as string) ||
      (user?.user_metadata?.full_name as string) ||
      "";
    if (metaName) {
      setName((prev) => prev || metaName);
      setSavedName((prev) => prev || metaName);
    }
    const metaOrg =
      (user?.user_metadata?.org_name as string) ||
      (user?.user_metadata?.organization as string) ||
      "";
    if (metaOrg) {
      setOrgName((prev) => prev || metaOrg);
      setSavedOrgName((prev) => prev || metaOrg);
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

        if (data.name) {
          setName((prev) => {
            const val = prev || String(data.name);
            setSavedName((s) => s || String(data.name));
            return val;
          });
        }
        if (data.org_name) {
          setOrgName((prev) => {
            const val = prev || String(data.org_name);
            setSavedOrgName((s) => s || String(data.org_name));
            return val;
          });
        }
        if (data.avatar_url) {
          setAvatarUrl((prev) => prev || String(data.avatar_url));
        }
      } catch (err) {
        console.error("[ProfileHero] Failed to hydrate profile settings:", err);
      }
    };

    hydrateFromBackend();

    return () => {
      isMounted = false;
    };
  }, [getAccessToken]);

  // Check if form has unsaved modifications
  const hasChanges =
    name.trim() !== savedName.trim() || orgName.trim() !== savedOrgName.trim();

  // Save changes handler for name and organisation
  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        full_name: name.trim(),
        org_name: orgName.trim(),
        organization: orgName.trim(),
      },
    });

    if (!error) {
      await syncProfileWithBackend({ name: name.trim(), org_name: orgName.trim() });
      setSavedName(name.trim());
      setSavedOrgName(orgName.trim());
      setSaving(false);
      showMessage("Profile updated successfully", { variant: "success" });
    } else {
      setSaving(false);
      showMessage("Failed to update profile", { variant: "error" });
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setName(savedName);
    setOrgName(savedOrgName);
    showMessage("Unsaved changes discarded", { variant: "default" });
  };

  // Process and upload an avatar file
  const processAvatarFile = async (file: File) => {
    if (!user) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];

    if (file.size > MAX_SIZE) {
      showMessage("Image must be smaller than 5MB", { variant: "error" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTS.includes(fileExt)) {
      showMessage("Please upload a valid image (JPG, PNG, WebP, GIF)", {
        variant: "error",
      });
      return;
    }

    setAvatarLoading(true);
    const token = await getAccessToken();
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";
    let publicUrl: string | null = null;

    // 1. Attempt backend upload via POST /api/settings/avatar with multipart FormData
    if (token) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const resp = await fetch(`${backendUrl}/api/settings/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json?.avatar_url) {
            publicUrl = json.avatar_url;
          }
        }
      } catch (err) {
        console.warn(
          "[ProfileHero] Backend multipart avatar upload failed, attempting Supabase storage:",
          err
        );
      }
    }

    // 2. Fallback to Supabase client storage if backend direct upload didn't return url
    if (!publicUrl) {
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("[ProfileHero] Storage upload error:", uploadError);
        setAvatarLoading(false);
        showMessage("Failed to upload avatar", { variant: "error" });
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    }

    // 3. Two-way sync to auth metadata and backend settings
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (!updateError) {
        setAvatarUrl(publicUrl);
        setImgError(false);
        await syncAvatarWithBackend(publicUrl);
        showMessage("Avatar updated successfully", { variant: "success" });
      } else {
        throw updateError;
      }
    } catch (err) {
      console.error("[ProfileHero] Avatar sync error:", err);
      showMessage("Failed to update avatar in profile", { variant: "error" });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await processAvatarFile(file);
  };

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAvatarFile(file);
    }
  };

  // Reset to Google Picture
  const handleResetToGoogle = async () => {
    if (!user) return;
    const targetUrl =
      googleAvatar ||
      (user?.user_metadata?.picture as string) ||
      (user?.user_metadata?.avatar_url as string);
    if (!targetUrl) {
      showMessage("No Google profile photo found for this account", { variant: "error" });
      return;
    }
    setAvatarLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: targetUrl },
      });
      if (!error) {
        setAvatarUrl(targetUrl);
        setImgError(false);
        await syncAvatarWithBackend(targetUrl);
        showMessage("Avatar reset to Google Account picture", { variant: "success" });
      } else {
        throw error;
      }
    } catch {
      showMessage("Failed to reset avatar to Google picture", { variant: "error" });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Generate Initials Avatar
  const handleGenerateInitials = async () => {
    if (!user) return;
    setAvatarLoading(true);
    try {
      const seed = (
        name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "User"
      ).trim();
      const initialsUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        seed
      )}&backgroundColor=0b57d0,7252a3,146c2e,9e6c00&textColor=ffffff&fontSize=42&fontWeight=600`;

      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: initialsUrl },
      });
      if (!error) {
        setAvatarUrl(initialsUrl);
        setImgError(false);
        await syncAvatarWithBackend(initialsUrl);
        showMessage("Initials avatar generated", { variant: "success" });
      } else {
        throw error;
      }
    } catch {
      showMessage("Failed to generate initials avatar", { variant: "error" });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Reset to default fallback avatar
  const handleResetAvatar = async () => {
    if (!user) return;
    setAvatarLoading(true);
    try {
      const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        user.email || user.id || "fallback"
      )}`;
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: fallbackUrl },
      });
      if (!error) {
        setAvatarUrl(fallbackUrl);
        setImgError(false);
        await syncAvatarWithBackend(fallbackUrl);
        showMessage("Avatar reset to default", { variant: "success" });
      } else {
        throw error;
      }
    } catch {
      showMessage("Failed to reset avatar", { variant: "error" });
    } finally {
      setAvatarLoading(false);
    }
  };

  const displayedAvatar =
    avatarUrl ||
    (user?.user_metadata?.avatar_url as string) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user?.email || user?.id || "fallback"
    )}`;

  return (
    <div className="rounded-[32px] bg-surface-container-low border border-outline-variant/15 p-6 sm:p-8 lg:p-10 transition-all flex flex-col gap-8 shadow-none">
      {/* 1. M3 Expressive Avatar & Identity Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-[28px] bg-surface-container/60 border border-outline-variant/15 w-full">
        {/* Avatar Frame with Squircle Morph & Floating Camera Button */}
        <div className="relative shrink-0">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !avatarLoading && fileInputRef.current?.click()}
            className={`relative group w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[32px] overflow-hidden shrink-0 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.2)] border-2 transition-all duration-300 ${
              isDragging
                ? "border-primary ring-4 ring-primary/20 scale-105"
                : "border-outline-variant/25 hover:border-primary/50"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload profile photo"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                imgError
                  ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      user?.email || "fallback"
                    )}`
                  : displayedAvatar
              }
              alt={name ? `${name}'s avatar` : "Profile Avatar"}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Hover Camera Overlay with smooth fade-in */}
            {!avatarLoading && !isDragging && (
              <div className="absolute inset-0 bg-surface-container-highest/80 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 text-xs font-semibold text-text gap-1">
                <RiCameraLine className="w-5 h-5 text-primary" />
                <span className="text-[11px] tracking-wide">Change</span>
              </div>
            )}

            {/* Dragging Active Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/25 backdrop-blur-[2px] flex flex-col items-center justify-center text-primary text-xs font-bold gap-1 animate-pulse">
                <RiUpload2Line className="w-6 h-6" />
                <span className="text-[10px] uppercase tracking-wider">Drop here</span>
              </div>
            )}

            {/* Loading Spinner Overlay */}
            {avatarLoading && (
              <div className="absolute inset-0 bg-surface-container-highest/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-primary text-xs font-semibold gap-1.5">
                <Md3LoadingIndicator size="md" className="text-primary" />
                <span className="text-[10px] tracking-wide text-text">Updating...</span>
              </div>
            )}
          </div>

          {/* Floating Camera Quick Action Badge */}
          <button
            type="button"
            onClick={() => !avatarLoading && fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-on-primary shadow-sm border-2 border-surface-container flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Upload photo"
          >
            <RiCameraLine className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Actions & Identity Description */}
        <div className="flex flex-col gap-3 min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base sm:text-lg font-bold text-text">Profile Photo</h3>
            <p className="text-xs sm:text-[13px] text-text-muted">
              JPG, PNG, or WebP up to 5MB. Click your photo or drag and drop a new image directly.
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="avatar-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            aria-label="Upload avatar file"
            onChange={handleAvatarUpload}
            disabled={avatarLoading}
          />

          {/* M3 Expressive Action Bar: Upload Photo, Reset to Google, Initials Avatar */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {/* Upload Photo (Primary filled tonal button) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="rounded-full px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.97] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RiUpload2Line className="w-3.5 h-3.5 shrink-0" />
              <span>Upload Photo</span>
            </button>

            {/* Reset to Google (Brand assist chip) */}
            {(isGoogleUser || Boolean(googleAvatar)) && (
              <button
                type="button"
                onClick={handleResetToGoogle}
                disabled={avatarLoading}
                className="rounded-full px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-text border border-outline-variant/30 hover:border-primary/40 active:scale-[0.97] transition-all text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Reset to Google</span>
              </button>
            )}

            {/* Initials Avatar (Generative tonal chip) */}
            <button
              type="button"
              onClick={handleGenerateInitials}
              disabled={avatarLoading}
              className="rounded-full px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-text border border-outline-variant/30 hover:border-primary/40 active:scale-[0.97] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RiSparklingLine className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Initials Avatar</span>
            </button>

            {/* Reset to Default (Ghost text button) */}
            <button
              type="button"
              onClick={handleResetAvatar}
              disabled={avatarLoading}
              className="rounded-full px-3 py-2 text-xs text-text-variant hover:text-text hover:bg-surface-container-high/60 transition-colors flex items-center gap-1.5 font-medium cursor-pointer disabled:opacity-50"
            >
              <RiRefreshLine className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Form Fields & Account Details */}
      <div className="flex flex-col gap-6 w-full">
          {/* Name & Organisation Fields Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Full Name field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="display-name"
                  className="text-xs font-semibold uppercase tracking-wider text-text-variant"
                >
                  Full Name
                </label>
              </div>
              <div className="rounded-2xl bg-surface-container border border-outline-variant/20 px-4 py-3.5 focus-within:border-primary text-text text-sm transition-all flex items-center gap-3 shadow-xs">
                <RiUserLine className="w-5 h-5 text-text-variant shrink-0" />
                <input
                  id="display-name"
                  type="text"
                  value={name}
                  placeholder="Your Name"
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-text placeholder:text-text-variant/50 text-sm font-medium"
                />
              </div>
            </div>

            {/* Organisation field (with subtle Optional chip) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="org-name"
                  className="text-xs font-semibold uppercase tracking-wider text-text-variant"
                >
                  Organization
                </label>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container-high/60 text-text-variant border border-outline-variant/20">
                  Optional
                </span>
              </div>
              <div className="rounded-2xl bg-surface-container border border-outline-variant/20 px-4 py-3.5 focus-within:border-primary text-text text-sm transition-all flex items-center gap-3 shadow-xs">
                <RiBuildingLine className="w-5 h-5 text-text-variant shrink-0" />
                <input
                  id="org-name"
                  type="text"
                  value={orgName}
                  placeholder="Company or Team name"
                  autoComplete="organization"
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-text placeholder:text-text-variant/50 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="rounded-2xl bg-surface-container/60 border border-outline-variant/15 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high/60 flex items-center justify-center shrink-0 border border-outline-variant/15 text-primary">
                <RiMailLine className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-variant">
                  Account Email
                </span>
                <span className="text-sm font-medium text-text truncate">
                  {user?.email || "No email detected"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Email row with verified badge chip */}
              {isEmailVerified && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-container/30 border border-success/30 text-success text-xs font-semibold">
                  <RiCheckboxCircleFill className="w-3.5 h-3.5 shrink-0" />
                  <span>Verified</span>
                </div>
              )}

              {/* Auth Provider pill */}
              {isGoogleUser ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/20 text-text text-xs font-semibold shadow-xs">
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Google Account</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/20 text-text text-xs font-semibold shadow-xs">
                  <RiMailLine className="w-3.5 h-3.5 text-text-variant shrink-0" />
                  <span>Email &amp; Password</span>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Action Bar: Discard / Reset button and M3 Filled Save Changes button */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-5 border-t border-outline-variant/15">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!hasChanges || saving}
          className="w-full sm:w-auto rounded-full px-6 py-3 bg-surface-container hover:bg-surface-container-high text-text active:scale-[0.98] transition-all text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-outline-variant/20"
        >
          <RiArrowGoBackLine className="w-4 h-4 text-text-variant" />
          <span>Discard</span>
        </button>

        <button
          type="button"
          onClick={handleUpdateProfile}
          disabled={saving || !hasChanges}
          className="w-full sm:w-auto rounded-full px-8 py-3 bg-primary text-on-primary font-bold shadow-sm hover:brightness-110 active:scale-[0.98] transition-all text-sm inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Md3LoadingIndicator size="sm" className="text-on-primary" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <RiCheckLine className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
