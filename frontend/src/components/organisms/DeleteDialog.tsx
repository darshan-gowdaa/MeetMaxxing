"use client";

import { useEffect, useState } from"react";
import { createPortal } from"react-dom";
import { RiDeleteBinLine } from"@remixicon/react";
import { Md3LoadingIndicator } from"@/components/atoms/Md3Loading";
import { useDialogA11y } from"@/hooks/useDialogA11y";

export function DeleteDialog({
	 title,
	 itemName ="Meeting",
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
	 document.body.style.overflow ="hidden";
	 return () => { document.body.style.overflow ="unset"; };
	 }, []);

	 const panelRef = useDialogA11y<HTMLDivElement>({ onClose: onCancel, enabled: mounted });
	 const titleId ="delete-dialog-title";

	 if (!mounted) return null;

	 return createPortal(
	 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
	 {/* Scrim */}
	 <div
	 className="absolute inset-0 bg-bg/80"
	 onClick={onCancel}
	 aria-hidden="true"
	 />
	 {/* Dialog surface */}
	 <div
	 ref={panelRef}
	 role="dialog"
	 aria-modal="true"
	 aria-labelledby={titleId}
	 tabIndex={-1}
	 className="relative z-10 w-full max-w-lg sm:max-w-sm bg-surface-container-highest rounded-t-[28px] sm:rounded-[28px] rounded-b-none sm:rounded-b-[28px] p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 border-t sm:border border-border shadow-2xl animate-fade-scale focus:outline-none"
	 >
	 <div className="w-8 h-1 rounded-full bg-outline-variant/40 mx-auto mb-3 sm:hidden shrink-0" aria-hidden="true" />
	 {/* Icon */}
	 <div className="w-12 h-12 rounded-full bg-risk-container flex items-center justify-center mx-auto mb-4">
	 <RiDeleteBinLine className="w-6 h-6 text-risk"/>
	 </div>
	 <h2 id={titleId} className="text-[18px] font-bold text-text text-center tracking-tight mb-2">
	 Delete {itemName}?
	 </h2>
 <p className="text-[13px] text-text-muted text-center leading-relaxed mb-6">
 &ldquo;{title || `Untitled ${itemName}`}&rdquo; will be permanently removed. This cannot be undone.
 </p>
 <div className="flex gap-3">
 <button
 onClick={onCancel}
 className="flex-1 h-12 sm:h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:opacity-80 touch-manipulation"
 >
 Cancel
 </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-12 sm:h-11 rounded-full bg-risk text-on-risk text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-110 active:opacity-80 disabled:opacity-60 touch-manipulation"
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
export default DeleteDialog;
