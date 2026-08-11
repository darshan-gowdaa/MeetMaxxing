import { useState, useEffect, useMemo } from 'react';
import { getAuthToken } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

export type ContextFile = {
  meeting_id: string;
  filename: string;
  chunks: number;
  date: string;
};

export function useContextManager() {
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | "name">("date");

  // Dialogs
  const [deleteTarget, setDeleteTarget] = useState<ContextFile | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [editTarget, setEditTarget] = useState<ContextFile | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [viewTarget, setViewTarget] = useState<ContextFile | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/context/files`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.files || [];
        setFiles(list);
      } else {
        setError("Failed to load files.");
      }
    } catch (e) {
      console.error("API error:", e instanceof Error ? e.message : String(e));
      setError("Network error loading files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = [...files];

    const q = search.toLowerCase();
    if (q) {
      result = result.filter(f => f.filename.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.filename.localeCompare(b.filename);
      } else if (sortBy === "size") {
        return b.chunks - a.chunks;
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return result;
  }, [search, sortBy, files]);

  const handleMultiDelete = async (selectedFiles: ContextFile[]) => {
    try {
      const token = await getAuthToken();
      const promises = selectedFiles.map(file =>
        fetch(`${BACKEND_URL}/context/clear_file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ meeting_id: file.meeting_id, filename: file.filename })
        })
      );
      const results = await Promise.allSettled(promises);
      const successfulFiles = selectedFiles.filter((_, i) => {
        const res = results[i];
        return res.status === "fulfilled" && res.value?.ok;
      });
      const failedCount = selectedFiles.length - successfulFiles.length;

      const toDelete = new Set(successfulFiles.map(f => `${f.meeting_id}-${f.filename}`));
      setFiles(prev => prev.filter(f => !toDelete.has(`${f.meeting_id}-${f.filename}`)));

      if (failedCount > 0) {
        showToast(`${failedCount} file(s) could not be deleted`, "error");
      } else {
        showToast(`Deleted ${successfulFiles.length} file(s)`);
      }
    } catch (e) {
      showToast("Delete failed", "error");
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/context/clear_file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ meeting_id: deleteTarget.meeting_id, filename: deleteTarget.filename })
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => !(f.meeting_id === deleteTarget.meeting_id && f.filename === deleteTarget.filename)));
        showToast(`Deleted "${deleteTarget.filename}"`);
      } else {
        showToast("Failed to delete file", "error");
      }
    } catch (e) {
      showToast("Delete failed", "error");
      console.error(e);
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = async (newFilename: string) => {
    if (!editTarget) return;
    setEditBusy(true);
    setEditError("");

    let finalName = newFilename;
    const oldExt = editTarget.filename.includes('.') ? editTarget.filename.split('.').pop() : null;
    if (oldExt && !finalName.endsWith(`.${oldExt}`)) {
      finalName = `${finalName}.${oldExt}`;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/context/rename_file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          meeting_id: editTarget.meeting_id,
          old_filename: editTarget.filename,
          new_filename: finalName
        })
      });
      if (res.ok) {
        await load();
        setEditTarget(null);
        showToast(`Renamed to "${finalName}"`);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.detail || `Rename failed (${res.status})`;
        setEditError(msg);
        showToast(msg, "error");
      }
    } catch (e) {
      const msg = "Network error during rename";
      setEditError(msg);
      showToast(msg, "error");
      console.error(e);
    } finally {
      setEditBusy(false);
    }
  };

  const handleUpload = async (uploadFiles: File[]) => {
    setUploadBusy(true);
    try {
      const token = await getAuthToken();
      const uploadPromises = uploadFiles.map(file => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("meeting_id", "global");
        return fetch(`${BACKEND_URL}/context/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });
      });

      const results = await Promise.all(uploadPromises);
      const failed = results.filter(r => !r.ok);
      await load();
      if (failed.length > 0) {
        showToast(`${failed.length} file(s) failed to upload`, "error");
      } else {
        showToast(`${uploadFiles.length} file(s) uploaded successfully`);
        setShowUpload(false);
      }
    } catch (e) {
      showToast("Upload failed", "error");
      console.error(e);
    } finally {
      setUploadBusy(false);
    }
  };

  const totalSizeKB = files.reduce((acc, f) => acc + (f.chunks * 1.2), 0);

  return {
    files,
    filtered,
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
    editError,
    showUpload,
    setShowUpload,
    uploadBusy,
    viewTarget,
    setViewTarget,
    toast,
    load,
    handleMultiDelete,
    handleDelete,
    handleEdit,
    handleUpload,
    totalSizeKB,
  };
}
