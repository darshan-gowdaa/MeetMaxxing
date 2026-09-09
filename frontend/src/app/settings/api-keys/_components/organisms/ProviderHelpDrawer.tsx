"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { RiKey2Line, RiCloseLine, RiExternalLinkLine } from "@remixicon/react";
import { Provider } from "../../types";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export function ProviderHelpDrawer({ provider, onClose }: { provider: Provider, onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const panelRef = useDialogA11y<HTMLDivElement>({ onClose, autoFocus: false, enabled: mounted });
  const titleId = "provider-help-title";
 const getInstructions = (id: string) => {
 switch(id) {
 case 'google': return (
 <>
 <li>Go to <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">Google AI Studio</a>.</li>
 <li>Sign in with your Google account.</li>
 <li>Click &quot;Get API Key&quot; on the left navigation bar.</li>
 <li>Click &quot;Create API Key in new project&quot; and copy it.</li>
 </>
 );
 case 'openai': return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">OpenAI platform</a>.</li>
 <li>Navigate to Settings &gt; API Keys in the left sidebar.</li>
 <li>Click &quot;Create new secret key&quot;.</li>
 <li>Give it a name and copy the key immediately (you won&apos;t see it again).</li>
 </>
 );
 case 'anthropic': return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">Anthropic API Console</a>.</li>
 <li>Navigate to &quot;Settings&quot; &gt; &quot;API Keys&quot;.</li>
 <li>Click &quot;Create Key&quot;.</li>
 <li>Copy your <code className="bg-surface3 px-1 rounded text-xs">sk-ant-...</code> key.</li>
 </>
 );
 case 'openrouter': return (
 <>
 <li>Go to <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">OpenRouter.ai</a> and sign in.</li>
 <li>Click on &quot;Keys&quot; in the top navigation bar.</li>
 <li>Click &quot;Create Key&quot;.</li>
 <li>Name your key, optionally set a credit limit, and copy it.</li>
 </>
 );
 case 'groq': return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">GroqCloud Console</a>.</li>
 <li>Navigate to &quot;API Keys&quot; in the left sidebar.</li>
 <li>Click &quot;Create API Key&quot;.</li>
 <li>Copy your <code className="bg-surface3 px-1 rounded text-xs">gsk_...</code> key.</li>
 </>
 );
 case 'mistral': return (
 <>
 <li>Go to <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">La Plateforme Mistral</a>.</li>
 <li>Navigate to &quot;API Keys&quot; under Workspace.</li>
 <li>Click &quot;Create new key&quot;.</li>
 <li>Copy the generated key.</li>
 </>
 );
 case 'deepseek': return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">DeepSeek Platform</a>.</li>
 <li>Go to the &quot;API Keys&quot; section.</li>
 <li>Click &quot;Create new API key&quot;.</li>
 <li>Copy your generated key.</li>
 </>
 );
 case 'perplexity': return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">Perplexity Settings</a>.</li>
 <li>Scroll down to the API Keys section.</li>
 <li>Click &quot;Generate&quot; to create a new key.</li>
 <li>Copy your key (starts with <code className="bg-surface3 px-1 rounded text-xs">pplx-</code>).</li>
 </>
 );
 default: return (
 <>
 <li>Go to the <a href={provider.docs_url} target="_blank"rel="noreferrer"className="text-primary hover:underline">provider&apos;s dashboard</a>.</li>
 <li>Sign in or create an account.</li>
 <li>Navigate to API Keys or Settings.</li>
 <li>Create a new secret key and copy it.</li>
 </>
 );
 }
 };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* backdrop with surrounding blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full max-w-sm h-full bg-surface/95 dark:bg-surface-container-high/95 backdrop-blur-xl border-l border-border shadow-2xl p-6 flex flex-col focus:outline-none"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id={titleId} className="text-lg font-bold flex items-center gap-2">
            <RiKey2Line className="w-5 h-5 text-primary" aria-hidden="true" /> {provider.name} Setup
          </h3>
          <button
            onClick={onClose}
            aria-label="Close setup help"
            className="w-8 h-8 rounded-full hover:bg-surface2 flex items-center justify-center"
          >
            <RiCloseLine className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ol className="list-decimal pl-5 space-y-4 text-sm text-text-muted mb-6 marker:text-text-muted/50 marker:font-medium">
            {getInstructions(provider.id)}
          </ol>
          <a
            href={provider.docs_url}
            target="_blank"
            rel="noreferrer"
            className="w-full h-10 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-semibold hover:bg-surface2 transition-colors"
          >
            Open Dashboard <RiExternalLinkLine className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
