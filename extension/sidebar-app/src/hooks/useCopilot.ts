import { useState, useEffect } from "react";
import type { TranscriptChunk, CopilotUpdate } from "../types";

declare const chrome: any;

export function useCopilot() {
  const [meetingId, setMeetingId] = useState<string>("");
  const [meetingTitle, setMeetingTitle] = useState<string>("Google Meet Session");
  const [isEnded, setIsEnded] = useState<boolean>(false);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptChunk[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nextQuestion, setNextQuestion] = useState<string>("");
  const [recap, setRecap] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeRequests, setActiveRequests] = useState<number>(0);
  const isProcessing = activeRequests > 0;
  const [poweredBy, setPoweredBy] = useState<string>("OpenRouter API (Priority 1)");
  const [meetingStartTime, setMeetingStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<string>("--:--");

  useEffect(() => {
    const timer = setInterval(() => {
      if (!meetingId || isEnded) {
        setElapsedTime("--:--");
        return;
      }
      const diff = Math.floor((Date.now() - meetingStartTime) / 1000);
      if (diff < 0) return;
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      if (hours > 0) {
        setElapsedTime(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      } else {
        setElapsedTime(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [meetingStartTime, meetingId, isEnded]);

  const handleCopilotUpdate = (data: CopilotUpdate) => {
    if (data.powered_by) setPoweredBy(data.powered_by);
    if (data.error) setErrorMessage(data.error);
    else setErrorMessage("");
    if (data.suggestions && Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
    if (data.next_question) setNextQuestion(data.next_question);
    if (data.recap) setRecap(data.recap);
  };

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
            if (typeof chrome !== "undefined" && chrome.storage?.local) chrome.storage.local.set({ transcript: updated });
            return updated;
          }
        }
      }
      updated = [...prev, { speaker, text, timestamp: now }];
      if (typeof chrome !== "undefined" && chrome.storage?.local) chrome.storage.local.set({ transcript: updated });
      return updated;
    });
  };

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(["transcript", "copilot_state", "currentMeetingId", "currentMeetingTitle", "poweredBy", "meetingStartTime"], (res: any) => {
        if (res.currentMeetingId) setMeetingId(res.currentMeetingId);
        if (res.currentMeetingTitle) setMeetingTitle(res.currentMeetingTitle);
        if (res.transcript && Array.isArray(res.transcript)) setTranscriptLines(res.transcript);
        if (res.poweredBy) setPoweredBy(res.poweredBy);
        if (res.meetingStartTime) setMeetingStartTime(res.meetingStartTime);
        if (res.copilot_state) handleCopilotUpdate(res.copilot_state);
      });
    }

    const messageListener = (msg: any) => {
      if (!msg || !msg.type) return;
      if (msg.type === "LIVE_CAPTION_CHUNK" && msg.chunk) appendTranscriptChunk(msg.chunk);
      else if (msg.type === "COPILOT_UPDATE" && msg.data) handleCopilotUpdate(msg.data);
      else if (msg.type === "MEETING_STARTED") {
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
        if (changes.transcript && Array.isArray(changes.transcript.newValue)) setTranscriptLines(changes.transcript.newValue);
        if (changes.currentMeetingId) {
          if (!changes.currentMeetingId.newValue && changes.currentMeetingId.oldValue) setIsEnded(true);
          else if (changes.currentMeetingId.newValue) {
            setIsEnded(false);
            setMeetingId(changes.currentMeetingId.newValue);
          }
        }
        if (changes.meetingStartTime?.newValue) setMeetingStartTime(changes.meetingStartTime.newValue);
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) chrome.runtime.onMessage.addListener(messageListener);
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) chrome.storage.onChanged.addListener(storageListener);

    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) chrome.runtime.onMessage.removeListener(messageListener);
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const triggerAction = async (actionType: string) => {
    setActiveRequests(prev => prev + 1);
    setErrorMessage("");
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) chrome.runtime.sendMessage({ type: actionType, meetingId }, () => void chrome.runtime?.lastError);
    if (!meetingId) {
      setActiveRequests(prev => Math.max(0, prev - 1));
      return;
    }
    
    try {
      if (actionType === "GENERATE_INSIGHTS") {
        const [realtimeRes, recapRes] = await Promise.all([
          fetch(`http://localhost:8000/ingest/realtime/${meetingId}?force=true`, { method: "POST" }),
          fetch(`http://localhost:8000/recap/${meetingId}`, { method: "GET" })
        ]);
        const realtimeData = await realtimeRes.json();
        const recapData = await recapRes.json();
        handleCopilotUpdate(realtimeData);
        setRecap(recapData.recap || "");
      } else {
        const isRecap = actionType === "REQUEST_RECAP";
        const endpoint = isRecap ? `/recap/${meetingId}` : `/ingest/realtime/${meetingId}?force=true`;
        const response = await fetch(`http://localhost:8000${endpoint}`, { method: isRecap ? "GET" : "POST" });
        const data = await response.json();
        if (isRecap) {
          setRecap(data.recap || "");
        } else {
          handleCopilotUpdate(data);
        }
      }
    } catch (err: any) {
      const msg = `Backend unreachable: ${err.message}. Ensure FastAPI server is on port 8000.`;
      setErrorMessage(msg);
      if (actionType === "ASK_NEXT_QUESTION" || actionType === "GENERATE_INSIGHTS") setNextQuestion(msg);
      if (actionType === "REQUEST_RECAP" || actionType === "GENERATE_INSIGHTS") setRecap(msg);
    } finally {
      setActiveRequests(prev => Math.max(0, prev - 1));
    }
  };

  return {
    meetingId, meetingTitle, isEnded, transcriptLines, suggestions, nextQuestion, recap,
    errorMessage, isProcessing, poweredBy, elapsedTime, triggerAction
  };
}
