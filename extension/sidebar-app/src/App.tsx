import { useState, useEffect, useRef } from "react";
import {
  RiMicLine as Mic,
  RiChat1Line as MessageSquare,
  RiQuestionLine as HelpCircle,
  RiHistoryLine as History,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
  RiRefreshLine as RefreshCw,
  RiSparklingLine as Sparkles,
  RiFlashlightLine as Zap,
  RiAlertLine as ShieldAlert,
  RiTimeLine as Clock,
  RiExternalLinkLine as ExternalLink
} from "@remixicon/react";
import type { TranscriptChunk, CopilotUpdate } from "./types";

declare const chrome: any;

export default function App() {
  const [meetingId, setMeetingId] = useState<string>("");
  const [meetingTitle, setMeetingTitle] = useState<string>("Google Meet Session");
  const [isTranscriptMaximized, setIsTranscriptMaximized] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);
  
  const [transcriptLines, setTranscriptLines] = useState<TranscriptChunk[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [nextQuestion, setNextQuestion] = useState<string>("");
  const [recap, setRecap] = useState<string>("");
  const [isNextQMaximized, setIsNextQMaximized] = useState<boolean>(true);
  const [isSuggestionsMaximized, setIsSuggestionsMaximized] = useState<boolean>(true);
  const [isRecapMaximized, setIsRecapMaximized] = useState<boolean>(true);
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
        if (res.currentMeetingId) {
          setMeetingId(res.currentMeetingId);
        }
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
            setMeetingId(changes.currentMeetingId.newValue);
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
    if (isTranscriptMaximized) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptLines, isTranscriptMaximized]);

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
    <div className="flex flex-col h-screen bg-[#141518] text-[#ffffff] select-none font-sans overflow-hidden">
      {/* Material 3 Expressive Header Container (`#1e1f20`) */}
      <header className="px-4 pt-4 pb-3.5 bg-gradient-to-b from-[#1e1f20] to-[#1a1b1c] border-b border-[#ffffff]/10 flex flex-col gap-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0] border border-[#a8c7fa]/40 flex items-center justify-center shrink-0 shadow-sm animate-pulse-glow">
              <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse shrink-0" />
                <h1 className="text-sm font-bold text-white truncate tracking-tight">
                  {meetingId ? meetingTitle : "MeetMaxxing AI Copilot"}
                </h1>
              </div>
              <span className="text-[11px] text-[#868e96] font-mono truncate flex items-center gap-1.5">
                <span>Material 3 Expressive</span>
                <span>•</span>
                <span className="text-[#a8c7fa]">AI Copilot</span>
              </span>
            </div>
          </div>
          {meetingId && !isEnded && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1.5 rounded-xl bg-[#27292c] border border-[#ffffff]/10 text-xs font-mono text-[#a8c7fa] flex items-center gap-1.5 shadow-inner">
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
          )}
        </div>

        {/* Expressive Powered By API Chip Badge */}
        {meetingId && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#27292c] border border-[#a8c7fa]/30 shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#0842a0]/60 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-[#fdd663]" />
              </div>
              <div className="flex flex-col min-w-0 overflow-hidden w-full">
                <span className="text-[10px] uppercase font-bold text-[#a8c7fa] tracking-wider leading-tight">
                  Active:
                </span>
                <span 
                  className="text-xs font-semibold text-white whitespace-nowrap overflow-hidden" 
                  dangerouslySetInnerHTML={{ __html: `<marquee scrollamount="2">${poweredBy}</marquee>` }}
                />
              </div>
            </div>
            {!isEnded && (
              <button
                onClick={() => triggerAction("ASK_SUGGESTIONS")}
                disabled={isProcessing}
                title="Force refresh AI insights"
                className="p-2 rounded-xl bg-[#27292c] hover:bg-[#333537] text-[#a8c7fa] border border-[#ffffff]/10 disabled:opacity-50 transition-all shadow-sm shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin text-[#7fcfff]" : ""}`} />
              </button>
            )}
          </div>
        )}
      </header>

      {!meetingId ? (
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#141518]">
          <div className="w-16 h-16 rounded-full bg-[#0842a0]/20 border border-[#a8c7fa]/20 flex items-center justify-center mb-4 shadow-inner">
            <MessageSquare className="w-8 h-8 text-[#a8c7fa]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Meeting</h2>
          <p className="text-sm text-[#868e96] text-center mb-8 max-w-[280px] leading-relaxed">
            Join a Google Meet session and click "Allow & Start" to activate the MeetMaxxing AI Copilot.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[300px]">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="w-full px-4 py-3 rounded-2xl bg-[#0842a0] hover:bg-[#0842a0]/80 border border-[#a8c7fa]/20 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-[#a8c7fa]" />
              Open Dashboard
            </a>
          </div>
        </main>
      ) : isEnded ? (
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#141518]">
          <div className="w-16 h-16 rounded-full bg-[#6dd58c]/10 flex items-center justify-center mb-4 shadow-inner">
            <Check className="w-8 h-8 text-[#6dd58c]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Meeting Completed</h2>
          <p className="text-sm text-[#868e96] text-center mb-8 max-w-[280px] leading-relaxed">
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
            <button className="w-full px-4 py-3 rounded-2xl bg-[#27292c] hover:bg-[#27292c] border border-[#ffffff]/10 text-[#a8c7fa] hover:text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
              <History className="w-4 h-4" />
              Sync to GCalendar
            </button>
            <button className="w-full px-4 py-3 rounded-2xl bg-[#27292c] hover:bg-[#27292c] border border-[#ffffff]/10 text-[#a8c7fa] hover:text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
              <MessageSquare className="w-4 h-4" />
              Send Follow-up (Gmail)
            </button>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="w-full px-4 py-3 rounded-2xl bg-[#27292c] hover:bg-[#333537] border border-[#ffffff]/10 text-[#a8c7fa] hover:text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Dashboard
            </a>
          </div>
        </main>
      ) : (
        <>
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-3.5 space-y-4">
            
            {/* Live Transcription Section */}
            <section className="bg-[#27292c] rounded-2xl border border-[#ffffff]/10 shadow-sm flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between p-3 border-b border-[#ffffff]/5">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsTranscriptMaximized(!isTranscriptMaximized)} className="text-[#a8c7fa] hover:text-[#d3e3fd] p-1 rounded hover:bg-[#0842a0]/40 transition-colors">
                    {isTranscriptMaximized ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                  </button>
                  <Mic className="w-4 h-4 text-[#6dd58c] animate-pulse" />
                  <span className="text-xs font-bold text-[#ffffff] tracking-tight">Live Transcription</span>
                </div>
              </div>
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isTranscriptMaximized ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div>
                  <div className="p-3 max-h-[200px] overflow-y-auto flex flex-col gap-2.5 text-xs">
                    {transcriptLines.length === 0 ? (
                      <div className="text-center text-[#868e96] italic py-4">
                        Enable Captions (CC) on Meet to start live transcription.
                      </div>
                    ) : (
                      transcriptLines.map((line, idx) => (
                        <div key={idx} className="bg-[#1e1f20] p-2 rounded-lg border border-[#ffffff]/5">
                          <span className="font-bold text-[#6dd58c] text-[10px] uppercase tracking-wider block mb-1">
                            {line.speaker}
                          </span>
                          <span className="text-[#e3e3e3] leading-relaxed">{line.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={transcriptBottomRef} />
                  </div>
                </div>
              </div>
              {!isTranscriptMaximized && (
                <div className="p-3 text-xs text-[#ffffff] truncate">
                  {transcriptLines.length > 0 ? (
                    <span className="opacity-90">
                      <strong className="text-[#d3e3fd]">{transcriptLines[transcriptLines.length - 1].speaker}:</strong> {transcriptLines[transcriptLines.length - 1].text}
                    </span>
                  ) : (
                    <span className="text-[#868e96] italic">Listening...</span>
                  )}
                </div>
              )}
            </section>

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

            {/* What to answer Agent */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-[#a8c7fa]">
                  <button onClick={() => setIsSuggestionsMaximized(!isSuggestionsMaximized)} className="text-[#a8c7fa] hover:text-white p-1 rounded hover:bg-[#ffffff]/10 transition-colors">
                    {isSuggestionsMaximized ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                  </button>
                  <MessageSquare className="w-4 h-4" />
                  <span>Realtime Insights</span>
                </div>
                <button
                  onClick={() => triggerAction("ASK_SUGGESTIONS")}
                  disabled={isProcessing}
                  className="text-[10px] text-[#0842a0] hover:text-white bg-[#a8c7fa] hover:bg-[#d3e3fd] font-bold px-2.5 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors pointer-events-auto disabled:pointer-events-none"
                >
                  {isProcessing ? <span className="md3-loading-indicator md3-loading-indicator-sm" style={{borderColor: "transparent", borderTopColor: "currentColor", borderRightColor: "currentColor"}}></span> : null}
                  <span>Suggest</span>
                </button>
              </div>
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isSuggestionsMaximized ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div>
                  <div className="pt-2">
                    {suggestions.length > 0 ? (
                      <div className="space-y-2.5">
                        {suggestions.map((sug, idx) => (
                          <div
                            key={idx}
                            onClick={() => copyToClipboard(sug, idx)}
                            className="p-3 rounded-2xl bg-[#27292c] border-l-[3px] border-l-[#a8c7fa] border-y border-r border-[#ffffff]/10 hover:bg-[#333537] hover:border-[#a8c7fa]/40 cursor-pointer transition-all text-xs text-[#ffffff] leading-relaxed shadow-sm hover:shadow-md"
                          >
                            <div className="flex justify-between items-start">
                              <span>{sug}</span>
                              {copiedIndex === idx ? (
                                <Check className="w-4 h-4 text-[#6dd58c] shrink-0 ml-2" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#868e96] shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#27292c] border border-[#ffffff]/10 text-center text-xs text-[#868e96] italic">
                        Click Suggest to get answers.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Next Question Agent */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-[#7fcfff]">
                  <button onClick={() => setIsNextQMaximized(!isNextQMaximized)} className="text-[#7fcfff] hover:text-white p-1 rounded hover:bg-[#ffffff]/10 transition-colors">
                    {isNextQMaximized ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                  </button>
                  <HelpCircle className="w-4 h-4" />
                  <span>Next Question Agent</span>
                </div>
                  <button
                    onClick={() => triggerAction("ASK_NEXT_QUESTION")}
                    disabled={isProcessing}
                    className="text-[10px] text-[#004a77] hover:text-white bg-[#7fcfff] hover:bg-[#a3dbff] font-bold px-2.5 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors pointer-events-auto disabled:pointer-events-none"
                  >
                    {isProcessing ? <span className="md3-loading-indicator md3-loading-indicator-sm" style={{borderColor: "transparent", borderTopColor: "currentColor", borderRightColor: "currentColor"}}></span> : null}
                    <span>Generate</span>
                  </button>
                </div>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isNextQMaximized ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div>
                    <div className="pt-2">
                      {nextQuestion ? (
                        <div
                          onClick={() => copyToClipboard(nextQuestion)}
                          className="p-3 rounded-2xl bg-[#27292c] border-l-[3px] border-l-[#7fcfff] border-y border-r border-[#ffffff]/10 hover:bg-[#333537] hover:border-[#7fcfff]/40 cursor-pointer transition-all text-xs text-[#ffffff] leading-relaxed shadow-sm hover:shadow-md"
                        >
                          <div className="flex justify-between items-start">
                            <span>{nextQuestion}</span>
                            {copiedQuestion ? (
                              <Check className="w-4 h-4 text-[#6dd58c] shrink-0 ml-2" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#868e96] shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-[#27292c] border border-[#ffffff]/10 text-center text-xs text-[#868e96] italic">
                          Click Generate for a question.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

            {/* Recap Agent */}
            <section className="space-y-2.5 pb-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-[#6dd58c]">
                  <button onClick={() => setIsRecapMaximized(!isRecapMaximized)} className="text-[#6dd58c] hover:text-white p-1 rounded hover:bg-[#ffffff]/10 transition-colors">
                    {isRecapMaximized ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                  </button>
                  <History className="w-4 h-4" />
                  <span>Late-Join Recap</span>
                </div>
                <button
                  onClick={() => triggerAction("REQUEST_RECAP")}
                  disabled={isProcessing}
                  className="text-[10px] text-[#0d3f23] hover:text-white bg-[#6dd58c] hover:bg-[#8eebb0] font-bold px-2.5 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors pointer-events-auto disabled:pointer-events-none"
                >
                  {isProcessing ? <span className="md3-loading-indicator md3-loading-indicator-sm" style={{borderColor: "transparent", borderTopColor: "currentColor", borderRightColor: "currentColor"}}></span> : null}
                  <span>Recap</span>
                </button>
              </div>
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isRecapMaximized ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div>
                  <div className="pt-2">
                    {recap ? (
                      <div className="p-4 rounded-2xl bg-[#27292c] border border-[#6dd58c]/30 text-xs text-[#ffffff] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto shadow-inner">
                        {recap}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#27292c] border border-[#ffffff]/10 text-center text-xs text-[#868e96] italic">
                        Click Recap for an executive brief.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      {/* Material 3 Expressive Footer (`#1e1f20`) */}
      <footer className="px-4 py-3 bg-gradient-to-t from-[#1a1b1c] to-[#1e1f20] border-t border-[#ffffff]/10 flex items-center justify-between text-[11px] text-[#868e96] shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6dd58c]" />
          <span className="font-mono text-xs font-semibold text-[#ffffff]">MeetMaxxing v2.5</span>
        </div>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="px-2 py-0.5 text-[11px] rounded bg-[#27292c] hover:bg-[#333537] text-[#a8c7fa] hover:text-white font-medium border border-[#ffffff]/10 flex items-center gap-1 transition-all shadow-sm"
        >
          <span>Open Dashboard</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}
