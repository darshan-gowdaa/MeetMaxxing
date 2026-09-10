import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchMeetings, deleteMeeting, updateMeeting } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import type { Meeting } from "@/types";

const MEETINGS_CACHE_KEY = "meetmaxxing_cached_meetings";

function getCachedMeetings(): Meeting[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEETINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function setCachedMeetings(meetings: Meeting[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEETINGS_CACHE_KEY, JSON.stringify(meetings));
  } catch {}
}

export function useDashboardManager() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { showMessage } = useSnackbar();

  // Instant optimistic render from cache if available
  const [meetings, setMeetings] = useState<Meeting[]>(() => getCachedMeetings() || []);
  const [loading, setLoading] = useState<boolean>(() => !getCachedMeetings());
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "duration">("date");

  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback((token?: string) => {
    // Only show loading skeletons if we don't have any cached data already showing
    if (meetings.length === 0) {
      setLoading(true);
    }
    fetchMeetings(token)
      .then((data) => {
        const list: Meeting[] = Array.isArray(data)
          ? data
          : data && "meetings" in data && Array.isArray(data.meetings)
          ? data.meetings
          : [];
        setMeetings(list);
        setCachedMeetings(list);
        setError("");
      })
      .catch((err) => {
        // If we already have cached data showing, don't flash an error screen on transient network glitches
        if (meetings.length === 0) {
          setError(err.message || "Failed to load meetings");
        }
      })
      .finally(() => setLoading(false));
  }, [meetings.length]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setLoading(false);
      router.push("/login");
      return;
    }
    load(session.access_token);
  }, [authLoading, session, load, router]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return meetings
      .filter((m) => !q || m.title?.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "duration") {
          const tEndA = a.end_at ? new Date(a.end_at).getTime() : 0;
          const tStartA = a.start_at ? new Date(a.start_at).getTime() : 0;
          const dA = Number.isFinite(tEndA) && Number.isFinite(tStartA) && tEndA > tStartA ? tEndA - tStartA : 0;

          const tEndB = b.end_at ? new Date(b.end_at).getTime() : 0;
          const tStartB = b.start_at ? new Date(b.start_at).getTime() : 0;
          const dB = Number.isFinite(tEndB) && Number.isFinite(tStartB) && tEndB > tStartB ? tEndB - tStartB : 0;

          return dB - dA;
        }
        const timeB = b.start_at ? new Date(b.start_at).getTime() : 0;
        const timeA = a.start_at ? new Date(a.start_at).getTime() : 0;
        return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
      });
  }, [search, sortBy, meetings]);

  const handleMultiDelete = async (selectedMeetings: Meeting[]) => {
    try {
      const results = await Promise.allSettled(selectedMeetings.map(m => deleteMeeting(m.id)));
      const succeededIds = selectedMeetings.filter((_, i) => results[i].status === 'fulfilled').map(m => m.id);
      setMeetings(prev => {
        const next = prev.filter(m => !succeededIds.includes(m.id));
        setCachedMeetings(next);
        return next;
      });
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        showMessage(`Deleted ${succeededIds.length} meeting(s) · ${failedCount} failed`, { variant: failedCount === selectedMeetings.length ? "error" : "default" });
      } else if (succeededIds.length > 0) {
        showMessage(`Deleted ${succeededIds.length} meeting${succeededIds.length > 1 ? "s" : ""}`, { variant: "success" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteMeeting(deleteTarget.id);
      setMeetings((prev) => {
        const next = prev.filter((m) => m.id !== deleteTarget.id);
        setCachedMeetings(next);
        return next;
      });
      showMessage(`Deleted "${deleteTarget.title || "meeting"}"`, { variant: "success" });
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to delete meeting");
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = async (title: string) => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      await updateMeeting(editTarget.id, { title });
      setMeetings((prev) => {
        const next = prev.map((m) => (m.id === editTarget.id ? { ...m, title } : m));
        setCachedMeetings(next);
        return next;
      });
      showMessage("Meeting renamed", { variant: "success" });
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to update meeting");
    } finally {
      setEditBusy(false);
      setEditTarget(null);
    }
  };

  const totalMinutes = meetings.reduce((acc, m) => {
    if (!m.start_at || !m.end_at) return acc;
    const start = new Date(m.start_at).getTime();
    const end = new Date(m.end_at).getTime();
    if (isNaN(start) || isNaN(end)) return acc;
    return acc + (end - start) / 60000;
  }, 0);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m}m`;
  };

  return {
    meetings,
    loading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    editTarget,
    setEditTarget,
    editBusy,
    filtered,
    load: () => load(session?.access_token),
    handleMultiDelete,
    handleDelete,
    handleEdit,
    totalMinutes,
    formatTime,
  };
}
