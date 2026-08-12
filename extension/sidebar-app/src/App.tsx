import { useState, useEffect, useRef } from "react";
import { useCopilot } from "./hooks/useCopilot";
import { Header, Footer, ErrorBanner } from "./components/skeleton/Layout";
import { IdleState, EndedState } from "./components/skeleton/States";
import { LoginPrompt } from "./components/skeleton/LoginPrompt";
import { LiveTranscript } from "./components/organisms/LiveTranscript";
import { SuggestionAgent } from "./components/organisms/SuggestionAgent";
import { NextQuestionAgent } from "./components/organisms/NextQuestionAgent";
import { RecapAgent } from "./components/organisms/RecapAgent";
import { ContextAgent } from "./components/organisms/ContextAgent";

const INSIGHT_LABELS = [
  "Analyzing context…",
  "Synthesizing insights…",
  "Crafting answers…",
  "Reading transcript…",
  "Generating insights…",
];

export default function App() {
  const {
    authToken, meetingId, meetingTitle, isEnded, transcriptLines, suggestions,
    nextQuestions, recap, errorMessage, isProcessing, elapsedTime,
    triggerAction, clearTranscript, clearError,
  } = useCopilot();

  const [activeTab, setActiveTab] = useState<"live" | "transcript" | "rag" | "recap">(() =>
    (localStorage.getItem("meetmaxxing_activeTab") as any) || "live"
  );
  const [pendingQuery, setPendingQuery] = useState("");
  const [lastInsightsCount, setLastInsightsCount] = useState(0);
  const [insightLabelIdx, setInsightLabelIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isProcessing) {
      setInsightLabelIdx(0);
      intervalRef.current = setInterval(() => setInsightLabelIdx((p) => (p + 1) % INSIGHT_LABELS.length), 1100);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isProcessing]);

  useEffect(() => { localStorage.setItem("meetmaxxing_activeTab", activeTab); }, [activeTab]);

  const handleRef = useRef(() => {});
  const handleGenerateInsights = () => { triggerAction("GENERATE_INSIGHTS"); setLastInsightsCount(transcriptLines.length); };
  useEffect(() => { handleRef.current = handleGenerateInsights; }, [handleGenerateInsights]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isProcessing && meetingId && !isEnded && activeTab === "live")
        handleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProcessing, meetingId, isEnded, activeTab]);

  const hasNewContext = transcriptLines.length > lastInsightsCount && !isProcessing;

  const GenerateButton = () => (
    <button
      onClick={handleGenerateInsights}
      disabled={isProcessing}
      className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-bold py-3 rounded-full shadow hover:shadow-md transition-all duration-300 mt-1 mb-2 relative overflow-hidden group"
    >
      {hasNewContext && !isProcessing && <span className="absolute top-2 right-2 w-2 h-2 bg-risk rounded-full animate-pulse" />}
      {isProcessing ? (
        <span className="flex items-center gap-2">
          <div className="md3-loading-indicator md3-loading-indicator-sm text-on-primary" />
          <span className="transition-all duration-500">{INSIGHT_LABELS[insightLabelIdx]}</span>
        </span>
      ) : (
        <><i className="ri-sparkling-fill text-[15px] group-hover:animate-pulse" /> Generate AI Insights <span className="text-[9px] opacity-70 ml-1">(Ctrl+Enter)</span></>
      )}
    </button>
  );

  const tabBtn = (tab: typeof activeTab, icon: string, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${activeTab === tab ? "bg-primary-container text-on-primary-container shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-container-high active:opacity-80"}`}
    >
      <i className={`${icon} mr-1`} />{label}
    </button>
  );

  return (
    <>
      <Header meetingId={meetingId} isEnded={isEnded} elapsedTime={elapsedTime} triggerAction={triggerAction} />
      {!authToken ? (
        <main><LoginPrompt /></main>
      ) : !meetingId ? (
        <main><IdleState /></main>
      ) : isEnded ? (
        <main><EndedState meetingId={meetingId} meetingTitle={meetingTitle} /></main>
      ) : (
        <main>
          <div id="active-state" className="state-container">
            <div className="flex bg-surface-container p-1.5 rounded-full border border-border shrink-0 sticky top-0 z-10 mb-3 shadow-sm">
              {tabBtn("live", "ri-sparkling-fill", "Copilot")}
              {tabBtn("rag", "ri-robot-2-fill", "Chat")}
              {tabBtn("recap", "ri-article-fill", "Recap")}
              {tabBtn("transcript", "ri-chat-voice-fill", "Feed")}
            </div>
            <ErrorBanner errorMessage={errorMessage} clearError={clearError} />
            <div className={activeTab === "live" ? "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 pb-2" : "hidden"}>
              <GenerateButton />
              <SuggestionAgent suggestions={suggestions} isProcessing={isProcessing} />
              <NextQuestionAgent nextQuestions={nextQuestions} isProcessing={isProcessing} onSendToIntelliAgent={(q) => { setActiveTab("rag"); setPendingQuery(q); }} />
            </div>
            <div className={activeTab === "rag" ? "flex flex-col flex-1 min-h-0" : "hidden"}>
              <ContextAgent meetingId={meetingId} authToken={authToken} pendingQuery={pendingQuery} clearPendingQuery={() => setPendingQuery("")} />
            </div>
            <div className={activeTab === "recap" ? "flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 pb-2" : "hidden"}>
              <GenerateButton />
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