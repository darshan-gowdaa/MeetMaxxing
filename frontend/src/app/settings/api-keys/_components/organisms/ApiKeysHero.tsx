import { RiAddLine } from"@remixicon/react";

export function ApiKeysHero({ onAdd }: { onAdd: () => void }) {
 return (
 <div className="relative overflow-hidden bg-surface border border-border rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 mb-6 sm:mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
 <div className="flex flex-col gap-2 max-w-xl relative z-10">
 <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-black tracking-tight text-text leading-none">API Keys</h1>
 <p className="text-[14px] sm:text-[15px] text-text-muted leading-relaxed">
 Your keys stay yours. We encrypt every key before it touches our database and only decrypt it in memory, for the seconds it takes to call the provider. We never view, log, or share your API keys.
 </p>
 </div>
 <div className="relative z-10 shrink-0">
 <button 
 onClick={onAdd}
 className="h-12 px-6 rounded-full bg-primary text-on-primary font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm hover:shadow hover:shadow-sm border border-border w-full md:w-auto"
 >
 <RiAddLine className="w-5 h-5"/> Add New Key
 </button>
 </div>
 <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] /2 translate-x-1/3 pointer-events-none"></div>
 </div>
 );
}
