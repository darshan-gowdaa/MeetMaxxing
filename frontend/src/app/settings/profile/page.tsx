"use client";

import { useAuth } from "@/lib/auth-context";
import { ProfileHero } from "./_components/organisms/ProfileHero";
import { ProfileSecurity } from "./_components/organisms/ProfileSecurity";
import { ProfileSkeleton } from "@/components/organisms/skeletons/ProfileSkeleton";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-on-background">
        Please log in to view this page.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
            Profile
          </h1>
          <p className="text-sm text-text-muted">
            Manage your personal identity, company details, avatar, and security credentials.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <ProfileHero />
        <ProfileSecurity />
      </div>
    </div>
  );
}
