"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  RiFolderOpenFill, RiDeleteBinLine, RiRefreshLine, 
  RiUploadCloud2Line, RiSearchLine, RiCloseLine, RiEditLine,
  RiFilePdfLine, RiFileWordLine, RiFileTextLine, RiEyeLine, RiFileLine, RiCheckLine, RiMoreLine,
  RiArrowDropDownLine
} from "@remixicon/react";

import DeleteDialog from "@/components/DeleteDialog";
import EditDialog from "@/components/EditDialog";
import UploadDialog from "@/components/UploadDialog";
import ViewContentDialog from "@/components/ViewContentDialog";
import AnimatedNumber from "@/components/AnimatedNumber";
import { SelectableGrid } from "@/components/SelectableGrid";
import ContextCard from "@/components/ContextCard";
import { GridSkeleton } from "@/components/skeletons";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type ContextFile = {
  meeting_id: string;
  filename: string;
  chunks: number;
  date: string;
};

export default function ContextManagerPage() {
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
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  
  const [viewTarget, setViewTarget] = useState<ContextFile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/context/files`, {
        headers: { "Authorization": "Bearer dev_token" }
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
    // eslint-disable-next-line
    load();
  }, []);

  // Filter and Sort
  const filtered = useMemo(() => {
    let result = [...files];
    
    // Search
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(f => f.filename.toLowerCase().includes(q));
    }
    
    // Sort
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.filename.localeCompare(b.filename);
      } else if (sortBy === "size") {
        return b.chunks - a.chunks;
      } else {
        // Date (assuming YYYY-MM-DD string)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
    
    return result;
  }, [search, sortBy, files]);

  // Handlers
  const handleMultiDelete = async (selectedFiles: ContextFile[]) => {
    try {
      const promises = selectedFiles.map(file => 
        fetch(`${BACKEND_URL}/context/clear_file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer dev_token"
          },
          body: JSON.stringify({ meeting_id: file.meeting_id, filename: file.filename })
        })
      );
      await Promise.all(promises);
      
      const toDelete = new Set(selectedFiles.map(f => `${f.meeting_id}-${f.filename}`));
      setFiles(prev => prev.filter(f => !toDelete.has(`${f.meeting_id}-${f.filename}`)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/context/clear_file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dev_token"
        },
        body: JSON.stringify({ meeting_id: deleteTarget.meeting_id, filename: deleteTarget.filename })
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => !(f.meeting_id === deleteTarget.meeting_id && f.filename === deleteTarget.filename)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = async (newFilename: string) => {
    if (!editTarget) return;
    setEditBusy(true);
    
    // append extension if missing to match original
    let finalName = newFilename;
    const oldExt = editTarget.filename.split('.').pop();
    if (oldExt && !finalName.endsWith(`.${oldExt}`)) {
      finalName = `${finalName}.${oldExt}`;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/context/rename_file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dev_token"
        },
        body: JSON.stringify({ 
          meeting_id: editTarget.meeting_id, 
          old_filename: editTarget.filename,
          new_filename: finalName 
        })
      });
      if (res.ok) {
        setFiles(prev => prev.map(f => 
          (f.meeting_id === editTarget.meeting_id && f.filename === editTarget.filename) 
            ? { ...f, filename: finalName } 
            : f
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditBusy(false);
      setEditTarget(null);
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploadBusy(true);
    try {
      const uploadPromises = files.map(file => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("meeting_id", "global");
        return fetch(`${BACKEND_URL}/context/upload`, {
          method: "POST",
          headers: { "Authorization": "Bearer dev_token" },
          body: formData
        });
      });
      
      await Promise.all(uploadPromises);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUploadBusy(false);
      setShowUpload(false);
    }
  };

  const totalSizeKB = files.reduce((acc, f) => acc + (f.chunks * 1.2), 0);
  
  const getFileIcon = (filename: string, className: string = "w-5 h-5 text-primary") => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <RiFilePdfLine className={`w-5 h-5 text-red-500`} />;
    if (ext === 'docx') return <RiFileWordLine className={`w-5 h-5 text-blue-500`} />;
    return <RiFileTextLine className={className} />;
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        {/* Hero Section */}
        <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 md:p-10">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
               style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
               style={{ background: "radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)" }} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest">
                <RiFolderOpenFill className="w-3.5 h-3.5" />
                Global Knowledge Base
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-tight">
                Context
                <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent"> Manager</span>
              </h1>
              <p className="text-[14px] text-text-muted max-w-md leading-relaxed">
                Manage global documents for context-aware Q&A across all your meetings.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-surface2 border border-border">
                {loading ? (
                  <div className="w-8 h-8 rounded-md md3-skeleton mb-1" />
                ) : (
                  <span className="text-2xl font-bold text-text">
                    <AnimatedNumber value={files.length} />
                  </span>
                )}
                <span className="text-[10px] text-text-muted font-medium mt-1">Files</span>
              </div>
              <div className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface2 border border-border">
                {loading ? (
                  <div className="w-12 h-8 rounded-md md3-skeleton mb-1" />
                ) : (
                  <span className="text-xl font-bold text-text">
                    <AnimatedNumber value={totalSizeKB} formatFn={(v) => `${(v/1024).toFixed(1)}MB`} />
                  </span>
                )}
                <span className="text-[10px] text-text-muted font-medium mt-1">Total Size</span>
              </div>
              <button 
                onClick={() => setShowUpload(true)}
                className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-primary-container text-on-primary-container border border-primary/20 hover:brightness-125 spring-sm active:scale-[0.97]"
              >
                <RiUploadCloud2Line className="w-6 h-6 mb-1" />
                <span className="text-[12px] font-bold">Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* List Section */}
        <section className="flex flex-col gap-5 mt-2">
          <div className="min-h-[280px]">
            {error ? (
              <div className="h-72 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-risk/30 bg-risk-container/20 text-center p-6">
                <div className="w-14 h-14 rounded-full bg-risk-container flex items-center justify-center">
                  <RiCloseLine className="w-7 h-7 text-risk" />
                </div>
                <p className="text-risk font-semibold text-sm">{error}</p>
                <button
                  onClick={load}
                  className="h-10 px-6 bg-surface2 hover:bg-surface3 border border-border rounded-full text-sm font-semibold spring-colors active:scale-[0.97]"
                >
                  Retry
                </button>
              </div>
            ) : !loading && filtered.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-surface-dim text-center p-6">
                <div className="w-16 h-16 rounded-[20px] bg-surface2 border border-border flex items-center justify-center mb-1">
                  <RiFolderOpenFill className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-[15px] font-bold text-text">
                  {search ? "No matching files" : "No files uploaded"}
                </p>
                <p className="text-[12.5px] text-text-muted max-w-xs leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : "Upload documents to empower the AI Context Agent with custom knowledge."}
                </p>
                {!search && (
                  <button 
                    onClick={() => setShowUpload(true)}
                    className="mt-4 h-10 px-6 bg-primary-container text-on-primary-container hover:brightness-125 border border-primary/20 rounded-full text-sm font-semibold spring-colors active:scale-[0.97]"
                  >
                    Upload First File
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <SelectableGrid<ContextFile>
                  storeKey="context-manager"
                  itemTypeName="File"
                  items={filtered}
                  loading={loading}
                  skeletonCount={6}
                  getKey={(f) => `${f.meeting_id}-${f.filename}`}
                  getDate={(f) => new Date(f.date)}
                  onDelete={handleMultiDelete}
                  renderHeader={({ setManualSelectionMode }) => (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <h2 className="text-[17px] font-bold tracking-tight flex items-center gap-2">
                        <RiFileLine className="w-5 h-5 text-text-muted" />
                        Uploaded Contexts
                        <span className="text-[12px] font-semibold text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5 ml-1">
                          {filtered.length}
                        </span>
                      </h2>

                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                          <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as "date" | "name" | "size")}
                            className="w-[140px] h-9 bg-surface2 border border-border rounded-full pl-4 pr-8 text-[13px] text-text font-medium focus:outline-none focus:border-primary spring-colors cursor-pointer appearance-none"
                          >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="size">Sort by Size</option>
                          </select>
                      <RiArrowDropDownLine className="absolute right-2.5 w-8 h-8 text-text-muted pointer-events-none" />                        </div>

                        <button
                          onClick={() => setManualSelectionMode(true)}
                          className="h-9 px-4 rounded-full bg-surface2 hover:bg-surface3 border border-border text-[13px] font-bold text-text transition-colors active:scale-95 flex items-center gap-2"
                        >
                          <RiCheckLine className="w-4 h-4" />
                          Select
                        </button>

                        <div className="relative">
                          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search files…"
                            className="h-9 w-56 bg-surface2 border border-border rounded-full pl-9 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors"
                          />
                          {search && (
                            <button
                              onClick={() => setSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text spring-sm"
                            >
                              <RiCloseLine className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  renderItem={(f, selected, selectionMode, onToggle) => (
                    <div 
                      className={`transition-transform duration-300 ${selected ? "scale-95 opacity-80" : "scale-100 opacity-100"}`}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggle();
                        }
                      }}
                    >
                      <ContextCard
                        file={f}
                        index={0}
                        onView={setViewTarget}
                        onEdit={setEditTarget}
                        onDelete={setDeleteTarget}
                        onSelect={() => onToggle()}
                      />
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Dialogs */}
      {viewTarget && (
        <ViewContentDialog
          filename={viewTarget.filename}
          meetingId={viewTarget.meeting_id}
          onClose={() => setViewTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          title={deleteTarget.filename}
          itemName="File"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
      
      {editTarget && (
        <EditDialog
          initialTitle={editTarget.filename.replace(/\.[^/.]+$/, "")}
          itemName="File"
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
          busy={editBusy}
        />
      )}

      {showUpload && (
        <UploadDialog 
          onUpload={handleUpload}
          onCancel={() => setShowUpload(false)}
          busy={uploadBusy}
        />
      )}
    </div>
  );
}
