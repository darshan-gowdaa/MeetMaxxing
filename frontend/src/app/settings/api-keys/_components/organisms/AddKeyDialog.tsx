"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  RiPlugLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCloseLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiPulseLine,
} from "@remixicon/react";
import { Provider, PreflightTestResponse, PROVIDER_CONSOLE_URLS } from "../../types";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { useSnackbar } from "@/components/providers/SnackbarProvider";

export function AddKeyDialog({
  provider,
  token,
  onAdded,
  onCancel,
}: {
  provider: Provider;
  token: string | undefined;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<PreflightTestResponse | null>(null);

  const { showMessage } = useSnackbar();

  // lock background scrolling when modal is open
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

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
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

  const panelRef = useDialogA11y<HTMLDivElement>({ onClose: onCancel, enabled: mounted });
  const titleId = "add-key-dialog-title";

  // Client-side regex pattern validation on keystroke
  const patternValidation = useMemo(() => {
    if (!keyValue.trim()) return null;
    if (!provider.pattern || provider.pattern === ".*") {
      return { isValid: true, message: "Valid format" };
    }
    try {
      const reg = new RegExp(provider.pattern);
      const isValid = reg.test(keyValue.trim());
      return {
        isValid,
        message: isValid
          ? "Matches expected key pattern"
          : `Format should match pattern ${provider.pattern}`,
      };
    } catch {
      return { isValid: true, message: "Valid format" };
    }
  }, [keyValue, provider.pattern]);

  // Preflight connection test
  const handleTestConnection = async () => {
    if (!keyValue.trim() || !token) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_URL}/api-keys/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider_id: provider.id,
          key: keyValue.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const isSuccess = data.valid !== undefined ? Boolean(data.valid) : data.status === "valid";
        setTestResult({
          valid: isSuccess,
          latency_ms: data.latency_ms,
          error_type: data.error_type,
          error_message: data.error_message || data.error,
          models: data.models,
          available_models: data.available_models,
        });
      } else {
        setTestResult({
          valid: false,
          error_type: data.error_type || "ValidationError",
          error_message:
            data.detail ||
            data.error_message ||
            data.error ||
            `HTTP ${res.status}: Validation rejected by server`,
        });
      }
    } catch (err: unknown) {
      setTestResult({
        valid: false,
        error_type: "NetworkError",
        error_message:
          err instanceof Error ? err.message : "Network error verifying connection",
      });
    } finally {
      setTesting(false);
    }
  };

  const discoveredModels = testResult?.models || testResult?.available_models;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* backdrop with surrounding blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-bg/80 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* modal panel */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.38, 1.21, 0.22, 1] }}
        className="relative z-10 bg-surface-container-highest/95 backdrop-blur-xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-border/80 w-full max-w-md p-6 sm:p-7 focus:outline-none my-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {domain ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt=""
                className="w-7 h-7 rounded-xl"
                aria-hidden="true"
              />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <RiPlugLine className="w-4 h-4" aria-hidden="true" />
              </div>
            )}
            <div className="flex flex-col">
              <h2 id={titleId} className="text-xl font-bold text-text tracking-tight">
                Add {provider.name} Key
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface2 transition-colors"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) return;
            setSaving(true);

            try {
              const res = await fetch(`${API_URL}/api-keys/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  provider_id: provider.id,
                  key: keyValue.trim(),
                  label: labelValue.trim(),
                }),
              });
              if (res.ok) {
                showMessage(`${provider.name} key saved`, { variant: "success" });
                onAdded();
              } else {
                const data = await res.json().catch(() => ({}));
                showMessage(data.detail || "Failed to add key. Please try again.", {
                  variant: "error",
                });
              }
            } catch {
              showMessage("Network error occurred.", { variant: "error" });
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4"
        >
          {/* Security microcopy container */}
          <div className="bg-surface2/60 dark:bg-surface-container-lowest/50 p-3.5 rounded-[16px] flex items-start gap-2.5 border border-border/60">
            <RiLockLine className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex flex-col gap-1 text-[12px] leading-relaxed">
              <p className="text-text-muted">
                Your keys stay yours. We encrypt every key before storage and only decrypt it in memory
                for the seconds it takes to call the provider.
              </p>
              <p className="text-text-muted/90 font-medium">
                For optimal security, use a project-scoped key with chat/inference permissions and spending limit.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1.5">
              <label
                htmlFor="add-key-input"
                className="block text-[13px] font-medium text-text-muted"
              >
                API Key
              </label>
            </div>
            <div className="relative">
              <input
                required
                id="add-key-input"
                name="key"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setTestResult(null);
                }}
                placeholder={provider.pattern}
                className={`w-full bg-surface2 dark:bg-surface-container-low border rounded-xl px-4 py-2.5 pr-12 text-sm text-text focus:outline-none transition-colors ${
                  patternValidation === null
                    ? "border-border focus:border-primary"
                    : patternValidation.isValid
                    ? "border-success/60 focus:border-success ring-1 ring-success/20"
                    : "border-risk/60 focus:border-risk ring-1 ring-risk/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text transition-colors"
              >
                {showKey ? (
                  <RiEyeOffLine className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <RiEyeLine className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Pattern feedback */}
            {patternValidation && (
              <div
                className={`flex items-center gap-1.5 mt-1.5 text-[11px] font-medium ${
                  patternValidation.isValid ? "text-success" : "text-risk"
                }`}
              >
                {patternValidation.isValid ? (
                  <RiCheckLine className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <RiCloseCircleLine className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{patternValidation.message}</span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="add-key-label"
              className="block text-[13px] font-medium text-text-muted mb-1.5"
            >
              Label (Optional)
            </label>
            <input
              id="add-key-label"
              name="label"
              type="text"
              autoComplete="off"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              placeholder="e.g. Personal, Work"
              className="w-full bg-surface2 dark:bg-surface-container-low border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Test Connection Button and Feedback display */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !keyValue.trim()}
                className="px-3.5 py-1.5 rounded-full border border-border/80 hover:bg-surface2 text-xs font-semibold text-text transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <Md3LoadingIndicator size="sm" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <RiPulseLine className="w-3.5 h-3.5 text-primary" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Preflight Test Results */}
            {testResult && testResult.valid && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RiCheckLine className="w-4 h-4 shrink-0 text-success" />
                    <span>Connection valid</span>
                  </div>
                  {testResult.latency_ms !== undefined && (
                    <span className="font-mono bg-success/20 text-success px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {testResult.latency_ms} ms
                    </span>
                  )}
                </div>

                {discoveredModels && discoveredModels.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-success/20">
                    <p className="text-[11px] font-semibold text-success/90 mb-1.5">
                      Discovered {discoveredModels.length} available model{discoveredModels.length > 1 ? "s" : ""}:
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {discoveredModels.slice(0, 8).map((m: string) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-md bg-success/20 text-[10px] font-mono text-success"
                        >
                          {m}
                        </span>
                      ))}
                      {discoveredModels.length > 8 && (
                        <span className="text-[10px] text-success/80 self-center">
                          +{discoveredModels.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {testResult && !testResult.valid && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-risk/10 border border-risk/30 text-risk text-xs">
                <RiCloseCircleLine className="w-4 h-4 shrink-0 mt-0.5 text-risk" />
                <div className="flex-1">
                  <p className="font-semibold">{testResult.error_type || "Connection Error"}</p>
                  <p className="text-[11px] opacity-90 leading-tight">
                    {testResult.error_message || "Invalid API key or unable to reach provider."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3">
            {consoleUrl ? (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Get key from console ↗
              </a>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-5 py-2 rounded-full hover:bg-surface2 text-[14px] font-medium text-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (patternValidation !== null && !patternValidation.isValid)}
                className="px-6 py-2 rounded-full bg-primary text-on-primary text-[14px] font-medium hover:bg-primary/90 transition-all min-w-[100px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
              >
                {saving ? <Md3LoadingIndicator size="sm" className="text-on-primary" /> : "Save Key"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
