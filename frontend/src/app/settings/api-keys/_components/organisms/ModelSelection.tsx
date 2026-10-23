"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RiSparklingFill,
  RiKey2Fill,
  RiFlashlightLine,
  RiInformationLine,
  RiAddLine,
  RiCpuLine,
  RiEyeLine,
  RiBrainLine,
  RiCoinLine,
} from "@remixicon/react";
import { ApiKey } from "../../types";
import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { M3Select } from "@/components/atoms/M3Select";

export interface ModelMeta {
  id: string;
  name: string;
  provider: string;
  costPerMeeting: string;
  capabilities: ("Fast" | "Deep Reasoning" | "Vision")[];
  description?: string;
}

export const STANDARD_MODELS: Record<string, ModelMeta[]> = {
  google: [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "google",
      costPerMeeting: "< $0.002 / mtg",
      capabilities: ["Fast", "Vision"],
      description: "Ultra-fast response with native multimodal vision",
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "google",
      costPerMeeting: "~$0.015 / mtg",
      capabilities: ["Deep Reasoning", "Vision"],
      description: "State-of-the-art reasoning with expansive 2M token context",
    },
  ],
  openai: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      costPerMeeting: "~$0.025 / mtg",
      capabilities: ["Deep Reasoning", "Vision"],
      description: "Omni model for complex reasoning and meeting synthesis",
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o-mini",
      provider: "openai",
      costPerMeeting: "< $0.003 / mtg",
      capabilities: ["Fast", "Vision"],
      description: "Cost-efficient lightweight flagship intelligence",
    },
    {
      id: "o1",
      name: "OpenAI o1",
      provider: "openai",
      costPerMeeting: "~$0.06 / mtg",
      capabilities: ["Deep Reasoning"],
      description: "Deep deliberation for hard analytical meeting tasks",
    },
  ],
  anthropic: [
    {
      id: "claude-3-7-sonnet",
      name: "Claude 3.7 Sonnet",
      provider: "anthropic",
      costPerMeeting: "~$0.03 / mtg",
      capabilities: ["Deep Reasoning", "Vision"],
      description: "Hybrid reasoning and top-tier code & meeting intelligence",
    },
    {
      id: "claude-3-5-haiku-latest",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      costPerMeeting: "< $0.003 / mtg",
      capabilities: ["Fast"],
      description: "Blazing fast inference for live conversation transcripts",
    },
  ],
  deepseek: [
    {
      id: "deepseek-chat",
      name: "DeepSeek V3",
      provider: "deepseek",
      costPerMeeting: "< $0.004 / mtg",
      capabilities: ["Fast", "Deep Reasoning"],
      description: "671B MoE architecture with exceptional price-performance",
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek R1",
      provider: "deepseek",
      costPerMeeting: "~$0.008 / mtg",
      capabilities: ["Deep Reasoning"],
      description: "Specialized open-weights reasoning model",
    },
  ],
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B (Groq LPU)",
      provider: "groq",
      costPerMeeting: "< $0.002 / mtg",
      capabilities: ["Fast"],
      description: "Ultra-low latency real-time token streaming",
    },
  ],
  mistral: [
    {
      id: "mistral-large-latest",
      name: "Mistral Large 2",
      provider: "mistral",
      costPerMeeting: "~$0.02 / mtg",
      capabilities: ["Deep Reasoning"],
      description: "123B model with advanced multilingual synthesis",
    },
  ],
  openrouter: [
    {
      id: "openrouter/auto",
      name: "OpenRouter Auto",
      provider: "openrouter",
      costPerMeeting: "~$0.005 / mtg",
      capabilities: ["Fast", "Vision"],
      description: "Dynamic routing to the optimal available provider",
    },
  ],
  perplexity: [
    {
      id: "sonar-pro",
      name: "Sonar Pro",
      provider: "perplexity",
      costPerMeeting: "~$0.015 / mtg",
      capabilities: ["Deep Reasoning"],
      description: "Real-time web grounded search & citations",
    },
  ],
};

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  groq: "Groq",
  mistral: "Mistral AI",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
};

export function inferModelMeta(modelId: string, providerId: string): ModelMeta {
  for (const list of Object.values(STANDARD_MODELS)) {
    const found = list.find((m) => m.id === modelId);
    if (found) return found;
  }

  const idLower = modelId.toLowerCase();
  const isVision =
    idLower.includes("vision") ||
    idLower.includes("4o") ||
    idLower.includes("gemini") ||
    idLower.includes("claude");
  const isReasoning =
    idLower.includes("reason") ||
    idLower.includes("pro") ||
    idLower.includes("o1") ||
    idLower.includes("r1") ||
    idLower.includes("sonnet") ||
    idLower.includes("large");
  const isFast =
    idLower.includes("flash") ||
    idLower.includes("mini") ||
    idLower.includes("haiku") ||
    idLower.includes("groq") ||
    idLower.includes("turbo") ||
    !isReasoning;

  const caps: ("Fast" | "Deep Reasoning" | "Vision")[] = [];
  if (isFast) caps.push("Fast");
  if (isReasoning) caps.push("Deep Reasoning");
  if (isVision) caps.push("Vision");
  if (caps.length === 0) caps.push("Fast");

  let cost = "~$0.01 / mtg";
  if (
    idLower.includes("flash") ||
    idLower.includes("mini") ||
    idLower.includes("haiku") ||
    idLower.includes("groq")
  ) {
    cost = "< $0.002 / mtg";
  } else if (idLower.includes("sonnet") || idLower.includes("o1") || idLower.includes("opus")) {
    cost = "~$0.03 / mtg";
  } else if (idLower.includes("pro") || idLower.includes("4o") || idLower.includes("large")) {
    cost = "~$0.015 / mtg";
  }

  return {
    id: modelId,
    name: modelId,
    provider: providerId,
    costPerMeeting: cost,
    capabilities: caps,
  };
}

export function ModelSelection({
  keys,
  onAddKey,
  discoveredModels,
}: {
  keys: ApiKey[];
  onAddKey?: () => void;
  discoveredModels?: Record<string, string[]>;
}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

  // manual means byok, smart means meetmaxxing default cluster
  const [mode, setMode] = useState<"manual" | "smart">("manual");
  const [modelId, setModelId] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("google");

  // Dynamic models fetched per provider
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});
  const [loadingModels, setLoadingModels] = useState(false);

  // Determine initial provider from modelId or connected keys
  useEffect(() => {
    if (modelId) {
      for (const [pId, list] of Object.entries(STANDARD_MODELS)) {
        if (list.some((m) => m.id === modelId)) {
          setSelectedProvider(pId);
          return;
        }
      }
    } else if (keys.length > 0) {
      setSelectedProvider(keys[0].provider_id);
    }
  }, [modelId, keys]);

  // fetch saved user preferences when auth token is available
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api-keys/model-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode || "manual");
        if (data.model_id) {
          setModelId(data.model_id);
        }
      })
      .catch(() => {});
  }, [token, API_URL]);

  // Dynamic model fetching from GET /api-keys/{provider_id}/models
  const fetchProviderModels = useCallback(
    async (providerId: string) => {
      if (!token) return;
      const hasKey = keys.some(
        (k) => k.provider_id === providerId && (k.status === "valid" || k.status === "unchecked")
      );
      if (!hasKey) return;

      setLoadingModels(true);
      try {
        const res = await fetch(`${API_URL}/api-keys/${providerId}/models`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data)
            ? data
            : data.models || data.available_models || data.data || [];
          const stringList: string[] = rawList.map((item: unknown) =>
            typeof item === "string"
              ? item
              : (item as { id?: string; name?: string })?.id ||
                (item as { id?: string; name?: string })?.name ||
                ""
          ).filter(Boolean);

          if (stringList.length > 0) {
            setDynamicModels((prev) => ({ ...prev, [providerId]: stringList }));
          }
        }
      } catch {
        // Fallback to standard defaults
      } finally {
        setLoadingModels(false);
      }
    },
    [token, keys, API_URL]
  );

  // Trigger dynamic model fetch whenever selectedProvider or keys change
  useEffect(() => {
    if (selectedProvider && token) {
      fetchProviderModels(selectedProvider);
    }
  }, [selectedProvider, token, fetchProviderModels]);

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
  const hasKeyForSelectedProvider = keys.some(
    (k) => k.provider_id === selectedProvider && (k.status === "valid" || k.status === "unchecked")
  );

  // Compute available models list for currently selected provider
  const availableModelsForProvider = useMemo(() => {
    const standard = STANDARD_MODELS[selectedProvider] || [];
    const dynamic = dynamicModels[selectedProvider];
    const preflight = discoveredModels?.[selectedProvider];

    if (dynamic && dynamic.length > 0) {
      // Map dynamic model IDs to ModelMeta
      const mapped = dynamic.map((id) => inferModelMeta(id, selectedProvider));
      // Ensure standard flagship models appear near top if present
      return mapped;
    }

    if (preflight && preflight.length > 0) {
      return preflight.map((id) => inferModelMeta(id, selectedProvider));
    }

    return standard;
  }, [selectedProvider, dynamicModels, discoveredModels]);

  const activeMeta = useMemo(() => {
    if (!modelId) return null;
    return inferModelMeta(modelId, selectedProvider);
  }, [modelId, selectedProvider]);

  const allSupportedProviders = [
    "google",
    "openai",
    "anthropic",
    "deepseek",
    "groq",
    "mistral",
    "openrouter",
    "perplexity",
  ];

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
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-warning-container text-on-warning-container border border-warning/30 shadow-xs transition-all">
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
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
          role="radiogroup"
          aria-label="Routing Mode"
        >
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
                isSmart ? "border-primary bg-primary" : "border-text-muted/40 bg-transparent"
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
                ? "bg-warning-container/30 border-warning text-text shadow-sm ring-2 ring-warning/20"
                : "bg-surface hover:bg-surface-container/60 border-border/60 text-text-muted hover:border-border"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 transition-colors ${
                !isSmart
                  ? "bg-warning text-on-warning shadow-xs"
                  : "bg-surface-container-highest text-text-muted"
              }`}
            >
              <RiKey2Fill className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[15px] text-text">Use my keys (BYOK)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-container text-on-warning-container uppercase tracking-wide">
                  Custom
                </span>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Direct inference via your connected providers with encrypted zero-storage keys.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all ${
                !isSmart ? "border-warning bg-warning" : "border-text-muted/40 bg-transparent"
              }`}
            >
              {!isSmart && <div className="w-2 h-2 rounded-full bg-on-warning" />}
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
              Standard models are automatically routed by MeetMaxxing with high-speed failover. To
              route queries directly through your own model choice, switch to{" "}
              <strong className="font-semibold text-primary">Use my keys</strong>.
            </p>
          </div>
        ) : !hasKeys ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-[22px] bg-warning-container/30 border border-warning/30 text-text transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning-container text-warning flex items-center justify-center shrink-0">
                <RiInformationLine className="w-4 h-4" />
              </div>
              <div className="text-[13px] leading-relaxed">
                <span className="font-bold text-text">No API keys connected.</span> Connect an API
                provider key below to select and route to custom models.
              </div>
            </div>
            {onAddKey && (
              <button
                type="button"
                onClick={onAddKey}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-warning hover:brightness-110 text-on-warning text-xs font-bold transition-all shrink-0 active:scale-[0.98]"
              >
                <RiAddLine className="w-4 h-4" /> Connect Key
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Provider selection tabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Provider
                </label>
                <span className="text-[12px] text-primary font-medium">
                  {keys.length} key{keys.length > 1 ? "s" : ""} connected
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {allSupportedProviders.map((pId) => {
                  const hasKey = keys.some(
                    (k) => k.provider_id === pId && (k.status === "valid" || k.status === "unchecked")
                  );
                  const isSelected = selectedProvider === pId;

                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(pId);
                        // If selecting provider with default models and current modelId isn't from this provider, pick default
                        const models = STANDARD_MODELS[pId];
                        if (models && models.length > 0 && !models.some((m) => m.id === modelId)) {
                          updatePrefs({ model_id: models[0].id });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-primary text-on-primary border-primary shadow-xs"
                          : hasKey
                          ? "bg-surface-container-high/60 border-border/80 text-text hover:bg-surface-container-highest"
                          : "bg-surface/40 border-border/40 text-text-muted hover:text-text"
                      }`}
                    >
                      <span>{PROVIDER_NAMES[pId] || pId}</span>
                      {hasKey && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-on-primary" : "bg-success"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider status feedback: has key vs missing key */}
            {!hasKeyForSelectedProvider && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface2/60 border border-border/80 text-xs">
                <div className="flex items-center gap-2 text-text-muted">
                  <RiInformationLine className="w-4 h-4 text-warning shrink-0" />
                  <span>
                    No active key connected for{" "}
                    <strong>{PROVIDER_NAMES[selectedProvider] || selectedProvider}</strong>. Showing
                    standard defaults.
                  </span>
                </div>
                {onAddKey && (
                  <button
                    type="button"
                    onClick={onAddKey}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    Add API key to load custom models ↗
                  </button>
                )}
              </div>
            )}

            {/* Dynamic model loader indicator */}
            {loadingModels && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface2/40 border border-border/40 animate-pulse text-xs text-text-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>
                  Querying live models from {PROVIDER_NAMES[selectedProvider] || selectedProvider}...
                </span>
              </div>
            )}

            {/* Model select dropdown */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="model-select"
                className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
              >
                Preferred Model (BYOK)
              </label>

              <div className="relative max-w-xl">
                <M3Select
                  id="model-select"
                  value={modelId}
                  onChange={(val) => updatePrefs({ model_id: String(val) })}
                  placeholder="Choose an AI model"
                  leadingIcon={RiCpuLine}
                  options={availableModelsForProvider.map((m) => ({
                    value: m.id,
                    label: m.name || m.id,
                    description: `Est: ${m.costPerMeeting}`,
                  }))}
                />
              </div>
            </div>

            {/* Active Model Details: Cost-per-meeting indicator and capability tags */}
            {activeMeta && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Cost per meeting indicator pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest border border-border/80 text-[12px] font-semibold text-text shadow-xs">
                  <RiCoinLine className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Est. Cost:</span>
                  <span className="font-mono font-bold text-primary">{activeMeta.costPerMeeting}</span>
                </div>

                {/* Capability tags */}
                {activeMeta.capabilities.map((cap) => {
                  if (cap === "Fast") {
                    return (
                      <span
                        key={cap}
                        className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <RiFlashlightLine className="w-3.5 h-3.5 shrink-0" />
                        Fast
                      </span>
                    );
                  }
                  if (cap === "Deep Reasoning") {
                    return (
                      <span
                        key={cap}
                        className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <RiBrainLine className="w-3.5 h-3.5 shrink-0" />
                        Deep Reasoning
                      </span>
                    );
                  }
                  if (cap === "Vision") {
                    return (
                      <span
                        key={cap}
                        className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <RiEyeLine className="w-3.5 h-3.5 shrink-0" />
                        Vision
                      </span>
                    );
                  }
                  return null;
                })}

                {activeMeta.description && (
                  <span className="text-[12px] text-text-muted ml-1 hidden sm:inline">
                    {activeMeta.description}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
