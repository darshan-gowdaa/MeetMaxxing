import { useState, useEffect, useRef } from "react";
import {
  RiMicLine as Mic,
  RiChat1Line as MessageSquare,
  RiAlertLine as AlertTriangle,
  RiQuestionLine as HelpCircle,
  RiHistoryLine as History,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
  RiRadioButtonLine as Radio,
  RiRefreshLine as RefreshCw,
  RiSparklingLine as Sparkles,
  RiFlashlightLine as Zap,
  RiAlertLine as ShieldAlert,
  RiTimeLine as Clock,
  RiExternalLinkLine as ExternalLink,
  RiShieldCheckLine as Shield
} from "@remixicon/react";
import type { TranscriptChunk, CopilotUpdate } from "./types";

declare const chrome: any;

export default function App() {
  const [meetingId, setMeetingId] = useState<string>("live_meeting");
  const [meetingTitle, setMeetingTitle] = useState<string>("Google Meet Session");
  const [activeTab, setActiveTab] = useState<"insights" | "transcript">("insights");
  const [isEnded, setIsEnded] = useState<boolean>(false);
  
  const [transcriptLines, setTranscriptLines] = useState<TranscriptChunk[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [nextQuestion, setNextQuestion] = useState<string>("");
  const [recap, setRecap] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [poweredBy, setPoweredBy] = useState<string>("OpenRouter API (Priority 1)");
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedQuestion, setCopiedQuestion] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");
  
  const meetingStartTimeRef = useRef<number>(Date.now());
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - meetingStartTimeRef.current) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsedTime(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Chrome Extension message listener
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["transcript", "copilot_state", "currentMeetingId", "currentMeetingTitle", "poweredBy"], (res: any) => {
        if (res.currentMeetingId) setMeetingId(res.currentMeetingId);
        if (res.currentMeetingTitle) setMeetingTitle(res.currentMeetingTitle);
        if (res.transcript && Array.isArray(res.transcript)) setTranscriptLines(res.transcript);
        if (res.poweredBy) setPoweredBy(res.poweredBy);
        if (res.copilot_state) {
          handleCopilotUpdate(res.copilot_state);
        }
      });
    }

    const messageListener = (msg: any) => {
      if (!msg || !msg.type) return;

      if (msg.type === "LIVE_CAPTION_CHUNK" && msg.chunk) {
        appendTranscriptChunk(msg.chunk);
      } else if (msg.type === "COPILOT_UPDATE" && msg.data) {
        handleCopilotUpdate(msg.data);
      } else if (msg.type === "MEETING_STARTED") {
        setIsEnded(false);
        if (msg.meetingId) setMeetingId(msg.meetingId);
        if (msg.title) setMeetingTitle(msg.title);
        meetingStartTimeRef.current = Date.now();
      } else if (msg.type === "MEETING_ENDED") {
        setIsEnded(true);
      }
    };

    const storageListener = (changes: any, area: string) => {
      if (area === "local") {
        if (changes.transcript && Array.isArray(changes.transcript.newValue)) {
          setTranscriptLines(changes.transcript.newValue);
        }
        if (changes.currentMeetingId) {
          if (!changes.currentMeetingId.newValue && changes.currentMeetingId.oldValue) {
            setIsEnded(true);
          } else if (changes.currentMeetingId.newValue) {
            setIsEnded(false);
          }
        }
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
    }

    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        try {
          chrome.runtime.onMessage.removeListener(messageListener);
        } catch (e) {}
      }
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
        try {
          chrome.storage.onChanged.removeListener(storageListener);
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === "transcript") {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptLines, activeTab]);

  const appendTranscriptChunk = (chunk: TranscriptChunk) => {
    if (!chunk || !chunk.text) return;
    const speaker = chunk.speaker || "Speaker";
    const text = chunk.text.trim();
    if (!text) return;

    setTranscriptLines((prev) => {
      const now = Date.now();
      let updated;
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.speaker === speaker && (now - (last.timestamp || 0) < 4500)) {
          if (text === last.text) return prev;
          if (text.startsWith(last.text) || last.text.startsWith(text) || text.includes(last.text)) {
            updated = [...prev];
            updated[updated.length - 1] = { ...last, text: text.length > last.text.length ? text : last.text, timestamp: now };
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ transcript: updated });
            }
            return updated;
          }
        }
      }
      updated = [...prev, { speaker, text, timestamp: now }];
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ transcript: updated });
      }
      return updated;
    });
  };

  const handleCopilotUpdate = (data: CopilotUpdate) => {
    setIsProcessing(false);
    if (data.powered_by) {
      setPoweredBy(data.powered_by);
    }
    if (data.error) {
      setErrorMessage(data.error);
    } else {
      setErrorMessage("");
    }

    if (data.suggestions && Array.isArray(data.suggestions)) {
      setSuggestions(data.suggestions);
    }
    if (data.risks && Array.isArray(data.risks)) {
      setRisks(data.risks);
    }
    if (data.next_question) {
      setNextQuestion(data.next_question);
    }
    if (data.recap) {
      setRecap(data.recap);
    }
  };

  const triggerAction = (actionType: string) => {
    setIsProcessing(true);
    setErrorMessage("");
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: actionType, meetingId }, () => {
        void chrome.runtime?.lastError;
      });
    }
    setTimeout(() => {
      setIsProcessing(false);
    }, 10000);
  };

  const copyToClipboard = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text);
    if (idx !== undefined) {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#131314] text-[#e3e3e3] select-none font-sans overflow-hidden">
      {/* Material 3 Expressive Header Container (`#1e1f20`) */}
      <header className="px-4 pt-4 pb-3.5 bg-gradient-to-b from-[#1e1f20] to-[#1a1b1c] border-b border-[#e3e3e3]/10 flex flex-col gap-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0] border border-[#a8c7fa]/40 flex items-center justify-center shrink-0 shadow-sm animate-pulse-glow">
              <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse shrink-0" />
                <h1 className="text-sm font-bold text-white truncate tracking-tight">
                  {meetingTitle}
                </h1>
              </div>
              <span className="text-[11px] text-[#8e918f] font-mono truncate flex items-center gap-1.5">
                <span>Material 3 Expressive</span>
                <span>•</span>
                <span className="text-[#a8c7fa]">AI Copilot</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1.5 rounded-xl bg-[#28292a] border border-[#e3e3e3]/10 text-xs font-mono text-[#a8c7fa] flex items-center gap-1.5 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-[#a8c7fa]" />
              {elapsedTime}
            </span>
            <button
              onClick={() => triggerAction("REQUEST_END_MEETING")}
              className="px-2.5 py-1.5 rounded-xl bg-[#7a2730]/40 border border-[#f2b8b5]/20 text-[10px] font-bold text-[#f2b8b5] hover:bg-[#7a2730]/70 transition-all shadow-sm uppercase tracking-wider flex items-center gap-1.5 shrink-0"
              title="End Meeting"
            >
              <div className="w-1.5 h-1.5 rounded-sm bg-[#f2b8b5] shrink-0" />
              Stop
            </button>
          </div>
        </div>

        {/* Expressive Powered By API Chip Badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#28292a] border border-[#a8c7fa]/30 shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#0842a0]/60 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#fdd663]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#a8c7fa] tracking-wider leading-tight">
                Active Provider
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {poweredBy}
              </span>
            </div>
          </div>
          <button
            onClick={() => triggerAction("ASK_SUGGESTIONS")}
            disabled={isProcessing}
            title="Force refresh AI insights"
            className="p-2 rounded-xl bg-[#1e1f20] hover:bg-[#333537] text-[#a8c7fa] border border-[#e3e3e3]/10 disabled:opacity-50 transition-all shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin text-[#7fcfff]" : ""}`} />
          </button>
        </div>
      </header>

      {isEnded ? (
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#131314]">
          <div className="w-16 h-16 rounded-full bg-[#6dd58c]/10 flex items-center justify-center mb-4 shadow-inner">
            <Check className="w-8 h-8 text-[#6dd58c]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Meeting Completed</h2>
          <p className="text-sm text-[#8e918f] text-center mb-8 max-w-[280px] leading-relaxed">
            Your transcript has been processed and stored in the meeting memory.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-[300px]">
            <a
              href={`http://localhost:3000/meetings/${meetingId}`}
              target="_blank"
              rel="noreferrer"
              className="w-full px-4 py-3 rounded-2xl bg-[#0842a0] hover:bg-[#0842a0]/80 border border-[#a8c7fa]/20 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-[#a8c7fa]" />
              View Summarization Details
            </a>
            <button className="w-full px-4 py-3 rounded-2xl bg-[#1e1f20] hover:bg-[#28292a] border border-[#e3e3e3]/10 text-[#a8c7fa] hover:text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
              <History className="w-4 h-4" />
              Sync to GCalendar
            </button>
            <button className="w-full px-4 py-3 rounded-2xl bg-[#1e1f20] hover:bg-[#28292a] border border-[#e3e3e3]/10 text-[#a8c7fa] hover:text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
              <MessageSquare className="w-4 h-4" />
              Send Follow-up (Gmail)
            </button>
          </div>
        </main>
      ) : (
        <>
          {/* Expressive Pill Tab Switcher */}
          <div className="px-3 pt-3 pb-2 bg-[#1a1b1c] border-b border-[#e3e3e3]/10 shrink-0">
        <div className="flex p-1 rounded-2xl bg-[#1e1f20] border border-[#e3e3e3]/10 gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "insights"
                ? "bg-[#0842a0] text-white shadow-md border border-[#a8c7fa]/30"
                : "text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#28292a]/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Live AI Insights</span>
            {suggestions.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#131314]/80 text-[10px] font-mono text-[#d3e3fd]">
                {suggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "transcript"
                ? "bg-[#0842a0] text-white shadow-md border border-[#a8c7fa]/30"
                : "text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#28292a]/50"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${activeTab === "transcript" ? "animate-pulse text-[#6dd58c]" : ""}`} />
            <span className="truncate">Spoken Transcript</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#28292a] text-[10px] font-mono text-[#8e918f]">
              {transcriptLines.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area (`#131314` base) */}
      <main className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[#3f1d20] border border-[#f2b8b5]/40 flex items-start justify-between gap-3 text-xs text-[#f2b8b5] shadow-lg animate-fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#f2b8b5] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white tracking-wide">API Fallback Notice ({poweredBy})</span>
                <span className="leading-relaxed opacity-95 break-words">{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={() => triggerAction("ASK_SUGGESTIONS")}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-[#f2b8b5]/20 hover:bg-[#f2b8b5]/30 text-[11px] font-semibold text-white border border-[#f2b8b5]/50 shrink-0 transition-all disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === "insights" ? (
          <div className="space-y-4">
            {/* Expressive Hero Status Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#1e1f20] via-[#28292a] to-[#1e1f20] border border-[#e3e3e3]/10 shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0d3f23] border border-[#6dd58c]/30 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-[#6dd58c]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white tracking-tight">
                    Real-Time Guardrails Active
                  </span>
                  <span className="text-[10px] text-[#8e918f]">
                    Fallback hierarchy order locked
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-[#0842a0]/50 border border-[#a8c7fa]/30 text-[10px] font-mono text-[#d3e3fd]">
                100% Protected
              </span>
            </div>

            {/* Action Suggestions Section */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#a8c7fa]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Suggested Talking Points</span>
                </div>
                <span className="text-[10px] font-mono text-[#8e918f]">Tap card to copy</span>
              </div>

              {isProcessing && suggestions.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#1e1f20] border border-[#e3e3e3]/10 animate-pulse flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#a8c7fa]/20 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-[#e3e3e3]/10 rounded w-5/6" />
                        <div className="h-2.5 bg-[#e3e3e3]/10 rounded w-4/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-2.5">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => copyToClipboard(sug, idx)}
                      className="group card-expressive rounded-2xl p-4 hover:border-[#a8c7fa]/50 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-md"
                    >
                      <span className="text-xs text-[#e3e3e3] leading-relaxed break-words font-medium group-hover:text-white">
                        {sug}
                      </span>
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-[#6dd58c] shrink-0 mt-0.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#8e918f] group-hover:text-[#a8c7fa] shrink-0 mt-0.5 transition-colors" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-[#1e1f20] border border-[#e3e3e3]/10 text-center flex flex-col items-center gap-2.5 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#28292a] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#a8c7fa] animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-white">Listening to discussion flow...</span>
                  <span className="text-[11px] text-[#8e918f] max-w-[240px] leading-relaxed">
                    Ensure Closed Captions (CC) are active on your Google Meet screen.
                  </span>
                </div>
              )}
            </section>

            {/* Discussion Risk & Guardrail Flags */}
            {risks.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-[#f2b8b5]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Risk & Guardrail Alerts</span>
                </div>
                <div className="space-y-2">
                  {risks.map((risk, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#3f1d20]/70 border border-[#f2b8b5]/40 text-xs text-[#f2b8b5] leading-relaxed font-semibold shadow-sm"
                    >
                      {risk}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended Next Question */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7fcfff]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Strategic Next Question</span>
                </div>
                <button
                  onClick={() => triggerAction("ASK_NEXT_QUESTION")}
                  disabled={isProcessing}
                  className="text-[11px] text-[#a8c7fa] hover:text-[#d3e3fd] font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Synthesize New</span>
                </button>
              </div>

              {isProcessing && !nextQuestion ? (
                <div className="card-primary-expressive rounded-2xl p-4 animate-pulse flex items-center gap-3 text-xs text-[#d3e3fd]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#a8c7fa] shrink-0" />
                  <span>Analyzing context to formulate strategic question...</span>
                </div>
              ) : nextQuestion ? (
                <div
                  onClick={() => copyToClipboard(nextQuestion)}
                  className="group card-primary-expressive rounded-2xl p-4 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-md hover:border-white/50"
                >
                  <span className="text-xs text-white font-semibold leading-relaxed break-words">
                    {nextQuestion}
                  </span>
                  {copiedQuestion ? (
                    <Check className="w-4 h-4 text-[#6dd58c] shrink-0 mt-0.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#a8c7fa] group-hover:text-white shrink-0 mt-0.5 transition-colors" />
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#1e1f20] border border-[#e3e3e3]/10 text-center text-xs text-[#8e918f] italic">
                  Waiting for sufficient discussion depth...
                </div>
              )}
            </section>

            {/* Late-Join Executive Recap (`#1e1f20`) */}
            <section className="space-y-2.5 pb-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6dd58c]">
                  <History className="w-3.5 h-3.5" />
                  <span>Executive Recap</span>
                </div>
                <button
                  onClick={() => triggerAction("REQUEST_RECAP")}
                  disabled={isProcessing}
                  className="text-[11px] text-[#6dd58c] hover:text-white font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {isProcessing && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Generate Summary</span>
                </button>
              </div>

              {isProcessing && !recap ? (
                <div className="p-4 rounded-2xl bg-[#1e1f20] border border-[#6dd58c]/40 animate-pulse flex items-center gap-3 text-xs text-[#6dd58c]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#6dd58c] shrink-0" />
                  <span>Synthesizing key decisions via fallback pipeline...</span>
                </div>
              ) : recap ? (
                <div className="p-4 rounded-2xl bg-[#1e1f20] border border-[#e3e3e3]/15 text-xs text-[#e3e3e3] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto shadow-inner">
                  {recap}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#1e1f20] border border-[#e3e3e3]/10 text-center text-xs text-[#8e918f] italic">
                  Click Generate Summary for instant executive brief.
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Spoken Transcript Tab */
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#a8c7fa] px-1 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#6dd58c] animate-pulse" />
                <span>Live Spoken Stream</span>
              </div>
              <span className="font-mono text-[10px] text-[#8e918f] lowercase">Auto-scrolling</span>
            </div>

            <div className="flex-1 rounded-3xl bg-[#1e1f20] border border-[#e3e3e3]/10 p-4 overflow-y-auto flex flex-col gap-3 text-xs shadow-inner">
              {transcriptLines.length === 0 ? (
                <div className="m-auto text-center flex flex-col items-center gap-2.5 text-[#8e918f] py-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#28292a] flex items-center justify-center">
                    <Mic className="w-6 h-6 text-[#a8c7fa] animate-pulse" />
                  </div>
                  <span className="font-semibold text-white">0 utterances captured</span>
                  <span className="text-[11px] max-w-[240px] leading-relaxed text-[#8e918f]">
                    Verify Google Meet Captions (CC) are active in your bottom Meet toolbar.
                  </span>
                </div>
              ) : (
                transcriptLines.map((line, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#28292a]/60 border border-[#e3e3e3]/5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0842a0]/50 border border-[#a8c7fa]/30 font-bold text-[#d3e3fd] text-[11px]">
                        {line.speaker}
                      </span>
                      {line.timestamp && (
                        <span className="text-[10px] font-mono text-[#8e918f]">
                          {new Date(line.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-[#e3e3e3] leading-relaxed break-words font-normal pl-1">
                      {line.text}
                    </p>
                  </div>
                ))
              )}
              <div ref={transcriptBottomRef} />
            </div>
          </div>
        )}
      </main>
      </>
      )}

      {/* Material 3 Expressive Footer (`#1e1f20`) */}
      <footer className="px-4 py-3 bg-gradient-to-t from-[#1a1b1c] to-[#1e1f20] border-t border-[#e3e3e3]/10 flex items-center justify-between text-[11px] text-[#8e918f] shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6dd58c]" />
          <span className="font-mono text-xs font-semibold text-[#e3e3e3]">MeetMaxxing v2.5</span>
        </div>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 rounded-xl bg-[#28292a] hover:bg-[#333537] text-[#a8c7fa] hover:text-white font-semibold border border-[#e3e3e3]/10 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <span>Open Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </footer>
    </div>
  );
}
