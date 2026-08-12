'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RiFileTextLine, RiFileList3Line, RiFlashlightLine, RiTranslate2 } from '@remixicon/react';

import { useAuth } from '@/lib/auth-context';
import { SelectionCard } from "@/components/molecules/SelectionCard";

export default function GeneralPreferences() {
  const { session } = useAuth();
  const token = session?.access_token;
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const [lang, setLang] = useState('en');
  const [style, setStyle] = useState('concise');
  const [snackbar, setSnackbar] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setLang(data.language || 'en');
        setStyle(data.summary_style || 'concise');
      });
  }, [token, API_URL]);

  const saveLang = async (v: string) => {
    setLang(v);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: v })
      });
      setSnackbar({ message: "Language updated" });
      setTimeout(() => setSnackbar(null), 3000);
    } catch {
      setSnackbar({ message: "Failed to update language" });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const saveStyle = async (v: string) => {
    setStyle(v);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary_style: v })
      });
      setSnackbar({ message: "Summary style updated" });
      setTimeout(() => setSnackbar(null), 3000);
    } catch {
      setSnackbar({ message: "Failed to update summary style" });
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const summaryOptions = [
    { id: 'concise', label: 'Concise', icon: RiFileTextLine, desc: 'Brief overview' },
    { id: 'detailed', label: 'Detailed', icon: RiFileList3Line, desc: 'In-depth notes' },
    { id: 'action-focused', label: 'Action Focused', icon: RiFlashlightLine, desc: 'Tasks & decisions' }
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-3xl animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          General Preferences
        </h1>
      </div>
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <RiTranslate2 className="w-4 h-4 text-primary"/> Default Meeting Language
        </h2>
        <select 
          value={lang} 
          onChange={e => saveLang(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-[20px] px-5 py-4 text-[14px] font-medium focus:outline-none focus:border-primary text-text transition-all appearance-none cursor-pointer"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </section>

      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <RiFileList3Line className="w-4 h-4 text-primary"/> Summary Style
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup">
          {summaryOptions.map(opt => (
            <SelectionCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              description={opt.desc}
              icon={opt.icon}
              selected={style === opt.id}
              onClick={saveStyle}
            />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {snackbar && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-highest text-text px-4 py-3 rounded-xl shadow-sm border border-border flex items-center gap-4 z-50">
            <span className="text-sm font-medium">{snackbar.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
