"use client";

import { useState, useEffect, useRef } from "react";
import { 
  RiLockLine, 
  RiAddLine, 
  RiCheckLine, 
  RiCloseLine, 
  RiRefreshLine, 
  RiMore2Line,
  RiExternalLinkLine,
  RiDeleteBinLine,
  RiEditLine,
  RiKey2Line,
  RiFlashlightLine,
  RiSparklingLine,
  RiRobot2Line,
  RiQuestionLine
} from "@remixicon/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// Reuse API call helper or use fetch directly
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Provider {
  id: string;
  name: string;
  logo: string;
  docs_url: string;
  pattern: string;
  pricing: string;
}

interface ApiKey {
  id: string;
  provider_id: string;
  label: string;
  last4: string;
  status: "valid" | "invalid" | "unchecked" | "rate_limited";
  last_checked_at: string;
  is_default_for_provider: boolean;
}

export default function ApiKeysPage() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState<Provider | null>(null);
  const [helpDrawer, setHelpDrawer] = useState<Provider | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; action?: () => void } | null>(null);

  const fetchKeys = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setKeys(data.api_keys || []);
    } catch (e) {}
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_URL}/api-keys/providers`);
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (e) {}
  };

  useEffect(() => {
    Promise.all([fetchProviders(), fetchKeys()]).then(() => setLoading(false));
  }, [token]);

  const handleCheckStatus = async (keyId: string) => {
    setKeys(keys.map(k => k.id === keyId ? { ...k, status: "unchecked" } : k)); // simulate loading
    try {
      const res = await fetch(`${API_URL}/api-keys/${keyId}/check-status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setKeys(keys.map(k => k.id === keyId ? { ...k, status: data.status } : k));
    } catch (e) {}
  };

  const handleDelete = async (keyId: string) => {
    const keyToDelete = keys.find(k => k.id === keyId);
    if (!keyToDelete) return;
    
    // Optimistic UI + Undo
    const previousKeys = [...keys];
    setKeys(keys.filter(k => k.id !== keyId));
    
    // In a real impl, we'd wait a few seconds before actually deleting.
    // For ponytail simplicity: just delete immediately, undo resets the state but doesn't actually recover from backend unless we defer.
    // Let's defer delete:
    let deleted = false;
    const timeout = setTimeout(async () => {
      deleted = true;
      await fetch(`${API_URL}/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    }, 4000);

    setSnackbar({
      message: "API key removed",
      action: () => {
        clearTimeout(timeout);
        if (!deleted) setKeys(previousKeys);
        setSnackbar(null);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button 
          onClick={() => setAddDialog(providers[0])}
          className="h-10 px-4 rounded-full bg-primary text-on-primary font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <RiAddLine className="w-5 h-5" /> Add Key
        </button>
      </div>

      <div className="bg-primary-container/20 border border-primary/20 rounded-[16px] p-4 flex gap-3 mb-8">
        <RiLockLine className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-on-primary-container leading-relaxed">
          Your keys stay yours. We encrypt every key before it touches our database and only decrypt it in memory, 
          for the seconds it takes to call the provider on your behalf. We never view, log, or share your API keys, 
          and you can delete any key permanently at any time.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex flex-col border border-border rounded-2xl overflow-hidden bg-surface shadow-sm">
          {providers.map((provider, idx) => {
            const providerKeys = keys.filter(k => k.provider_id === provider.id);
            return (
              <div key={provider.id} className={idx !== providers.length - 1 ? "border-b border-border" : ""}>
                <ProviderCard 
                  provider={provider} 
                  apiKeys={providerKeys} 
                  onAdd={() => setAddDialog(provider)}
                  onCheck={handleCheckStatus}
                  onDelete={handleDelete}
                  onHelp={() => setHelpDrawer(provider)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <AnimatePresence>
        {addDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddDialog(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-surface rounded-[24px] shadow-2xl w-full max-w-md border border-border p-6">
              <h2 className="text-xl font-bold mb-4">Add {addDialog.name} Key</h2>
              <p className="text-sm text-text-muted mb-4">
                Need help finding this? <button onClick={() => setHelpDrawer(addDialog)} className="text-primary hover:underline">How do I get this?</button>
              </p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const key = fd.get("key") as string;
                if (!new RegExp(addDialog.pattern).test(key)) {
                  setSnackbar({ message: `Key format doesn't match expected pattern for ${addDialog.name}` });
                  setTimeout(() => setSnackbar(null), 4000);
                  return;
                }
                const res = await fetch(`${API_URL}/api-keys`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ provider_id: addDialog.id, key, label: fd.get("label") })
                });
                if (res.ok) {
                  fetchKeys();
                  setAddDialog(null);
                }
              }} className="space-y-4">
                <div className="bg-surface2 p-3 rounded-lg flex gap-2">
                  <RiLockLine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted">Your keys stay yours. We encrypt every key before it touches our database and only decrypt it in memory, for the seconds it takes to call the provider on your behalf.</p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-muted mb-1.5">API Key</label>
                  <input required name="key" type="password" placeholder={addDialog.pattern} className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary spring-colors" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-muted mb-1.5">Label (Optional)</label>
                  <input name="label" type="text" placeholder="e.g. Personal, Work" className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary spring-colors" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setAddDialog(null)} className="px-5 py-2.5 rounded-full hover:bg-surface2 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-colors">Save Key</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Model Selection Panel */}
      <div className="mt-8 bg-surface border border-border rounded-[20px] p-6">
        <h2 className="text-xl font-bold mb-4">Model Selection</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 border-b border-border pb-4">
             <div className="flex-1">
               <label className="block text-sm font-semibold mb-1">Chat Capability</label>
               <span className="text-[12px] text-text-muted">Select which model powers conversation and meeting summaries.</span>
             </div>
             <div className="flex gap-2">
               <button className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-sm font-medium border border-primary/20">Use my key</button>
               <button className="px-4 py-2 rounded-full bg-surface2 text-text text-sm font-medium border border-border hover:bg-surface3">Use app default</button>
             </div>
          </div>
          <div className="bg-surface2 rounded-xl p-4 flex flex-col gap-3">
             <label className="text-sm font-semibold">Active Model</label>
             {keys.length === 0 ? (
                <p className="text-sm text-text-muted italic">Add an API key above to select a custom model.</p>
             ) : (
                <select defaultValue="" className="w-full max-w-md bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" aria-label="Select Model" onChange={(e) => {
                  console.log("Selected model:", e.target.value);
                  // In a full implementation, this would save to user_model_preferences
                }}>
                  <option value="" disabled>Select a model...</option>
                  {keys.some(k => k.provider_id === 'openrouter') && <option value="openrouter/auto">OpenRouter Auto (Auto-select best model)</option>}
                  {keys.some(k => k.provider_id === 'anthropic') && <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (Higher quality, more tokens)</option>}
                  {keys.some(k => k.provider_id === 'anthropic') && <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Fast / low cost)</option>}
                  {keys.some(k => k.provider_id === 'google') && <option value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced reasoning, huge context)</option>}
                  {keys.some(k => k.provider_id === 'google') && <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast / low cost)</option>}
                  {keys.some(k => k.provider_id === 'openai') && <option value="gpt-4o">GPT-4o (Higher quality)</option>}
                  {keys.some(k => k.provider_id === 'openai') && <option value="gpt-4o-mini">GPT-4o-mini (Fast / low cost)</option>}
                  {keys.some(k => k.provider_id === 'openai') && <option value="o1-preview">o1-preview (Advanced reasoning)</option>}
                  {keys.some(k => k.provider_id === 'groq') && <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Fast / low cost)</option>}
                  {keys.some(k => k.provider_id === 'deepseek') && <option value="deepseek-reasoner">DeepSeek R1 (Advanced reasoning)</option>}
                  {keys.some(k => k.provider_id === 'deepseek') && <option value="deepseek-chat">DeepSeek V3 (Higher quality / low cost)</option>}
                  {keys.some(k => k.provider_id === 'mistral') && <option value="mistral-large-latest">Mistral Large 2 (Higher quality)</option>}
                  {keys.some(k => k.provider_id === 'perplexity') && <option value="sonar-pro">Sonar Pro (Web-grounded / Research)</option>}
                </select>
             )}
             <div className="flex gap-2 mt-2">
               <span className="px-2 py-1 rounded-md bg-surface3 text-[11px] font-medium text-text-muted flex items-center gap-1"><RiFlashlightLine className="w-3 h-3 text-warning"/> Fast / low cost</span>
               <span className="px-2 py-1 rounded-md bg-surface3 text-[11px] font-medium text-text-muted flex items-center gap-1"><RiSparklingLine className="w-3 h-3 text-primary"/> Higher quality</span>
               <span className="px-2 py-1 rounded-md bg-surface3 text-[11px] font-medium text-text-muted flex items-center gap-1"><RiRobot2Line className="w-3 h-3 text-success"/> Auto-select best model</span>
             </div>
          </div>
        </div>
      </div>

      {/* Help Drawer */}
      <AnimatePresence>
        {helpDrawer && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHelpDrawer(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-sm h-full bg-surface border-l border-border shadow-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><RiKey2Line className="w-5 h-5 text-primary" /> {helpDrawer.name} Setup</h3>
                <button onClick={() => setHelpDrawer(null)} className="w-8 h-8 rounded-full hover:bg-surface2 flex items-center justify-center"><RiCloseLine className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ol className="list-decimal pl-5 space-y-4 text-sm text-text-muted mb-6">
                  <li>Go to the <a href={helpDrawer.docs_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">provider&apos;s dashboard</a>.</li>
                  <li>Sign in or create an account.</li>
                  <li>Navigate to API Keys or Settings.</li>
                  <li>Create a new secret key and copy it.</li>
                </ol>
                <a href={helpDrawer.docs_url} target="_blank" rel="noreferrer" className="w-full h-10 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-semibold hover:bg-surface2 transition-colors">
                  Open Dashboard <RiExternalLinkLine className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-highest text-text px-4 py-3 rounded-xl shadow-lg border border-border flex items-center gap-4 z-50">
            <span className="text-sm font-medium">{snackbar.message}</span>
            {snackbar.action && <button onClick={snackbar.action} className="text-primary text-sm font-bold uppercase tracking-wide hover:bg-primary/10 px-2 py-1 rounded">Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProviderCard({ provider, apiKeys, onAdd, onCheck, onDelete, onHelp }: { provider: Provider, apiKeys: ApiKey[], onAdd: () => void, onCheck: (id: string) => void, onDelete: (id: string) => void, onHelp: () => void }) {
  const [imgError, setImgError] = useState(false);
  const brandSlugs: Record<string, string> = { openai: 'openai', anthropic: 'anthropic', google: 'google', mistral: 'mistral', deepseek: 'deepseek', cohere: 'cohere', azure: 'microsoftazure', perplexity: 'perplexity' };
  const slug = brandSlugs[provider.id];

  // Fallback for pricing if backend is stale
  const isFree = provider.pricing === 'Free Tier' || ['google', 'groq', 'mistral', 'openrouter'].includes(provider.id);

  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-surface2/30 transition-colors group">
      
      {/* Leading & Body */}
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        {/* Leading Avatar */}
        <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center overflow-hidden border border-border/50 shrink-0 shadow-sm">
          {(slug && !imgError) ? (
            <img src={`https://cdn.simpleicons.org/${slug}`} alt={provider.name} className="w-5 h-5" onError={() => setImgError(true)} />
          ) : (
            <span className="font-bold text-base text-primary">{provider.name[0]}</span>
          )}
        </div>

        {/* Body (Title & Keys Subtitle) */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[15px] text-text leading-none">{provider.name}</h3>
            {isFree && (
              <span className="px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">Free Tier</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {apiKeys.length === 0 ? (
              <span className="text-[13px] text-text-muted">Not connected</span>
            ) : (
              apiKeys.map(key => (
                <div key={key.id} className="flex items-center gap-1.5 bg-surface2 rounded px-2 py-0.5 border border-border/50">
                  <div className="relative flex h-1.5 w-1.5 shrink-0">
                    {key.status === "unchecked" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${key.status === "valid" ? "bg-success" : key.status === "invalid" ? "bg-risk" : "bg-warning"}`}></span>
                  </div>
                  <span className="text-[11px] font-mono text-text">••••{key.last4}</span>
                  <div className="flex items-center gap-1 border-l border-border/50 pl-1.5 ml-0.5">
                    <button onClick={() => onCheck(key.id)} className="text-text-muted hover:text-text transition-colors" title="Check status">
                      <RiRefreshLine className={`w-3 h-3 ${key.status === "unchecked" ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => onDelete(key.id)} className="text-risk/70 hover:text-risk transition-colors" title="Delete">
                      <RiDeleteBinLine className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onAdd} className="h-8 px-3 rounded-full bg-surface2 text-text text-[13px] font-medium hover:bg-surface3 transition-colors border border-border flex items-center gap-1 shadow-sm">
          <RiAddLine className="w-4 h-4" /> {apiKeys.length > 0 ? "Add" : "Connect"}
        </button>
        <button onClick={onHelp} className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-surface2 hover:text-text transition-colors" title="Setup docs">
          <RiQuestionLine className="w-4 h-4" />
        </button>
      </div>
      
    </div>
  );
}
