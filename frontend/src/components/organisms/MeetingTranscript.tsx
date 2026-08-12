"use client";

import { useState } from"react";
import {
 RiChat1Line as MessageSquare,
 RiArrowDownSLine as ChevronDown,
 RiArrowUpSLine as ChevronUp,
 RiFileCopyLine as Copy,
 RiCheckLine as Check,
} from"@remixicon/react";
import type { Meeting } from"@/types";

interface MeetingTranscriptProps {
 transcriptData: Meeting["transcript_data"];
 onRefine?: () => Promise<void>;
}

export default function MeetingTranscript({ transcriptData, onRefine }: MeetingTranscriptProps) {
 const [transcriptOpen, setTranscriptOpen] = useState(false);
 const [sourceFilter, setSourceFilter] = useState<"all"|"dom"|"audio"|"refined">("all");
 const [copied, setCopied] = useState(false);
 const [isRefining, setIsRefining] = useState(false);

 const handleRefine = async (e: React.MouseEvent) => {
   e.stopPropagation();
   if (!onRefine) return;
   setIsRefining(true);
   try {
     await onRefine();
     setSourceFilter("refined");
   } finally {
     setIsRefining(false);
   }
 };
 const handleCopy = async (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!transcriptData) return;
 const text = transcriptData
 .filter(chunk => sourceFilter ==="all"? true : (((chunk as Record<string, unknown>).source as string) ||"dom") === sourceFilter)
 .map(chunk => {
 let content = typeof chunk.text ==="string"? chunk.text : JSON.stringify(chunk.text);
 if (typeof chunk.text ==="string"&& (chunk.text.trim().startsWith("{") || chunk.text.trim().startsWith("["))) {
 try {
 const parsed = JSON.parse(chunk.text);
 if (Array.isArray(parsed)) {
 content = parsed.map((item: {text?: string, utterance?: string, raw_text?: string, refined_text?: string} | string) => typeof item ==="string"? item : (item.text || item.utterance || item.raw_text || item.refined_text || JSON.stringify(item))).join(' ');
 } else if (parsed && typeof parsed ==="object"&& Array.isArray(parsed.dialog_turn)) {
 content = parsed.dialog_turn.map((t: {speaker?: string, refined_text?: string, raw_text?: string}) => `${t.speaker && t.speaker !== chunk.speaker ? t.speaker +":":""}${t.refined_text || t.raw_text}`).join(' ');
 }
 } catch {}
 }
 const time = chunk.timestamp_ms > 0 ? `[${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2,"0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2,"0")}]` :"";
 return `${time} ${chunk.speaker ||"Unknown"}: ${content}`;
 }).join('\n');
 await navigator.clipboard.writeText(text);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 if (!transcriptData || transcriptData.length === 0) return null;

 return (
 <div className={`bg-surface-container rounded-[32px] border border-zinc-800/50 overflow-hidden shadow-sm border border-border transition-all duration-300 ${transcriptOpen ? 'shadow-indigo-900/10' : ''}`}>
 <div 
 className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-5 hover:bg-surface-container active:opacity-80 transition-all cursor-pointer group flex-wrap gap-4"
 onClick={() => setTranscriptOpen((o) => !o)}
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-[20px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all duration-300 group-hover:brightness-110">
 <MessageSquare className="w-5 h-5 text-indigo-400"/>
 </div>
 <span className="text-[16px] font-extrabold tracking-tight text-zinc-100 group-hover:text-indigo-400 transition-colors">
 Full Transcript <span className="text-zinc-500 font-medium ml-1">({transcriptData.length} items)</span>
 </span>
 </div>
 <div className="flex items-center gap-2 md:gap-4 flex-wrap"onClick={(e) => e.stopPropagation()}>
 {onRefine && (
   <button
     onClick={handleRefine}
     disabled={isRefining}
     className="bg-primary text-on-primary font-bold py-1.5 px-3 rounded-full text-[12px] flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-sm"
   >
     {isRefining ? (
       <div className="flex items-center gap-2">
         <div className="md3-loading-indicator md3-loading-indicator-sm text-on-primary"></div>
         <span>Refining...</span>
       </div>
     ) : (
       <>
         <MessageSquare className="w-4 h-4" />
         <span>CLEARED - REFINED transcript</span>
       </>
     )}
   </button>
 )}
 <select 
 value={sourceFilter} 
 onChange={(e) => setSourceFilter(e.target.value as"all"|"dom"|"audio"|"refined")}
 className="bg-surface-container border border-zinc-700/50 rounded-full text-[12px] font-bold tracking-wide text-zinc-300 py-1.5 px-3 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer appearance-none"
 >
 <option value="all">All sources</option>
 <option value="dom">DOM (CC)</option>
 <option value="audio">Agent (AI)</option>
 <option value="refined">Refined (AI)</option>
 </select>
 <div
 className="w-8 h-8 rounded-full bg-surface-container border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-700 transition-colors cursor-pointer text-zinc-400 hover:text-zinc-200"
 onClick={handleCopy}
 title="Copy Transcript"
 >
 {copied ? <Check className="w-4 h-4 text-emerald-400"/> : <Copy className="w-4 h-4"/>}
 </div>
 <div 
 className="w-8 h-8 rounded-full bg-surface-container border border-zinc-700/50 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all duration-300 cursor-pointer group-active:opacity-80"
 onClick={() => setTranscriptOpen((o) => !o)}
 >
 {transcriptOpen
 ? <ChevronUp className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors"/>
 : <ChevronDown className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors"/>}
 </div>
 </div>
 </div>

 {transcriptOpen && (
 <div className="border-t border-zinc-800/50 px-4 md:px-6 pb-4 md:pb-6 pt-4 md:pt-5 flex flex-col gap-3 max-h-[520px] overflow-y-auto custom-scrollbar bg-surface-container">
 {transcriptData
 .filter(chunk => sourceFilter ==="all"? true : (((chunk as Record<string, unknown>).source as string) ||"dom") === sourceFilter)
 .map((chunk, idx) => (
 <div
 key={idx}
 className="flex flex-col gap-2 p-4 md:p-5 rounded-[24px] bg-surface-container border border-zinc-800/60 hover:shadow-sm border border-border hover:shadow-sm border border-border hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all duration-300 group/chunk"
 >
 <div className="flex items-center justify-between">
 <span className="flex items-center gap-2.5 text-[13px] font-bold tracking-wide text-zinc-200 group-hover/chunk:text-indigo-200 transition-colors">
 <span className="w-7 h-7 rounded-[12px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] flex items-center justify-center shadow-inner">
 {(chunk.speaker ||"?").charAt(0).toUpperCase()}
 </span>
 {chunk.speaker ||"Unknown"}
 </span>
 <div className="flex items-center gap-2">
 {!!(chunk as Record<string, unknown>).source && (
 <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold bg-surface-container px-2.5 py-1 rounded-full border border-zinc-700/50 shadow-sm">
 {(chunk as Record<string, unknown>).source as string}
 </span>
 )}
 {chunk.timestamp_ms > 0 && (
 <span className="text-[10px] font-mono font-bold text-zinc-500 bg-surface-container px-2 py-1 rounded-lg border border-zinc-800/50">
 {`${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2,"0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2,"0")}`}
 </span>
 )}
 </div>
 </div>
 <div className="text-[13.5px] text-zinc-400 leading-relaxed pl-[38px] group-hover/chunk:text-zinc-300 transition-colors">
 {(() => {
 let content = chunk.text;
 if (typeof content ==="string"&& (content.trim().startsWith("{") || content.trim().startsWith("["))) {
 try { content = JSON.parse(content); } catch { }
 }
 
 if (Array.isArray(content)) {
 return content.map((item: unknown, i: number) => {
 const obj = item as Record<string, unknown>;
 const text = typeof item ==="string"? item : (obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
 return <span key={i} className="block mb-1.5">{text as string}</span>;
 });
 }
 
 if (content && typeof content ==="object"&& Array.isArray((content as Record<string, unknown>).dialog_turn)) {
 return ((content as Record<string, unknown>).dialog_turn as unknown[]).map((t: unknown, i: number) => {
 const obj = t as Record<string, unknown>;
 return (
 <span key={i} className="block mb-1.5">
 {obj.speaker && obj.speaker !== chunk.speaker && obj.speaker !=="Unknown"&& obj.speaker !=="You"? <strong className="mr-1.5 text-indigo-400">{obj.speaker as string}:</strong> : null}
 {(obj.refined_text || obj.raw_text) as string}
 </span>
 );
 });
 }
 return typeof chunk.text ==="string"? chunk.text : JSON.stringify(chunk.text);
 })()}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
