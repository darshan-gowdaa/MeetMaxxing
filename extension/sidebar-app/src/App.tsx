import { useState, useEffect } from "react";
import { useCopilot } from "./hooks/useCopilot";
import { Header, Footer, ErrorBanner } from "./components/Layout";
import { IdleState, EndedState } from "./components/States";
import { LiveTranscript, SuggestionAgent, NextQuestionAgent, RecapAgent } from "./components/Agents";
import { ContextAgent } from "./components/ContextAgent";
import "./sidepanel.css";

export default function App() {
  const {
    meetingId, meetingTitle, isEnded, transcriptLines, suggestions,
    nextQuestion, recap, errorMessage, isProcessing, poweredBy,
    elapsedTime, triggerAction, clearTranscript
  } = useCopilot();

  const [activeTab, setActiveTab] = useState<"live" | "transcript" | "rag">(() => {
    return (localStorage.getItem("meetmaxxing_activeTab") as any) || "live";
  });
  
  const [pendingQuery, setPendingQuery] = useState("");

  const [lastInsightsCount, setLastInsightsCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("meetmaxxing_activeTab", activeTab);
  }, [activeTab]);

  const handleGenerateInsights = () => {
    triggerAction("GENERATE_INSIGHTS");
    setLastInsightsCount(transcriptLines.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isProcessing && meetingId && !isEnded && activeTab === "live") {
        handleGenerateInsights();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, meetingId, isEnded, activeTab, transcriptLines.length]);

  const hasNewContext = transcriptLines.length > lastInsightsCount && !isProcessing;

  return (
    <>
      <Header meetingId={meetingId} isEnded={isEnded} elapsedTime={elapsedTime} triggerAction={triggerAction} />
      
      {!meetingId ? (
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
              <button onClick={() => setActiveTab("live")} className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all duration-300 ${activeTab === "live" ? "bg-blue-600/90 text-white shadow-md shadow-blue-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-sparkling-fill mr-1.5"></i>Copilot
              </button>
              <button onClick={() => setActiveTab("rag")} className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all duration-300 ${activeTab === "rag" ? "bg-cyan-600/90 text-white shadow-md shadow-cyan-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-robot-2-fill mr-1.5"></i>IntelliAgent
              </button>
              <button onClick={() => setActiveTab("transcript")} className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all duration-300 ${activeTab === "transcript" ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:scale-95"}`}>
                <i className="ri-chat-voice-fill mr-1.5"></i>Transcript
              </button>
            </div>

            <ErrorBanner errorMessage={errorMessage} poweredBy={poweredBy} isProcessing={isProcessing} triggerAction={triggerAction} />

            {activeTab === "live" && (
              <>
                <button 
                  onClick={handleGenerateInsights} 
                  disabled={isProcessing} 
                  className="md3-btn md3-btn-primary w-full !bg-blue-600/90 !text-white !py-2.5 hover:!bg-blue-500 !mt-1 !mb-1 !rounded-[16px] relative"
                >
                  {hasNewContext && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                  {isProcessing ? <div className="md3-loader !bg-white"></div> : <><i className="ri-sparkling-fill text-[15px]"></i> Generate AI Insights <span className="text-[9px] opacity-70 ml-1">(Ctrl+Enter)</span></>}
                </button>
                
                <SuggestionAgent suggestions={suggestions} isProcessing={isProcessing} />
                <NextQuestionAgent nextQuestion={nextQuestion} isProcessing={isProcessing} onSendToIntelliAgent={(q) => { setActiveTab("rag"); setPendingQuery(q); }} />
                <RecapAgent recap={recap} isProcessing={isProcessing} />
              </>
            )}

            {activeTab === "rag" && (
              <ContextAgent meetingId={meetingId} pendingQuery={pendingQuery} clearPendingQuery={() => setPendingQuery("")} />
            )}

            {activeTab === "transcript" && (
              <LiveTranscript transcriptLines={transcriptLines} onClear={clearTranscript} />
            )}

          </div>
        </main>
      )}

      <Footer meetingId={meetingId} isEnded={isEnded} />
    </>
  );
}