'use client';

import { useState, useEffect } from 'react';
import { RiFileTextLine, RiFileList3Line, RiFlashlightLine, RiTranslate2 } from '@remixicon/react';

import { SelectionCard } from "@/components/molecules/SelectionCard";

export default function GeneralPreferences() {
  const [lang, setLang] = useState('en');
  const [style, setStyle] = useState('concise');

  useEffect(() => {
    setLang(localStorage.getItem('pref-lang') || 'en');
    setStyle(localStorage.getItem('pref-style') || 'concise');
  }, []);

  const saveLang = (v: string) => { setLang(v); localStorage.setItem('pref-lang', v); };
  const saveStyle = (v: string) => { setStyle(v); localStorage.setItem('pref-style', v); };

  const summaryOptions = [
    { id: 'concise', label: 'Concise', icon: RiFileTextLine, desc: 'Brief overview' },
    { id: 'detailed', label: 'Detailed', icon: RiFileList3Line, desc: 'In-depth notes' },
    { id: 'action-focused', label: 'Action Focused', icon: RiFlashlightLine, desc: 'Tasks & decisions' }
  ];

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text tracking-tight">
          General Preferences
        </h1>
      </div>
      <section className="p-6 rounded-[32px] bg-surface-container border border-border flex flex-col gap-6">
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

      <section className="p-6 rounded-[32px] bg-surface-container border border-border flex flex-col gap-6">
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
    </div>
  );
}
