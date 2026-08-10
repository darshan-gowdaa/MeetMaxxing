import { useState } from "react";
import { RiAddLine, RiQuestionLine, RiPlugLine } from "@remixicon/react";
import { Provider, ApiKey } from "../../types";
import { ApiKeyBadge } from "../molecules/ApiKeyBadge";

export function ProviderCard({ provider, apiKeys, onAdd, onCheck, onDelete, onHelp }: { provider: Provider, apiKeys: ApiKey[], onAdd: () => void, onCheck: (id: string) => void, onDelete: (id: string) => void, onHelp: () => void }) {
  const [imgError, setImgError] = useState(false);
  const domains: Record<string, string> = { openai: 'openai.com', anthropic: 'anthropic.com', google: 'gemini.google.com', mistral: 'mistral.ai', deepseek: 'deepseek.com', perplexity: 'perplexity.ai', groq: 'groq.com', openrouter: 'openrouter.ai' };
  const domain = domains[provider.id];

  const isFree = provider.pricing === 'Free Tier' || ['google', 'groq', 'mistral', 'openrouter'].includes(provider.id);

  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-surface2/30 transition-colors group">
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center overflow-hidden border border-border/50 shrink-0 shadow-sm">
          {(domain && !imgError) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt={provider.name} className="w-6 h-6 rounded-sm" onError={() => setImgError(true)} />
          ) : (
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary"><RiPlugLine className="w-5 h-5" /></div>
          )}
        </div>

        {/* Title & Free Tier */}
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="font-medium text-[15px] text-text leading-none">{provider.name}</h3>
          {isFree && (
            <span className="px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">Free Tier</span>
          )}
        </div>
        
        {/* Keys List (Middle aligned) */}
        <div className="flex items-center gap-2 flex-wrap flex-1 ml-4 overflow-hidden">
          {apiKeys.length === 0 ? (
            <span className="text-[13px] text-text-muted">Not connected</span>
          ) : (
            apiKeys.map(key => (
              <ApiKeyBadge key={key.id} apiKey={key} onCheck={onCheck} onDelete={onDelete} />
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onAdd} className="h-8 px-3 rounded-full bg-surface2 text-text text-[13px] font-medium hover:bg-surface3 transition-colors border border-border flex items-center gap-1 shadow-sm">
          <RiAddLine className="w-4 h-4" /> {apiKeys.length > 0 ? "Add" : "Connect"}
        </button>
        <button onClick={onHelp} className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-surface2 hover:text-text transition-colors" title="Setup docs">
          <RiQuestionLine className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
