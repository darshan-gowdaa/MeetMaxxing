import { useState, useEffect, useCallback } from 'react';
import { fetchMeeting, updateActionItem, getAuthToken } from '@/lib/api';
import type { Meeting } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

export function useMeetingManager(id: string) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<Meeting["action_items"]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [gmailState, setGmailState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [calendarState, setCalendarState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const loadMeeting = useCallback(() => {
    setLoading(true);
    fetchMeeting(id)
      .then((data: Meeting) => {
        setMeeting(data);
        setActionItems(data.action_items || []);
        setErrorMsg("");
        if (data.email_result?.sent) setGmailState("success");
        if (data.scheduling_result && ["success", "scheduled", "gcal_url_generated"].includes(data.scheduling_result.status))
          setCalendarState("success");
      })
      .catch((err: Error) => {
        setMeeting(null);
        setErrorMsg(err.message || "Failed to fetch meeting from backend");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const timeoutRef = { current: undefined as NodeJS.Timeout | undefined };
    let isMounted = true;
    
    const poll = async () => {
      try {
        const data = await fetchMeeting(id);
        if (!isMounted) return;
        
        setMeeting(data);
        setActionItems(data.action_items || []);
        setErrorMsg("");
        if (data.email_result?.sent) setGmailState("success");
        if (data.scheduling_result && ["success", "scheduled", "gcal_url_generated"].includes(data.scheduling_result.status))
          setCalendarState("success");

        if (data.status === "active" || data.status === "processing") {
          timeoutRef.current = setTimeout(poll, 3000);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setMeeting(null);
        setErrorMsg((err as Error).message || "Failed to fetch meeting from backend");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    setLoading(true);
    poll();
    
    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [id]);

  const toggleItemStatus = async (itemId: string) => {
    const item = actionItems.find((a) => a.id === itemId);
    if (!item) return;
    const next =
      item.status === "open" ? "in_progress" :
      item.status === "in_progress" ? "done" : "open";
    setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: next } : a)));
    try {
      await updateActionItem(itemId, { status: next });
    } catch {
      setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: item.status } : a)));
    }
  };

  const changePriority = async (itemId: string, priority: string) => {
    const item = actionItems.find((a) => a.id === itemId);
    if (!item) return;
    setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, priority } : a)));
    try {
      await updateActionItem(itemId, { priority });
    } catch {
      setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, priority: item.priority } : a)));
    }
  };

  const handleGmail = async () => {
    if (!meeting) return;
    setGmailState("loading");
    try {
      const subject = encodeURIComponent(`[MeetMaxxing] Follow-up: ${meeting.title || "Meeting Summary"}`);
      const actionList = (meeting.action_items || [])
        .map((a, i) => `${i + 1}. ${a.description} (Owner: ${a.owner_name || "Unassigned"})`)
        .join("\n");
      
      let summaryText = meeting.summary || "No summary.";
      if (summaryText.length > 600) {
        summaryText = summaryText.substring(0, 600) + "... (see link for more)";
      }
      
      const bodyStr = `Hi team,\n\nMeeting: ${meeting.title || ""}\n\nSummary:\n${summaryText}\n\n` +
        (actionList ? `Action Items:\n${actionList}\n\n` : "") +
        `Details: ${window.location.href}\n\nBest,\nMeetMaxxing AI Copilot`;
      
      const body = encodeURIComponent(bodyStr.substring(0, 1500)); 
      
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank");
      setGmailState("success");
    } catch { setGmailState("error"); }
  };

  const handleCalendar = async () => {
    if (!meeting) return;
    setCalendarState("loading");
    
    const newWindow = window.open('about:blank', '_blank');
    
    const buildGcalUrl = () => {
      const title = encodeURIComponent(`Follow-up: ${meeting.follow_up?.suggested_topic || meeting.title || "Meeting"}`);
      let detailsText = `Summary:\n${meeting.summary || ""}\n\n` +
        (meeting.action_items?.length ? `Actions:\n${meeting.action_items.map((a, i) => `${i + 1}. ${a.description}`).join("\n")}\n\n` : "") +
        `Dashboard: ${window.location.href}`;
      if (detailsText.length > 1000) detailsText = detailsText.substring(0, 1000) + "...";
      
      const details = encodeURIComponent(detailsText);
      const start = new Date(Date.now() + 86400000); start.setUTCHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 3600000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const add = meeting.attendees?.length ? `&add=${encodeURIComponent(meeting.attendees.join(","))}` : "";
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}${add}`;
    };
    
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/calendar/add-url?meeting_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        try {
          const data = await res.json();
          const url = data.gcal_url || data.html_link;
          if (url) { 
            if (newWindow) newWindow.location.href = url;
            else window.open(url, "_blank");
            setCalendarState("success"); 
            return; 
          }
        } catch {}
      }
    } catch { }
    
    const fallbackUrl = buildGcalUrl();
    if (newWindow) newWindow.location.href = fallbackUrl;
    else window.open(fallbackUrl, "_blank");
    setCalendarState("success");
  };

  const refineTranscript = async () => {
    if (!meeting) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/meeting/${id}/refine_transcript`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeeting(prev => {
          if (!prev) return prev;
          const existing = prev.transcript_data.filter(c => (c as Record<string, unknown>).source !== "refined");
          const refined = data.transcript_data.filter((c: any) => c.source === "refined");
          const newRefined = refined.length > 0 ? refined : data.transcript_data.map((c: any) => ({ ...c, source: "refined" }));
          return { ...prev, transcript_data: [...existing, ...newRefined] };
        });
      } else {
        throw new Error("Failed to refine transcript");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  return {
    meeting,
    loading,
    actionItems,
    errorMsg,
    gmailState,
    calendarState,
    loadMeeting,
    toggleItemStatus,
    changePriority,
    handleGmail,
    handleCalendar,
    refineTranscript
  };
}
