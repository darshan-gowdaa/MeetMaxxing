export interface Provider {
  id: string;
  name: string;
  logo: string;
  docs_url: string;
  pattern: string;
  pricing: string;
}

export interface ApiKey {
  id: string;
  provider_id: string;
  label: string;
  last4: string;
  status: "valid" | "invalid" | "unchecked" | "rate_limited";
  last_checked_at: string;
  is_default_for_provider: boolean;
  last_error_message_safe?: string;
  latency_ms?: number;
}

export interface ProviderCredential {
  id: string;
  provider_id: string;
  label: string;
  last4: string;
  status: "valid" | "invalid" | "unchecked" | "rate_limited";
  last_checked_at: string;
  is_default_for_provider: boolean;
  last_error_message_safe?: string;
  latency_ms?: number;
}

export interface PreflightTestResponse {
  valid: boolean;
  latency_ms?: number;
  error_type?: string;
  error_message?: string;
  models?: string[];
  available_models?: string[];
}

export interface DiscoveredModel {
  id: string;
  name?: string;
  description?: string;
  pricing_per_meeting?: string;
  capabilities?: string[];
}

export const PROVIDER_CONSOLE_URLS: Record<string, string> = {
  google: "https://aistudio.google.com/app/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  groq: "https://console.groq.com/keys",
  openrouter: "https://openrouter.ai/settings/keys",
  deepseek: "https://platform.deepseek.com/api_keys",
  mistral: "https://console.mistral.ai/api-keys/",
  perplexity: "https://www.perplexity.ai/settings/api",
};
