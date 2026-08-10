import { RiInformationLine, RiArrowDownSLine, RiFlashlightLine, RiSparklingLine, RiRobot2Line } from "@remixicon/react";
import { ApiKey } from "../../types";

export function ModelSelection({ keys }: { keys: ApiKey[] }) {
  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-text tracking-tight">Model Selection</h2>
        <p className="text-base text-text-muted">Select which intelligence powers your workspace.</p>
      </div>
      
      <div className="bg-surface border border-border rounded-[24px] p-6 shadow-sm flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h3 className="font-medium text-[15px] text-text">Routing Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="relative flex flex-col p-4 border-2 border-primary bg-primary/5 rounded-[16px] cursor-pointer transition-all hover:bg-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[15px] text-text">Use my keys</span>
                <div className="w-5 h-5 rounded-full border-[5px] border-primary flex items-center justify-center shrink-0"></div>
              </div>
              <span className="text-sm text-text-muted leading-relaxed">Route requests directly to your connected API providers.</span>
              <input type="radio" name="routing" value="custom" className="hidden" defaultChecked />
            </label>
            
            <label className="relative flex flex-col p-4 border-2 border-border/50 bg-surface rounded-[16px] cursor-pointer hover:bg-surface2/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[15px] text-text">App default</span>
                <div className="w-5 h-5 rounded-full border-2 border-text-muted flex items-center justify-center shrink-0"></div>
              </div>
              <span className="text-sm text-text-muted leading-relaxed">Use the standard models provided by MeetMaxxing.</span>
              <input type="radio" name="routing" value="default" className="hidden" />
            </label>
          </div>
        </div>

        <div className="h-px w-full bg-border/50"></div>

        <div className="flex flex-col gap-4">
          <h3 className="font-medium text-[15px] text-text">Active Model</h3>
          {keys.length === 0 ? (
            <div className="bg-surface2 rounded-[16px] p-4 flex items-center gap-3 text-text-muted border border-border/50">
              <RiInformationLine className="w-5 h-5 shrink-0" />
              <span className="text-[14px]">Connect an API key above to select a custom model.</span>
            </div>
          ) : (
            <div className="relative max-w-md">
              <select defaultValue="" className="appearance-none w-full bg-surface border-2 border-border rounded-[12px] px-4 pt-6 pb-2 text-[15px] font-medium text-text focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-sm">
                <option value="" disabled>Choose a model</option>
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
              <label className="absolute left-4 top-2 text-[10px] font-bold tracking-wider text-primary uppercase pointer-events-none">Preferred Model</label>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <RiArrowDownSLine className="w-5 h-5" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
             <span className="px-2.5 py-1 rounded-md bg-surface2 text-[12px] font-medium text-text-muted flex items-center gap-1.5"><RiFlashlightLine className="w-3.5 h-3.5 text-text-muted"/> Fast / low cost</span>
             <span className="px-2.5 py-1 rounded-md bg-surface2 text-[12px] font-medium text-text-muted flex items-center gap-1.5"><RiSparklingLine className="w-3.5 h-3.5 text-text-muted"/> Higher quality</span>
             <span className="px-2.5 py-1 rounded-md bg-surface2 text-[12px] font-medium text-text-muted flex items-center gap-1.5"><RiRobot2Line className="w-3.5 h-3.5 text-text-muted"/> Auto-select best model</span>
          </div>
        </div>
      </div>
    </div>
  );
}
