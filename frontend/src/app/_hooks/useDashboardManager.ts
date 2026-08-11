import { useState, useEffect, useMemo } from 'react';
import { fetchMeetings, deleteMeeting, updateMeeting } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Meeting } from '@/types';

export function useDashboardManager() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "duration">("date");

  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const { session, loading: authLoading } = useAuth();

  const load = () => {
    setLoading(true);
    fetchMeetings()
      .then((data) => {
        const list: Meeting[] = Array.isArray(data) ? data : data.meetings || [];
        setMeetings(list);
      })
      .catch((err) => setError(err.message || "Failed to load meetings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    load();
  }, [authLoading, session]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return meetings
      .filter((m) => !q || m.title?.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "duration") {
          const dA = a.end_at && a.start_at ? new Date(a.end_at).getTime() - new Date(a.start_at).getTime() : 0;
          const dB = b.end_at && b.start_at ? new Date(b.end_at).getTime() - new Date(b.start_at).getTime() : 0;
          return dB - dA;
        }
        return new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime();
      });
  }, [search, sortBy, meetings]);

  const handleMultiDelete = async (selectedMeetings: Meeting[]) => {
    try {
      const results = await Promise.allSettled(selectedMeetings.map(m => deleteMeeting(m.id)));
      const succeededIds = selectedMeetings.filter((_, i) => results[i].status === 'fulfilled').map(m => m.id);
      setMeetings(prev => prev.filter(m => !succeededIds.includes(m.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteMeeting(deleteTarget.id);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
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
      setMeetings((prev) =>
        prev.map((m) => (m.id === editTarget.id ? { ...m, title } : m))
      );
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
    load,
    handleMultiDelete,
    handleDelete,
    handleEdit,
    totalMinutes,
    formatTime,
  };
}
