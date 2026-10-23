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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <h1 className="text-[28px] sm:text-3xl font-bold text-text">Profile</h1>

      <div className="flex flex-col gap-6">
        <ProfileHero />
        <ProfileSecurity />
      </div>
    </div>
  );
}
