// @ts-nocheck
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
import "./sidepanel.css";

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
  
  const [meetingStartTime, setMeetingStartTime] = useState<number>(Date.now());
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - meetingStartTime) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsedTime(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [meetingStartTime]);

  // Chrome Extension message listener
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["transcript", "copilot_state", "currentMeetingId", "currentMeetingTitle", "poweredBy", "meetingStartTime"], (res: any) => {
        if (res.currentMeetingId) {
          setMeetingId(res.currentMeetingId);
        }
        if (res.currentMeetingTitle) setMeetingTitle(res.currentMeetingTitle);
        if (res.transcript && Array.isArray(res.transcript)) setTranscriptLines(res.transcript);
        if (res.poweredBy) setPoweredBy(res.poweredBy);
        if (res.meetingStartTime) setMeetingStartTime(res.meetingStartTime);
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
        if (msg.startTime) setMeetingStartTime(msg.startTime);
        
        if (!msg.reused) {
          setTranscriptLines([]);
          setSuggestions([]);
          setNextQuestion("");
          setRecap("");
        }
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
        if (changes.meetingStartTime && changes.meetingStartTime.newValue) {
          setMeetingStartTime(changes.meetingStartTime.newValue);
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
        <>
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon"><i className="ri-sparkling-2-fill"></i></span>
            <span>MeetMaxxing</span>
          </div>
          <div id="status-badge" className={`badge ${meetingId && !isEnded ? 'badge-live' : 'badge-idle'}`}>
            <span className="badge-dot"></span>
            <span className="badge-label">{meetingId && !isEnded ? 'Live' : 'Idle'}</span>
          </div>
        </div>
        <div className="header-right">
          <div id="timer" className="timer">{elapsedTime}</div>
          {meetingId && !isEnded && (
            <button
              id="end-meeting-top-btn"
              className="btn btn-sm btn-danger"
              title="End Meeting & Process Summary"
              onClick={() => triggerAction("REQUEST_END_MEETING")}
            >
              <i className="ri-stop-fill"></i>
              Stop
            </button>
          )}
        </div>
      </header>

      {!meetingId ? (
        <main>
          <div id="idle-state" className="state-container">
            <div className="idle-state">
              <div className="idle-icon">
                <i className="ri-vidicon-line"></i>
              </div>
              <p className="idle-title">Not in a Meeting</p>
              <p className="idle-text">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
              <div className="idle-steps">
                <div className="idle-step">
                  <span className="step-num">1</span>
                  <span>Open Google Meet</span>
                </div>
                <div className="idle-step">
                  <span className="step-num">2</span>
                  <span>Enable Captions (CC)</span>
                </div>
                <div className="idle-step">
                  <span className="step-num">3</span>
                  <span>Copilot activates auto</span>
                </div>
              </div>
              
              <div style={{ marginTop: "24px" }}>
                <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-full" style={{ textDecoration: 'none' }}>
                  <i className="ri-layout-masonry-line"></i>
                  Open Dashboard
                </a>
              </div>
            </div>
          </div>
        </main>
      ) : isEnded ? (
        <main>
          <div id="ended-state" className="state-container">
            <div className="ended-card">
              <div className="ended-success-ring">
                <div className="ended-icon-wrap">
                  <i className="ri-checkbox-circle-fill"></i>
                </div>
              </div>
              <h2 className="ended-title">Meeting Complete</h2>
              <p className="ended-sub">AI has processed your transcript and generated a full intelligence report.</p>
              
              <div className="ended-stats" style={{ marginTop: '12px' }}>
                <div className="ended-stat">
                  <i className="ri-chat-1-line"></i>
                  <span>{transcriptLines.length}</span>
                  <span className="stat-label">Lines</span>
                </div>
                <div className="ended-stat-divider"></div>
                <div className="ended-stat">
                  <i className="ri-flashlight-line"></i>
                  <span>AI</span>
                  <span className="stat-label">Powered</span>
                </div>
                <div className="ended-stat-divider"></div>
                <div className="ended-stat">
                  <i className="ri-shield-check-line"></i>
                  <span>Safe</span>
                  <span className="stat-label">Guardrail</span>
                </div>
              </div>

              <div className="ended-cta" style={{ marginTop: '16px' }}>
                <a href={`http://localhost:3000/meetings/${meetingId}`} target="_blank" rel="noreferrer" className="btn btn-cta btn-full" style={{ textDecoration: 'none' }}>
                  <i className="ri-layout-masonry-fill"></i>
                  Open Dashboard
                  <i className="ri-arrow-right-line btn-arrow"></i>
                </a>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main>
          <div id="active-state" className="state-container">
            {/* Live Transcription Section */}
            <div className="section md3-card" id="live-transcript-section">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsTranscriptMaximized(!isTranscriptMaximized)} className="btn btn-ghost btn-sm" style={{ color: "var(--primary)", padding: "2px 4px" }}>
                  <i className={isTranscriptMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title">
                  <i className="ri-chat-voice-fill" style={{ color: "var(--primary)" }}></i>
                  Live Transcription
                  <span className="count-pill">{transcriptLines.length}</span>
                </h3>
              </div>
              <div className={`smooth-collapse ${isTranscriptMaximized ? '' : 'collapsed'}`}>
                <div className="transcript-feed-box" style={{ maxHeight: isTranscriptMaximized ? '200px' : '40px' }}>
                  {transcriptLines.length === 0 ? (
                    <p className="empty-text">Enable Captions (CC) — live speech will appear here</p>
                  ) : (
                    transcriptLines.map((line, idx) => (
                      <div key={idx} className="transcript-line">
                        <span className="transcript-speaker">
                          <div className="transcript-speaker-avatar">{line.speaker.charAt(0)}</div>
                          {line.speaker}
                        </span>
                        <span className="transcript-text">{line.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={transcriptBottomRef} />
                </div>
              </div>
            </div>

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
            <div id="suggestions-section" className="section md3-card">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsSuggestionsMaximized(!isSuggestionsMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#a8c7fa", padding: "2px 4px" }}>
                  <i className={isSuggestionsMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title" style={{ flex: 1 }}>
                  <i className="ri-sparkling-fill" style={{ color: "#a8c7fa" }}></i>
                  "What to answer" Agent
                </h3>
                <button 
                  onClick={() => triggerAction("ASK_SUGGESTIONS")}
                  disabled={isProcessing}
                  className="btn btn-primary btn-sm"
                >
                  <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Suggest
                </button>
              </div>
              <div className={`smooth-collapse ${isSuggestionsMaximized ? '' : 'collapsed'}`}>
                <div id="suggestions-list" className="content-box">
                  {suggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {suggestions.map((sug, idx) => (
                        <div key={idx} className="suggestion-card new" onClick={() => copyToClipboard(sug, idx)}>
                          {sug}
                          {copiedIndex === idx && <i className="ri-check-line" style={{ color: 'var(--success)', float: 'right' }}></i>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">Click Suggest when ready for AI insights</p>
                  )}
                </div>
              </div>
            </div>

            {/* Suggestion of what to Ask */}
            <div id="next-question-section" className={`section md3-card smooth-collapse`} style={{ border: "none", padding: 0, marginBottom: 0 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px", marginBottom: "12px", background: "var(--surface)" }}>
                <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                  <button onClick={() => setIsNextQMaximized(!isNextQMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#7fcfff", padding: "2px 4px" }}>
                    <i className={isNextQMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                  </button>
                  <h3 className="section-title next-q-title" style={{ flex: 1 }}>
                    <i className="ri-question-answer-fill" style={{ color: "#7fcfff" }}></i>
                    "Suggestion of what to Ask"
                  </h3>
                  <button 
                    onClick={() => triggerAction("ASK_NEXT_QUESTION")}
                    disabled={isProcessing}
                    className="btn btn-secondary btn-sm" style={{ background: "rgba(127, 207, 255, 0.1)", color: "#7fcfff" }}
                  >
                    <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Generate
                  </button>
                </div>
                <div className={`smooth-collapse ${isNextQMaximized ? '' : 'collapsed'}`}>
                  {nextQuestion ? (
                    <div className="next-question-card content-box" onClick={() => copyToClipboard(nextQuestion)} style={{ cursor: 'pointer' }}>
                      {nextQuestion}
                      {copiedQuestion && <i className="ri-check-line" style={{ color: 'var(--success)', float: 'right' }}></i>}
                    </div>
                  ) : (
                    <div className="next-question-card content-box" style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      Click Generate to formulate a question.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recap Agent */}
            <div className="section md3-card" id="recap-section">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsRecapMaximized(!isRecapMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#6dd58c", padding: "2px 4px" }}>
                  <i className={isRecapMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title" style={{ flex: 1 }}>
                  <i className="ri-file-list-3-fill" style={{ color: "#6dd58c" }}></i>
                  "Recap Agent"
                </h3>
                <button 
                  onClick={() => triggerAction("REQUEST_RECAP")}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm" style={{ background: "rgba(109, 213, 140, 0.1)", color: "#6dd58c" }}
                >
                  <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Recap
                </button>
              </div>
              <div className={`smooth-collapse ${isRecapMaximized ? '' : 'collapsed'}`}>
                {recap ? (
                  <div className="recap-box content-box" style={{ whiteSpace: 'pre-wrap' }}>{recap}</div>
                ) : (
                  <div className="recap-box content-box" style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Click Recap for an executive summary.</div>
                )}
              </div>
            </div>
          </div>
          </main>
      )}

      {meetingId && !isEnded && (
        <footer className="footer" id="active-footer">
          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-full" style={{ textDecoration: 'none' }}>
            <i className="ri-layout-masonry-line"></i>
            Open Dashboard
          </a>
        </footer>
      )}
    </>
  );
}