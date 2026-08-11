'use client';

export default function AppearancePage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">Appearance</h1>
      <div className="bg-surface-high border border-outline-variant rounded-[32px] p-6 flex flex-col gap-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Theme Preference</h2>
        <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-3xl">
          {['Light', 'Dark', 'System'].map(theme => (
            <button key={theme} className={`py-3 rounded-[24px] font-medium transition-all duration-300 active:scale-[0.97] ${theme === 'System' ? 'bg-primary-container text-on-primary-container shadow-md' : 'text-text-muted hover:text-text hover:bg-surface-high'}`}>
              {theme}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
