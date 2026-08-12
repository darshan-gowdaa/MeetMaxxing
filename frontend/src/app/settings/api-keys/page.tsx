"use client";

import { useState, useEffect } from"react";
import { AnimatePresence, motion } from"framer-motion";
import { useAuth } from"@/lib/auth-context";
import { Provider, ApiKey } from"./types";

import { ApiKeysHero } from"./_components/organisms/ApiKeysHero";
import { ProviderCard } from"./_components/organisms/ProviderCard";
import { ModelSelection } from"./_components/organisms/ModelSelection";
import { AddKeyDialog } from"./_components/organisms/AddKeyDialog";
import { ProviderHelpDrawer } from"./_components/organisms/ProviderHelpDrawer";
import { ProviderListSkeleton } from "../../../components/organisms/skeletons/ProviderListSkeleton";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||"http://localhost:8000";

export default function ApiKeysPage() {
 const { session } = useAuth();
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
 } catch {}
 };

 const fetchProviders = async () => {
 try {
 const res = await fetch(`${API_URL}/api-keys/providers`);
 const data = await res.json();
 setProviders(data.providers || []);
 } catch {}
 };

 useEffect(() => {
 Promise.all([fetchProviders(), fetchKeys()]).then(() => setLoading(false));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [token]);

 const handleCheckStatus = async (keyId: string) => {
 setKeys(keys.map(k => k.id === keyId ? { ...k, status:"unchecked"} : k)); // simulate loading
 try {
 const res = await fetch(`${API_URL}/api-keys/${keyId}/check-status`, {
 method:"POST",
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 setKeys(keys.map(k => k.id === keyId ? { ...k, status: data.status } : k));
 } catch {}
 };

 const handleDelete = async (keyId: string) => {
 const keyToDelete = keys.find(k => k.id === keyId);
 if (!keyToDelete) return;
 
 // Optimistic UI + Undo
 const previousKeys = [...keys];
 setKeys(keys.filter(k => k.id !== keyId));
 
 let deleted = false;
 const timeout = setTimeout(async () => {
 deleted = true;
 await fetch(`${API_URL}/api-keys/${keyId}`, {
 method:"DELETE",
 headers: { Authorization: `Bearer ${token}` }
 });
 }, 4000);

 setSnackbar({
 message:"API key removed",
 action: () => {
 clearTimeout(timeout);
 if (!deleted) setKeys(previousKeys);
 setSnackbar(null);
 }
 });
 };

 return (
 <div className="flex flex-col gap-8 w-full max-w-3xl animate-in fade-in duration-300">
 <ApiKeysHero onAdd={() => setAddDialog(providers[0])} />

 {loading ? (
 <ProviderListSkeleton />
 ) : (
 <div className="flex flex-col gap-8">
 {providers.filter(p => keys.some(k => k.provider_id === p.id)).length > 0 && (
 <div className="flex flex-col gap-3">
 <h2 className="text-[15px] font-bold text-text px-2">Configured Providers</h2>
 <div className="flex flex-col border border-border rounded-[24px] overflow-hidden bg-surface shadow-sm">
 {[...providers]
 .filter(p => keys.some(k => k.provider_id === p.id))
 .map((provider, idx, arr) => {
 const providerKeys = keys.filter(k => k.provider_id === provider.id);
 return (
 <div key={provider.id} className={idx !== arr.length - 1 ?"border-b border-border":""}>
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
 </div>
 )}

 <div className="flex flex-col gap-3">
 <h2 className="text-[15px] font-bold text-text px-2">Available Providers</h2>
 <div className="flex flex-col border border-border rounded-[24px] overflow-hidden bg-surface shadow-sm">
 {[...providers]
 .filter(p => !keys.some(k => k.provider_id === p.id))
 .sort((a, b) => {
 const aFree = a.pricing === 'Free Tier' || ['google', 'groq', 'mistral', 'openrouter'].includes(a.id);
 const bFree = b.pricing === 'Free Tier' || ['google', 'groq', 'mistral', 'openrouter'].includes(b.id);
 if (aFree && !bFree) return -1;
 if (!aFree && bFree) return 1;
 return 0;
 }).map((provider, idx, arr) => {
 const providerKeys = keys.filter(k => k.provider_id === provider.id);
 return (
 <div key={provider.id} className={idx !== arr.length - 1 ?"border-b border-border":""}>
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
 </div>
 </div>
 )}

 {/* Dialogs & Drawers */}
 <AnimatePresence>
 {addDialog && (
 <AddKeyDialog 
 provider={addDialog} 
 token={token} 
 onAdded={() => { fetchKeys(); setAddDialog(null); }} 
 onCancel={() => setAddDialog(null)}
 setSnackbar={setSnackbar}
 />
 )}
 </AnimatePresence>

 <AnimatePresence>
 {helpDrawer && (
 <ProviderHelpDrawer provider={helpDrawer} onClose={() => setHelpDrawer(null)} />
 )}
 </AnimatePresence>

 <ModelSelection keys={keys} setSnackbar={setSnackbar} />

 <AnimatePresence>
 {snackbar && (
 <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-highest text-text px-4 py-3 rounded-xl shadow-sm border border-border border border-border flex items-center gap-4 z-50">
 <span className="text-sm font-medium">{snackbar.message}</span>
 {snackbar.action && <button onClick={snackbar.action} className="text-primary text-sm font-bold uppercase tracking-wide hover:bg-primary/10 px-2 py-1 rounded">Undo</button>}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
