"use client";

import { useState, useEffect } from "react";
import {
  RiSparklingFill,
  RiKey2Fill,
  RiArrowDownSLine,
  RiFlashlightLine,
  RiSparklingLine,
  RiRobot2Line,
  RiInformationLine,
  RiAddLine,
  RiCpuLine,
} from "@remixicon/react";
import { ApiKey } from "../../types";
import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";

export function ModelSelection({
  keys,
  onAddKey,
}: {
  keys: ApiKey[];
  onAddKey?: () => void;
}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  // manual means byok, smart means meetmaxxing default cluster
  const [mode, setMode] = useState<"manual" | "smart">("manual");
  const [modelId, setModelId] = useState("");

  // fetch saved user preferences when auth token is available
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api-keys/model-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode || "manual");
        setModelId(data.model_id || "");
      })
      .catch(() => {});
  }, [token, API_URL]);

  // save model selection preferences back to backend
  const updatePrefs = async (updates: { mode?: "manual" | "smart"; model_id?: string }) => {
    if (updates.mode) setMode(updates.mode);
    if (updates.model_id !== undefined) setModelId(updates.model_id);

    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api-keys/model-preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showMessage("Preferences saved", { variant: "success" });
      }
    } catch {
      showMessage("Failed to save preferences", { variant: "error" });
    }
  };

  const isSmart = mode === "smart";
  const hasKeys = keys.length > 0;

  return (
    <section className="relative overflow-hidden bg-surface-container/35 border border-border/80 rounded-[32px] p-6 sm:p-8 shadow-sm backdrop-blur-sm transition-all duration-300">
      {/* ambient tonal background highlight */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />

      {/* header bar with title and active status chip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[18px] bg-primary-container/40 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <RiCpuLine className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight leading-snug">
              Intelligence & Routing
            </h2>
            <p className="text-[13px] sm:text-[14px] text-text-muted">
              Configure how AI models power live meetings and queries.
            </p>
          </div>
        </div>

        {/* tonal status chip showing current active engine */}
        <div className="shrink-0 self-start sm:self-auto">
          {isSmart ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container border border-primary/25 shadow-xs transition-all">
              <RiSparklingFill className="w-3.5 h-3.5" />
              <span>Active: MeetMaxxing AI</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs transition-all">
              <RiKey2Fill className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">
                Active: {modelId ? `BYOK (${modelId})` : "BYOK"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* segmented routing mode selection cards */}
      <div className="flex flex-col gap-3 relative z-10 mb-6">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Routing Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" role="radiogroup" aria-label="Routing Mode">
          {/* app default option */}
          <button
            type="button"
            onClick={() => updatePrefs({ mode: "smart" })}
            className={`relative flex items-start gap-4 p-4 sm:p-5 rounded-[24px] border-2 text-left cursor-pointer transition-all duration-300 active:scale-[0.98] ${
              isSmart
                ? "bg-primary-container/20 border-primary text-text shadow-sm ring-2 ring-primary/20"
                : "bg-surface hover:bg-surface-container/60 border-border/60 text-text-muted hover:border-border"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 transition-colors ${
                isSmart
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-highest text-text-muted"
              }`}
            >
              <RiSparklingFill className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[15px] text-text">App default</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/60 text-on-primary-container uppercase tracking-wide">
                  Zero Config
                </span>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Automated multi-model failover cluster (Gemini, OpenRouter, Groq). No keys needed.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all ${
                isSmart
                  ? "border-primary bg-primary"
                  : "border-text-muted/40 bg-transparent"
              }`}
            >
              {isSmart && <div className="w-2 h-2 rounded-full bg-on-primary" />}
            </div>
          </button>

          {/* user byok option */}
          <button
            type="button"
            onClick={() => updatePrefs({ mode: "manual" })}
            className={`relative flex items-start gap-4 p-4 sm:p-5 rounded-[24px] border-2 text-left cursor-pointer transition-all duration-300 active:scale-[0.98] ${
              !isSmart
                ? "bg-amber-500/10 border-amber-500/80 text-text shadow-sm ring-2 ring-amber-500/20"
                : "bg-surface hover:bg-surface-container/60 border-border/60 text-text-muted hover:border-border"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 transition-colors ${
                !isSmart
                  ? "bg-amber-500 text-black shadow-xs"
                  : "bg-surface-container-highest text-text-muted"
              }`}
            >
              <RiKey2Fill className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[15px] text-text">Use my keys (BYOK)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Custom
                </span>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Direct inference via your connected providers with encrypted zero-storage keys.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all ${
                !isSmart
                  ? "border-amber-500 bg-amber-500"
                  : "border-text-muted/40 bg-transparent"
              }`}
            >
              {!isSmart && <div className="w-2 h-2 rounded-full bg-black" />}
            </div>
          </button>
        </div>
      </div>

      {/* conditional active model selector or smart mode note */}
      <div className="relative z-10 pt-4 border-t border-border/60">
        {isSmart ? (
          <div className="flex items-center gap-3.5 p-4 rounded-[22px] bg-primary-container/20 border border-primary/20 text-text transition-all">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <RiInformationLine className="w-4 h-4" />
            </div>
            <p className="text-[13px] text-text leading-relaxed">
              Standard models are automatically routed by MeetMaxxing with high-speed failover. To route queries directly through your own model choice, switch to <strong className="font-semibold text-primary">Use my keys</strong>.
            </p>
          </div>
        ) : !hasKeys ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-[22px] bg-amber-500/10 border border-amber-500/30 text-text transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <RiInformationLine className="w-4 h-4" />
              </div>
              <div className="text-[13px] leading-relaxed">
                <span className="font-bold text-text">No API keys connected.</span> Connect an API provider key below to select and route to custom models.
              </div>
            </div>
            {onAddKey && (
              <button
                type="button"
                onClick={onAddKey}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shrink-0 active:scale-[0.98]"
              >
                <RiAddLine className="w-4 h-4" /> Connect Key
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="model-select" className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Preferred Model (BYOK)
              </label>
              <span className="text-[12px] text-primary font-medium">
                {keys.length} provider{keys.length > 1 ? "s" : ""} connected
              </span>
            </div>

            <div className="relative max-w-xl">
              <select
                id="model-select"
                aria-label="Preferred model"
                value={modelId}
                onChange={(e) => updatePrefs({ model_id: e.target.value })}
                className="appearance-none w-full bg-surface-container-highest/60 hover:bg-surface-container-highest/80 border-2 border-border/80 focus:border-primary rounded-[20px] px-4 pt-5 pb-2 text-[15px] font-semibold text-text focus:outline-none transition-all cursor-pointer shadow-xs"
              >
                <option value="" disabled>
                  Choose a model
                </option>
                {keys.some((k) => k.provider_id === "openrouter") && (
                  <option value="openrouter/auto">OpenRouter Auto (Auto-select best model)</option>
                )}
                {keys.some((k) => k.provider_id === "anthropic") && (
                  <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (High intelligence)</option>
                )}
                {keys.some((k) => k.provider_id === "anthropic") && (
                  <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Fast & low cost)</option>
                )}
                {keys.some((k) => k.provider_id === "google") && (
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced reasoning, huge context)</option>
                )}
                {keys.some((k) => k.provider_id === "google") && (
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & low cost)</option>
                )}
                {keys.some((k) => k.provider_id === "openai") && (
                  <option value="gpt-4o">GPT-4o (High quality & reasoning)</option>
                )}
                {keys.some((k) => k.provider_id === "openai") && (
                  <option value="gpt-4o-mini">GPT-4o-mini (Fast & low cost)</option>
                )}
                {keys.some((k) => k.provider_id === "openai") && (
                  <option value="o1-preview">o1-preview (Advanced reasoning)</option>
                )}
                {keys.some((k) => k.provider_id === "groq") && (
                  <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Fast inference)</option>
                )}
                {keys.some((k) => k.provider_id === "deepseek") && (
                  <option value="deepseek-reasoner">DeepSeek R1 (Advanced reasoning)</option>
                )}
                {keys.some((k) => k.provider_id === "deepseek") && (
                  <option value="deepseek-chat">DeepSeek V3 (High quality & low cost)</option>
                )}
                {keys.some((k) => k.provider_id === "mistral") && (
                  <option value="mistral-large-latest">Mistral Large 2 (High quality)</option>
                )}
                {keys.some((k) => k.provider_id === "perplexity") && (
                  <option value="sonar-pro">Sonar Pro (Web-grounded research)</option>
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <RiArrowDownSLine className="w-5 h-5" />
              </div>
            </div>

            {/* expressive tonal feature chips */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/20 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                <RiFlashlightLine className="w-3.5 h-3.5 text-tertiary shrink-0" />
                Fast & low cost
              </span>
              <span className="px-3 py-1 rounded-full bg-primary-container/30 text-on-primary-container border border-primary/20 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                <RiSparklingLine className="w-3.5 h-3.5 text-primary shrink-0" />
                High quality & reasoning
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container border border-border/40 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                <RiRobot2Line className="w-3.5 h-3.5 text-secondary shrink-0" />
                Auto-select best model
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
