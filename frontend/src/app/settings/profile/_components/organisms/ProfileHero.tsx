"use client";

import { useState } from"react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from"@/lib/auth-context";
import { supabase } from"@/lib/supabase";

export const ProfileHero = () => {
 const { user } = useAuth();
 const [loading, setLoading] = useState(false);
 const [name, setName] = useState(user?.user_metadata?.name ||"");
 const [snackbar, setSnackbar] = useState<{ message: string } | null>(null);

 const handleUpdateName = async () => {
 if (!name) return;
 setLoading(true);
 const { error } = await supabase.auth.updateUser({ data: { name } });
 setLoading(false);
 if (!error) {
 setSnackbar({ message: "Profile updated" });
 setTimeout(() => setSnackbar(null), 3000);
 } else {
 setSnackbar({ message: "Failed to update profile" });
 setTimeout(() => setSnackbar(null), 3000);
 }
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

 const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
 setLoading(false);
 if (!updateError) {
 setSnackbar({ message: "Avatar updated" });
 setTimeout(() => setSnackbar(null), 3000);
 } else {
 setSnackbar({ message: "Failed to update avatar" });
 setTimeout(() => setSnackbar(null), 3000);
 }
 };

 const avatarUrl = user?.user_metadata?.avatar_url ||"https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

 return (
 <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-start p-5 md:p-6 rounded-[24px] bg-surface border border-border shadow-sm mb-2">
 <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-surface shrink-0">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={avatarUrl} alt="Avatar"className="w-full h-full object-cover"/>
 <label className="absolute inset-0 bg-surface-container-high text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
 Upload
 <input type="file"accept="image/*"className="hidden"onChange={handleAvatarUpload} disabled={loading} />
 </label>
 </div>

 <div className="flex-1 flex flex-col gap-3 w-full">
 <label className="text-[13px] font-bold text-text">Display Name</label>
 <div className="flex gap-2">
 <input 
 type="text"
 value={name} 
 onChange={(e) => setName(e.target.value)}
 className="flex-1 bg-surface2 text-text px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary text-sm transition-colors"
 />
 <button 
 onClick={handleUpdateName} 
 disabled={loading}
 className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all active:opacity-80"
 >
 Save
 </button>
 </div>
 <p className="text-[13px] text-text-muted">{user?.email}</p>
 </div>

 <AnimatePresence>
 {snackbar && (
 <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-highest text-text px-4 py-3 rounded-xl shadow-sm border border-border flex items-center gap-4 z-50">
 <span className="text-sm font-medium">{snackbar.message}</span>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
