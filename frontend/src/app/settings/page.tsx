'use client';

import { useState, useEffect } from 'react';
import { RiFileTextLine, RiFileList3Line, RiFlashlightLine, RiTranslate2 } from '@remixicon/react';

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
 <div className="flex flex-col gap-8 w-full max-w-3xl animate-in fade-in duration-300">
 <div className="flex flex-col gap-2">
 <h1 className="text-3xl font-black text-text tracking-tight">
 General Preferences
 </h1>
 </div>
 <section className="p-6 rounded-[24px] bg-surface border border-border shadow-sm flex flex-col gap-4">
 <h2 className="text-[15px] font-bold text-text flex items-center gap-2"><RiTranslate2 className="w-4 h-4 text-primary"/> Default Meeting Language</h2>
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
 <h2 className="text-[15px] font-bold text-text flex items-center gap-2"><RiFileList3Line className="w-4 h-4 text-primary"/> Summary Style</h2>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 { id: 'concise', label: 'Concise', icon: RiFileTextLine, desc: 'Brief overview' },
 { id: 'detailed', label: 'Detailed', icon: RiFileList3Line, desc: 'In-depth notes' },
 { id: 'action-focused', label: 'Action Focused', icon: RiFlashlightLine, desc: 'Tasks & decisions' }
 ].map(opt => (
 <label 
 key={opt.id} 
 className={`flex flex-col items-center gap-3 cursor-pointer p-4 rounded-[16px] border-2 transition-all ${style === opt.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 bg-surface2 hover:border-primary/50'}`}
 >
 <input 
 type="radio"
 name="summaryStyle"
 value={opt.id} 
 checked={style === opt.id}
 onChange={e => saveStyle(e.target.value)}
 className="hidden"
 />
 <opt.icon className={`w-6 h-6 ${style === opt.id ? 'text-primary' : 'text-text-muted'}`} />
 <div className="text-center flex flex-col gap-0.5">
 <span className={`font-bold text-[14px] ${style === opt.id ? 'text-primary' : 'text-text'}`}>
 {opt.label}
 </span>
 <span className="text-[12px] text-text-muted">{opt.desc}</span>
 </div>
 </label>
 ))}
 </div>
 </section>
 </div>
 );
}
