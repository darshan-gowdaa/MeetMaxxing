"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export const ProfileHero = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || "");

  const handleUpdateName = async () => {
    if (!name) return;
    setLoading(true);
    await supabase.auth.updateUser({ data: { name } });
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    setLoading(false);
  };

  const avatarUrl = user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden bg-surface-variant text-on-surface-variant relative shadow-sm mb-6">
      <div className="h-48 w-full bg-gradient-to-br from-primary to-tertiary opacity-80" />
      
      <div className="px-6 pb-6 relative flex flex-col md:flex-row gap-6 md:items-end -mt-12">
        <div className="relative group w-24 h-24 rounded-full overflow-hidden border-4 border-surface bg-surface shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={loading} />
          </label>
        </div>

        <div className="flex-1 flex flex-col gap-2 pt-2 md:pt-0">
          <label className="text-sm font-medium opacity-80">Display Name</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-surface text-on-surface px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button 
              onClick={handleUpdateName} 
              disabled={loading}
              className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Save
            </button>
          </div>
          <p className="text-sm opacity-70">{user?.email}</p>
        </div>
      </div>
    </div>
  );
};
