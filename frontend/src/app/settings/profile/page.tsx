"use client";

import { useAuth } from "@/lib/auth-context";
import { ProfileHero } from "./_components/organisms/ProfileHero";
import { ProfileSecurity } from "./_components/organisms/ProfileSecurity";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-on-background">
        Please log in to view this page.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold text-text">Profile</h1>
      
      <div className="flex flex-col gap-6">
        <ProfileHero />
        <ProfileSecurity />
      </div>
    </div>
  );
}
