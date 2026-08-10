'use client';

import { useState, useEffect } from 'react';

export default function GeneralPreferences() {
  const [lang, setLang] = useState('en');
  const [style, setStyle] = useState('concise');

  useEffect(() => {
    setLang(localStorage.getItem('pref-lang') || 'en');
    setStyle(localStorage.getItem('pref-style') || 'concise');
  }, []);

  const saveLang = (v: string) => { setLang(v); localStorage.setItem('pref-lang', v); };
  const saveStyle = (v: string) => { setStyle(v); localStorage.setItem('pref-style', v); };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text tracking-tight">
          General Preferences
        </h1>
      </div>
      <section className="p-6 rounded-[24px] bg-surface border border-border shadow-sm flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-text">Default Meeting Language</h2>
        <select 
          value={lang} 
          onChange={e => saveLang(e.target.value)}
          className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-text transition-all appearance-none cursor-pointer"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </section>

      <section className="p-6 rounded-[24px] bg-surface border border-border shadow-sm flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-text">Summary Style</h2>
        <div className="flex flex-col gap-3">
          {['concise', 'detailed', 'action-focused'].map(opt => (
            <label key={opt} className="flex items-center gap-4 cursor-pointer p-3 rounded-[16px] hover:bg-surface2 transition-colors group">
              <input 
                type="radio" 
                name="summaryStyle" 
                value={opt} 
                checked={style === opt}
                onChange={e => saveStyle(e.target.value)}
                className="w-4 h-4 text-primary bg-surface2 border-border focus:ring-primary focus:ring-offset-surface cursor-pointer"
              />
              <span className="capitalize text-text-muted group-hover:text-text font-medium text-sm transition-colors">
                {opt.replace('-', ' ')}
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
