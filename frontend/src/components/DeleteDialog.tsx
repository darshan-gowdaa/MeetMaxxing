"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiDeleteBinLine } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/Md3Loading";

export default function DeleteDialog({
  title,
  itemName = "Meeting",
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog surface */}
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-sm w-full border border-border animate-fade-scale shadow-2xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-risk-container flex items-center justify-center mx-auto mb-4">
          <RiDeleteBinLine className="w-6 h-6 text-risk" />
        </div>
        <h2 className="text-[18px] font-bold text-text text-center tracking-tight mb-2">
          Delete {itemName}?
        </h2>
        <p className="text-[13px] text-text-muted text-center leading-relaxed mb-6">
          &ldquo;{title || `Untitled ${itemName}`}&rdquo; will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-11 rounded-full bg-risk-container text-risk text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-125 active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiDeleteBinLine className="w-4 h-4" />}
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
