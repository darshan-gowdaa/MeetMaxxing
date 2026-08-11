import { useState } from"react";
import { RiAddLine, RiQuestionLine, RiPlugLine } from"@remixicon/react";
import { Provider, ApiKey } from"../../types";
import { ApiKeyBadge } from"../molecules/ApiKeyBadge";

export function ProviderCard({ provider, apiKeys, onAdd, onCheck, onDelete, onHelp }: { provider: Provider, apiKeys: ApiKey[], onAdd: () => void, onCheck: (id: string) => void, onDelete: (id: string) => void, onHelp: () => void }) {
 const [imgError, setImgError] = useState(false);
 const domains: Record<string, string> = { openai: 'openai.com', anthropic: 'anthropic.com', google: 'gemini.google.com', mistral: 'mistral.ai', deepseek: 'deepseek.com', perplexity: 'perplexity.ai', groq: 'groq.com', openrouter: 'openrouter.ai' };
 const domain = domains[provider.id];

 const isFree = provider.pricing === 'Free Tier' || ['google', 'groq', 'mistral', 'openrouter'].includes(provider.id);

 return (
 <div className="p-5 grid grid-cols-1 md:grid-cols-[240px_1fr_auto] items-center gap-6 hover:bg-surface-highest transition-colors group">
 
 {/* Column 1: Leading Avatar & Title */}
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative transition-transform duration-300">
 {(domain && !imgError) ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt={provider.name} className="w-7 h-7 rounded-sm"onError={() => setImgError(true)} />
 ) : (
 <div className="w-full h-full bg-primary-container flex items-center justify-center text-primary"><RiPlugLine className="w-6 h-6"/></div>
 )}
 </div>

 <div className="flex flex-col gap-1 min-w-0">
 <h3 className="font-bold text-[16px] text-text tracking-tight truncate">{provider.name}</h3>
 {isFree ? (
 <span className="text-[12px] font-medium text-success-text">Free Tier</span>
 ) : (
 <span className="text-[12px] text-text-muted capitalize">{provider.pricing}</span>
 )}
 </div>
 </div>
 
 {/* Column 2: Keys List */}
 <div className="flex items-center gap-2.5 flex-wrap">
 {apiKeys.length === 0 ? (
 <span className="text-[14px] font-medium text-text-muted/70 italic px-2">No keys connected</span>
 ) : (
 apiKeys.map(key => (
 <ApiKeyBadge key={key.id} apiKey={key} onCheck={onCheck} onDelete={onDelete} />
 ))
 )}
 </div>

 {/* Column 3: Trailing Actions */}
 <div className="flex items-center justify-end gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
 <button onClick={onAdd} className="h-10 px-4 rounded-full bg-primary-container text-on-primary-container text-[14px] font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1.5 shadow-sm">
 <RiAddLine className="w-4 h-4"/> {apiKeys.length > 0 ?"Add":"Connect"}
 </button>
 <button onClick={onHelp} className="w-10 h-10 rounded-full flex items-center justify-center text-text hover:bg-surface3 transition-colors focus:ring-2 focus:ring-primary/20 outline-none"title="Setup docs">
 <RiQuestionLine className="w-5 h-5 text-text-muted"/>
 </button>
 </div>
 </div>
 );
}
