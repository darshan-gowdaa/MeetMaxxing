"use client";

import { useState } from"react";
import { motion } from"framer-motion";
import { RiPlugLine, RiLockLine, RiEyeLine, RiEyeOffLine } from"@remixicon/react";
import { Provider } from"../../types";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { useSnackbar } from "@/components/providers/SnackbarProvider";

export function AddKeyDialog({ provider, token, onAdded, onCancel }: { provider: Provider, token: string | undefined, onAdded: () => void, onCancel: () => void }) {
	 const [saving, setSaving] = useState(false);
	 const [showKey, setShowKey] = useState(false);
	 const { showMessage } = useSnackbar();

	 const domains: Record<string, string> = { openai: 'openai.com', anthropic: 'anthropic.com', google: 'gemini.google.com', mistral: 'mistral.ai', deepseek: 'deepseek.com', perplexity: 'perplexity.ai', groq: 'groq.com', openrouter: 'openrouter.ai' };
	 const domain = domains[provider.id];
	 const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||"http://localhost:8000";

	 const panelRef = useDialogA11y<HTMLDivElement>({ onClose: onCancel });
	 const titleId ="add-key-dialog-title";

	 return (
	 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
	 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-surface-container-high"onClick={onCancel} aria-hidden="true" />
	 <motion.div
	 ref={panelRef}
	 role="dialog"
	 aria-modal="true"
	 aria-labelledby={titleId}
	 tabIndex={-1}
	 initial={{ opacity: 0, scale: 0.95 }}
	 animate={{ opacity: 1, scale: 1 }}
	 exit={{ opacity: 0, scale: 0.95 }}
	 className="relative bg-surface rounded-[24px] shadow-sm border border-border w-full max-w-md p-6 focus:outline-none"
	 >
	 <div className="flex items-center gap-3 mb-6">
	 {domain ? (
	 /* eslint-disable-next-line @next/next/no-img-element */
	 <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="w-6 h-6 rounded-sm" aria-hidden="true"/>
	 ) : (
	 <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary"><RiPlugLine className="w-4 h-4" aria-hidden="true"/></div>
	 )}
	 <h2 id={titleId} className="text-xl font-bold">Add {provider.name} Key</h2>
	 </div>

	 <form onSubmit={async (e) => {
	 e.preventDefault();
	 if (!token) return;
	 setSaving(true);
	 const fd = new FormData(e.currentTarget);

	 try {
	 const res = await fetch(`${API_URL}/api-keys/`, {
	 method:"POST",
	 headers: {"Content-Type":"application/json", Authorization: `Bearer ${token}` },
	 body: JSON.stringify({ provider_id: provider.id, key: fd.get("key"), label: fd.get("label") })
	 });
	 if (res.ok) {
	 showMessage(`${provider.name} key saved`, { variant: "success" });
	 onAdded();
	 } else {
	 const data = await res.json().catch(() => ({}));
	 showMessage(data.detail ||"Failed to add key. Please try again.", { variant: "error" });
	 }
	 } catch {
	 showMessage("Network error occurred.", { variant: "error" });
	 } finally {
	 setSaving(false);
	 }
	 }} className="space-y-4">
	 <div className="bg-surface2 p-3 rounded-lg flex gap-2">
	 <RiLockLine className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true"/>
	 <p className="text-[11px] text-text-muted">Your keys stay yours. We encrypt every key before it touches our database and only decrypt it in memory, for the seconds it takes to call the provider on your behalf.</p>
	 </div>
	 <div>
	 <label htmlFor="add-key-input" className="block text-[13px] font-medium text-text-muted mb-1.5">API Key</label>
	 <div className="relative">
	 <input
	 required
	 id="add-key-input"
	 name="key"
	 type={showKey ? "text" : "password"}
	 autoComplete="off"
	 spellCheck={false}
	 placeholder={provider.pattern}
	 className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-primary transition-colors"
	 />
	 <button
	 type="button"
	 onClick={() => setShowKey(s => !s)}
	 aria-label={showKey ? "Hide API key" : "Show API key"}
	 className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text spring-colors"
	 >
	 {showKey ? <RiEyeOffLine className="w-4 h-4" aria-hidden="true"/> : <RiEyeLine className="w-4 h-4" aria-hidden="true"/>}
	 </button>
	 </div>
	 </div>
	 <div>
	 <label htmlFor="add-key-label" className="block text-[13px] font-medium text-text-muted mb-1.5">Label (Optional)</label>
	 <input id="add-key-label" name="label" type="text" autoComplete="off" placeholder="e.g. Personal, Work" className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"/>
	 </div>

	 <div className="flex justify-end gap-3 pt-4">
	 <button type="button"onClick={onCancel} disabled={saving} className="px-5 py-2.5 rounded-full hover:bg-surface2 text-[14px] font-medium transition-colors disabled:opacity-50">Cancel</button>
	 <button type="submit"disabled={saving} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-[14px] font-medium hover:bg-primary/90 transition-colors min-w-[100px] flex items-center justify-center gap-2 disabled:opacity-80 shadow-sm">
	 {saving ? <Md3LoadingIndicator size="sm" className="text-on-primary" /> :"Save Key"}
	 </button>
	 </div>
	 </form>
	 </motion.div>
	 </div>
	 );
}
