import { RiChromeFill, RiArrowRightSLine, RiKey2Line } from "@remixicon/react";
import { useState } from "react";
import { MEETMAXXING_CONFIG } from "../../../config.js";

declare const chrome: any;
declare const browser: any;
const ext = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

export function LoginPrompt() {
  const [tokenInput, setTokenInput] = useState("");

  const handleOpenAuth = () => {
    window.open(`${MEETMAXXING_CONFIG.BASE_URL_WEB}/extension-auth`, "_blank");
  };

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      ext.storage.local.set({ authToken: tokenInput.trim() }, () => {
        window.location.reload();
      });
    }
  };

  return (
    <div className="mm-state-container bg-[#1a1c20] text-white h-full flex flex-col justify-center items-center px-6 text-center">
      <div className="w-16 h-16 bg-[#4a9eff]/10 rounded-full flex items-center justify-center mb-6">
        <RiChromeFill className="w-8 h-8 text-[#4a9eff]" />
      </div>
      
      <h2 className="text-xl font-bold mb-2">Welcome to MeetMaxxing</h2>
      <p className="text-sm text-white/60 mb-8">
        Please connect your account to start using the AI meeting copilot.
      </p>

      <div className="w-full space-y-4">
        <button
          onClick={handleOpenAuth}
          className="w-full py-3 px-4 bg-[#4a9eff] hover:bg-[#3a7bd5] text-white font-semibold rounded-xl flex items-center justify-between transition-colors shadow-lg shadow-[#4a9eff]/20"
        >
          <span>Get Auth Token</span>
          <RiArrowRightSLine className="w-5 h-5" />
        </button>
        
        <div className="relative mt-6 pt-4 border-t border-white/10 text-left w-full">
          <label className="block text-xs font-medium text-white/50 mb-2">Paste Token Here</label>
          <div className="relative flex items-center">
            <RiKey2Line className="absolute left-3 w-4 h-4 text-white/40" />
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4a9eff]/50 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveToken}
            disabled={!tokenInput.trim()}
            className="w-full mt-2 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Connect Extension
          </button>
        </div>
      </div>
    </div>
  );
}
