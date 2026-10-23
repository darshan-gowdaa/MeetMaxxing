"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { RiEditLine, RiCheckLine, RiSparklingLine } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface EditDialogProps {
  initialTitle: string;
  itemName?: string;
  onSave: (title: string) => void;
  onCancel: () => void;
  busy: boolean;
  error?: string;
  onSuggestAiTitle?: () => Promise<{ suggested_title: string; alternatives?: string[] } | string>;
}

export default function EditDialog({
  initialTitle,
  itemName = "Meeting",
  onSave,
  onCancel,
  busy,
  error,
  onSuggestAiTitle,
}: EditDialogProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Focus input after portal renders
  useEffect(() => {
    if (mounted) {
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [mounted]);

  // autoFocus=false — dialog manages focus
  const panelRef = useDialogA11y<HTMLDivElement>({
    onClose: onCancel,
    enabled: mounted,
    autoFocus: false,
  });
  const titleId = "edit-dialog-title";
  const errorId = "edit-dialog-error";

  const handleSuggest = async () => {
    if (!onSuggestAiTitle || suggesting || busy) return;
    setSuggesting(true);
    try {
      const res = await onSuggestAiTitle();
      let bestTitle = "";
      let alts: string[] = [];

      if (typeof res === "string") {
        bestTitle = res.trim();
        alts = [res.trim()];
      } else if (res && typeof res === "object") {
        bestTitle = (res.suggested_title || "").trim();
        alts = Array.isArray(res.alternatives) ? res.alternatives.map((a) => a.trim()).filter(Boolean) : [];
      }

      if (bestTitle) {
        setTitle(bestTitle);
      }
      if (alts.length > 0) {
        setSuggestions(alts);
      }
    } catch (e) {
      console.error("[EditDialog] AI suggestion error:", e);
    } finally {
      setSuggesting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-xs" onClick={onCancel} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 bg-surface-container-highest rounded-[32px] p-6 max-w-md w-full border border-outline-variant/20 animate-fade-scale shadow-2xl focus:outline-none"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mx-auto mb-3 shadow-xs">
          <RiEditLine className="w-6 h-6 text-primary" />
        </div>
        <h2 id={titleId} className="text-xl font-bold text-text text-center tracking-tight mb-4">
          Rename {itemName}
        </h2>

        {/* AI Suggest Title Action Header */}
        {onSuggestAiTitle && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted">
              Title
            </span>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={suggesting || busy}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-on-primary-container hover:bg-primary-container/40 px-3 py-1 rounded-full transition-all cursor-pointer disabled:opacity-50"
            >
              <RiSparklingLine className={`w-3.5 h-3.5 text-primary ${suggesting ? "animate-spin" : ""}`} />
              <span>{suggesting ? "Analyzing summary..." : "Suggest with AI"}</span>
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              e.preventDefault();
              onSave(title.trim());
            }
          }}
          aria-label={`${itemName} title`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full h-12 bg-surface-container border rounded-2xl px-4 text-base sm:text-sm text-text placeholder:text-text-muted focus:outline-none transition-colors mb-1 ${
            error ? "border-risk focus:border-risk" : "border-outline-variant/20 focus:border-primary"
          }`}
          placeholder={`${itemName} title…`}
          maxLength={120}
        />

        {error && (
          <p id={errorId} className="text-[11.5px] text-risk font-medium px-1 mb-2">
            {error}
          </p>
        )}

        {/* Alternative AI Suggestions Pills */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2.5 mb-3">
            <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
              <RiSparklingLine className="w-3 h-3 text-primary" />
              <span>AI Suggestions (click to select):</span>
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
              {suggestions.map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTitle(sugg)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all text-left truncate max-w-full cursor-pointer ${
                    title === sugg
                      ? "bg-primary-container text-on-primary-container border-primary font-bold shadow-xs"
                      : "bg-surface-container/70 hover:bg-surface-container border-outline-variant/20 text-text"
                  }`}
                  title={sugg}
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>
        )}

        {!error && suggestions.length === 0 && <div className="mb-4" />}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-outline-variant/20 text-sm font-semibold text-text transition-colors hover:bg-surface-container active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => title.trim() && onSave(title.trim())}
            disabled={busy || !title.trim()}
            className="flex-1 h-11 rounded-full bg-primary-container text-on-primary-container text-sm font-bold transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiCheckLine className="w-4 h-4" />}
            <span>{busy ? "Saving…" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

