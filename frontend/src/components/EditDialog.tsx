"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { RiEditLine, RiCheckLine } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/Md3Loading";
import type { Meeting } from "@/types";

export default function EditDialog({
  meeting,
  onSave,
  onCancel,
  busy,
}: {
  meeting: Meeting;
  onSave: (title: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(meeting.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-sm w-full border border-border animate-fade-scale shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
          <RiEditLine className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[18px] font-bold text-text text-center tracking-tight mb-4">
          Rename Meeting
        </h2>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onSave(title.trim()); }}
          className="w-full h-12 bg-surface2 border border-border rounded-2xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors mb-4"
          placeholder="Meeting title…"
          maxLength={120}
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onSave(title.trim())}
            disabled={busy || !title.trim()}
            className="flex-1 h-11 rounded-full bg-primary-container text-on-primary-container text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-125 active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiCheckLine className="w-4 h-4" />}
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
