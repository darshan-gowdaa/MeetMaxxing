import { useState } from "react";
import { RiAddLine, RiQuestionLine, RiPlugLine, RiPulseLine } from "@remixicon/react";
import { Provider, ApiKey, PROVIDER_CONSOLE_URLS } from "../../types";
import { ApiKeyBadge } from "../molecules/ApiKeyBadge";

export function ProviderCard({
  provider,
  apiKeys,
  onAdd,
  onCheck,
  onDelete,
  onHelp,
}: {
  provider: Provider;
  apiKeys: ApiKey[];
  onAdd: () => void;
  onCheck: (id: string) => void;
  onDelete: (id: string) => void;
  onHelp: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const domains: Record<string, string> = {
    openai: "openai.com",
    anthropic: "anthropic.com",
    google: "gemini.google.com",
    mistral: "mistral.ai",
    deepseek: "deepseek.com",
    perplexity: "perplexity.ai",
    groq: "groq.com",
    openrouter: "openrouter.ai",
  };
  const domain = domains[provider.id];
  const consoleUrl = PROVIDER_CONSOLE_URLS[provider.id] || provider.docs_url;

  const isFree =
    provider.pricing === "Free Tier" ||
    ["google", "groq", "mistral", "openrouter"].includes(provider.id);

  const activeKey = apiKeys.find((k) => k.is_default_for_provider) || apiKeys[0];
  const isChecking = apiKeys.some((k) => k.status === "unchecked");

  return (
    <div className="p-4 sm:p-5 flex flex-col md:grid md:grid-cols-[240px_1fr_auto] md:items-center gap-4 md:gap-6 hover:bg-surface-highest transition-colors group">
      {/* Column 1: Leading Avatar & Title */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative transition-transform duration-300">
          {domain && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
              alt={provider.name}
              className="w-7 h-7 rounded-md"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-primary-container flex items-center justify-center text-primary">
              <RiPlugLine className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-bold text-[16px] text-text tracking-tight truncate">
            {provider.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {isFree ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success/10 text-[11px] font-bold text-success capitalize border border-success/20 w-fit">
                Free Tier
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-variant text-[11px] font-bold text-text-muted capitalize border border-border w-fit">
                {provider.pricing}
              </span>
            )}
            {consoleUrl && (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
              >
                Get Key ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Column 2: Keys List */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {apiKeys.length === 0 ? (
          <span className="text-[14px] font-medium text-text-muted/70 italic px-2">
            No keys connected
          </span>
        ) : (
          apiKeys.map((key) => (
            <ApiKeyBadge key={key.id} apiKey={key} onCheck={onCheck} onDelete={onDelete} />
          ))
        )}
      </div>

      {/* Column 3: Trailing Actions (fully accessible on touch & keyboard focus) */}
      <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 transition-opacity duration-200 mt-2 md:mt-0">
        {/* Live Ping / Test button */}
        {apiKeys.length > 0 && activeKey && (
          <button
            type="button"
            onClick={() => onCheck(activeKey.id)}
            disabled={isChecking}
            aria-label={`Ping connection for ${provider.name}`}
            className="h-10 px-3.5 rounded-full border border-border/80 hover:bg-surface2 text-[13px] font-semibold text-text transition-colors flex items-center gap-1.5 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 shadow-xs"
            title="Test connection and check latency"
          >
            <RiPulseLine
              className={`w-4 h-4 ${isChecking ? "animate-spin text-warning" : "text-primary"}`}
              aria-hidden="true"
            />
            <span>Ping</span>
            {activeKey.latency_ms !== undefined && activeKey.latency_ms !== null && (
              <span className="text-[11px] font-mono text-text-muted font-bold">
                {activeKey.latency_ms}ms
              </span>
            )}
          </button>
        )}

        <button
          onClick={onAdd}
          className="flex-1 md:flex-none h-10 px-4 rounded-full bg-primary-container text-on-primary-container text-[14px] font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center md:justify-start gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <RiAddLine className="w-4 h-4" /> {apiKeys.length > 0 ? "Add" : "Connect"}
        </button>

        <button
          onClick={onHelp}
          aria-label={`${provider.name} setup docs`}
          className="w-10 h-10 rounded-full flex items-center justify-center text-text hover:bg-surface3 transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
          title="Setup docs"
        >
          <RiQuestionLine className="w-5 h-5 text-text-muted" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
