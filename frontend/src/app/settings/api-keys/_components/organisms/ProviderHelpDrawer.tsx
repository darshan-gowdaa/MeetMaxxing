import { motion } from "framer-motion";
import { RiKey2Line, RiCloseLine, RiExternalLinkLine } from "@remixicon/react";
import { Provider } from "../../types";

export function ProviderHelpDrawer({ provider, onClose }: { provider: Provider, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-sm h-full bg-surface border-l border-border shadow-2xl p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><RiKey2Line className="w-5 h-5 text-primary" /> {provider.name} Setup</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface2 flex items-center justify-center"><RiCloseLine className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ol className="list-decimal pl-5 space-y-4 text-sm text-text-muted mb-6">
            <li>Go to the <a href={provider.docs_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">provider&apos;s dashboard</a>.</li>
            <li>Sign in or create an account.</li>
            <li>Navigate to API Keys or Settings.</li>
            <li>Create a new secret key and copy it.</li>
          </ol>
          <a href={provider.docs_url} target="_blank" rel="noreferrer" className="w-full h-10 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-semibold hover:bg-surface2 transition-colors">
            Open Dashboard <RiExternalLinkLine className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
