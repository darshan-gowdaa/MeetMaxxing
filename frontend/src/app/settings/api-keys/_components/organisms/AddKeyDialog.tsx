import { useState } from "react";
import { motion } from "framer-motion";
import { RiPlugLine, RiLockLine } from "@remixicon/react";
import { Provider } from "../../types";

export function AddKeyDialog({ provider, token, onAdded, onCancel, setSnackbar }: { provider: Provider, token: string | undefined, onAdded: () => void, onCancel: () => void, setSnackbar: (s: { message: string, action?: () => void } | null) => void }) {
  const [saving, setSaving] = useState(false);
  
  const domains: Record<string, string> = { openai: 'openai.com', anthropic: 'anthropic.com', google: 'gemini.google.com', mistral: 'mistral.ai', deepseek: 'deepseek.com', perplexity: 'perplexity.ai', groq: 'groq.com', openrouter: 'openrouter.ai' };
  const domain = domains[provider.id];
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-surface rounded-[24px] shadow-2xl w-full max-w-md border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          {domain ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt={provider.name} className="w-6 h-6 rounded-sm" />
          ) : (
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary"><RiPlugLine className="w-4 h-4" /></div>
          )}
          <h2 className="text-xl font-bold">Add {provider.name} Key</h2>
        </div>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!token) return;
          setSaving(true);
          const fd = new FormData(e.currentTarget);
          
          try {
            const res = await fetch(`${API_URL}/api-keys/`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ provider_id: provider.id, key: fd.get("key"), label: fd.get("label") })
            });
            if (res.ok) {
              onAdded();
            } else {
              const data = await res.json().catch(() => ({}));
              setSnackbar({ message: data.detail || "Failed to add key. Please try again." });
              setTimeout(() => setSnackbar(null), 4000);
            }
          } catch {
            setSnackbar({ message: "Network error occurred." });
            setTimeout(() => setSnackbar(null), 4000);
          } finally {
            setSaving(false);
          }
        }} className="space-y-4">
          <div className="bg-surface2 p-3 rounded-lg flex gap-2">
            <RiLockLine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted">Your keys stay yours. We encrypt every key before it touches our database and only decrypt it in memory, for the seconds it takes to call the provider on your behalf.</p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-muted mb-1.5">API Key</label>
            <input required name="key" type="password" placeholder={provider.pattern} className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-muted mb-1.5">Label (Optional)</label>
            <input name="label" type="text" placeholder="e.g. Personal, Work" className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2.5 rounded-full hover:bg-surface2 text-[14px] font-medium transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-[14px] font-medium hover:bg-primary/90 transition-colors min-w-[100px] flex items-center justify-center disabled:opacity-80 shadow-sm">
              {saving ? <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "Save Key"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
