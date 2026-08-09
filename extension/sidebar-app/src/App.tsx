import { useState, useEffect, useRef } from "react";
import { useCopilot } from "./hooks/useCopilot";
import { Header, Footer, ErrorBanner } from "./components/Layout";
import { IdleState, EndedState } from "./components/States";
import { LoginPrompt } from "./components/LoginPrompt";
import { LiveTranscript, SuggestionAgent, NextQuestionAgent, RecapAgent } from "./components/Agents";
import { ContextAgent } from "./components/ContextAgent";
import "./sidepanel.css";

export default function App() {
  const {
    authToken, meetingId, meetingTitle, isEnded, transcriptLines, suggestions,
    nextQuestion, recap, errorMessage, isProcessing, poweredBy,
    elapsedTime, triggerAction, clearTranscript
  } = useCopilot();

  const [activeTab, setActiveTab] = useState<"live" | "transcript" | "rag" | "recap">(() => {
    return (localStorage.getItem("meetmaxxing_activeTab") as any) || "live";
  });
  
  const [pendingQuery, setPendingQuery] = useState("");

  const [lastInsightsCount, setLastInsightsCount] = useState(0);

  // Cycling label for generate button during processing
  const INSIGHT_LABELS = [
    "Analyzing context…",
    "Synthesizing insights…",
    "Crafting answers…",
    "Reading transcript…",
    "Generating insights…",
  ];
  const [insightLabelIdx, setInsightLabelIdx] = useState(0);
  const insightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isProcessing) {
      setInsightLabelIdx(0);
      insightIntervalRef.current = setInterval(() => {
        setInsightLabelIdx(prev => (prev + 1) % INSIGHT_LABELS.length);
      }, 1100);
    } else {
      if (insightIntervalRef.current) {
        clearInterval(insightIntervalRef.current);
        insightIntervalRef.current = null;
      }
    }
    return () => {
      if (insightIntervalRef.current) {
        clearInterval(insightIntervalRef.current);
        insightIntervalRef.current = null;
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    localStorage.setItem("meetmaxxing_activeTab", activeTab);
  }, [activeTab]);

  const handleGenerateInsights = () => {
    triggerAction("GENERATE_INSIGHTS");
    setLastInsightsCount(transcriptLines.length);
  };

  const handleGenerateInsightsRef = useRef(handleGenerateInsights);
  useEffect(() => { handleGenerateInsightsRef.current = handleGenerateInsights; }, [handleGenerateInsights]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isProcessing && meetingId && !isEnded && activeTab === "live") {
        handleGenerateInsightsRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, meetingId, isEnded, activeTab]);

  const hasNewContext = transcriptLines.length > lastInsightsCount && !isProcessing;

  return (
    <>
      <Header meetingId={meetingId} isEnded={isEnded} elapsedTime={elapsedTime} triggerAction={triggerAction} />
      
      {!authToken ? (
        <main>
          <LoginPrompt />
        </main>
      ) : !meetingId ? (
        <main>
          <IdleState />
        </main>
      ) : isEnded ? (
        <main>
          <EndedState meetingId={meetingId} meetingTitle={meetingTitle} />
        </main>
      ) : (
        <main>
          <div id="active-state" className="state-container">
            
            <div className="flex bg-zinc-900/60 p-1.5 rounded-full border border-zinc-800/50 shrink-0 sticky top-0 z-10 backdrop-blur-xl mb-3 shadow-sm">
              <button onClick={() => setActiveTab("live")} className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all duration-300 ${activeTab === "live" ? "bg-blue-600/90 text-white shadow-md shadow-blue-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-sparkling-fill mr-1"></i>Copilot
              </button>
              <button onClick={() => setActiveTab("rag")} className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all duration-300 ${activeTab === "rag" ? "bg-cyan-600/90 text-white shadow-md shadow-cyan-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-robot-2-fill mr-1"></i>Chat
              </button>
              <button onClick={() => setActiveTab("recap")} className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all duration-300 ${activeTab === "recap" ? "bg-emerald-600/90 text-white shadow-md shadow-emerald-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-article-fill mr-1"></i>Recap
              </button>
              <button onClick={() => setActiveTab("transcript")} className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all duration-300 ${activeTab === "transcript" ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-chat-voice-fill mr-1"></i>Feed
              </button>
            </div>

            <ErrorBanner errorMessage={errorMessage} poweredBy={poweredBy} isProcessing={isProcessing} triggerAction={triggerAction} />

            <div className={activeTab === "live" ? "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 pb-2" : "hidden"}>
                <button 
                  onClick={handleGenerateInsights} 
                  disabled={isProcessing} 
                  className="md3-btn md3-btn-primary w-full !bg-blue-600/90 !text-white !py-2.5 hover:!bg-blue-500 !mt-1 !mb-1 !rounded-[16px] relative overflow-hidden"
                >
                  {hasNewContext && !isProcessing && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="md3-loading-indicator md3-loading-indicator-sm text-white"></div>
                      <span className="transition-all duration-500">{INSIGHT_LABELS[insightLabelIdx]}</span>
                    </span>
                  ) : (
                    <><i className="ri-sparkling-line text-[15px]"></i> Generate AI Insights <span className="text-[9px] opacity-70 ml-1">(Ctrl+Enter)</span></>
                  )}
                </button>
                
                <SuggestionAgent suggestions={suggestions} isProcessing={isProcessing} />
                <NextQuestionAgent nextQuestion={nextQuestion} isProcessing={isProcessing} onSendToIntelliAgent={(q) => { setActiveTab("rag"); setPendingQuery(q); }} />
            </div>

            <div className={activeTab === "rag" ? "flex flex-col flex-1 min-h-0" : "hidden"}>
              <ContextAgent meetingId={meetingId} authToken={authToken} pendingQuery={pendingQuery} clearPendingQuery={() => setPendingQuery("")} />
            </div>
            
            <div className={activeTab === "recap" ? "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 pb-2" : "hidden"}>
                <button 
                    onClick={handleGenerateInsights} 
                    disabled={isProcessing} 
                    className="md3-btn md3-btn-primary w-full !bg-blue-600/90 !text-white !py-2.5 hover:!bg-blue-500 !mt-1 !mb-1 !rounded-[16px] relative overflow-hidden"
                  >
                    {hasNewContext && !isProcessing && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                    {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="md3-loading-indicator md3-loading-indicator-sm text-white"></div>
                      <span className="transition-all duration-500">{INSIGHT_LABELS[insightLabelIdx]}</span>
                    </span>
                    ) : (
                      <><i className="ri-sparkling-line text-[15px]"></i> Generate AI Insights <span className="text-[9px] opacity-70 ml-1">(Ctrl+Enter)</span></>
                    )}
                  </button>
              <RecapAgent recap={recap} isProcessing={isProcessing} />
            </div>

            <div className={activeTab === "transcript" ? "flex flex-col flex-1 min-h-0" : "hidden"}>
              <LiveTranscript transcriptLines={transcriptLines} onClear={clearTranscript} />
            </div>

          </div>
        </main>
      )}

      <Footer meetingId={meetingId} isEnded={isEnded} />
    </>
  );
}