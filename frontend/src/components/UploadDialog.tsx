"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiUploadCloud2Line, RiCloseLine, RiFileTextLine, RiFilePdfLine, RiFileWordLine } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/Md3Loading";

export default function UploadDialog({
  onUpload,
  onCancel,
  busy,
}: {
  onUpload: (files: File[]) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!mounted) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => 
        f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.txt')
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <RiFilePdfLine className="w-5 h-5 text-red-500" />;
    if (ext === 'docx') return <RiFileWordLine className="w-5 h-5 text-blue-500" />;
    return <RiFileTextLine className="w-5 h-5 text-gray-500" />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={!busy ? onCancel : undefined} />
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-lg w-full border border-border animate-fade-scale shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
            <RiUploadCloud2Line className="w-5 h-5 text-primary" />
          </div>
          <button onClick={onCancel} disabled={busy} className="text-text-muted hover:text-text p-1 disabled:opacity-50">
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="text-[18px] font-bold text-text tracking-tight mb-1">
          Upload Context
        </h2>
        <p className="text-[13px] text-text-muted mb-6">
          Upload PDF, DOCX, or TXT for AI Knowledge Base.
        </p>

        {busy ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-primary/20 rounded-2xl bg-surface2 mb-6">
            <Md3LoadingIndicator size="lg" />
            <p className="text-[14px] font-bold text-primary mt-6 mb-1">Uploading & Indexing Files...</p>
            <p className="text-[12px] text-text-muted text-center max-w-xs">
              Extracting text and generating embeddings. Please wait.
            </p>
          </div>
        ) : (
          <>
            <div 
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer mb-6 ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-surface2 hover:bg-surface3 hover:border-primary/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <RiUploadCloud2Line className="w-8 h-8 text-text-muted mb-3" />
              <p className="text-[14px] font-bold text-text mb-1">Drag & drop your files</p>
              <p className="text-[12px] text-text-muted mb-4">or click to browse</p>
              <label className="h-9 px-4 rounded-full bg-surface-dim border border-border text-[12px] font-semibold flex items-center justify-center cursor-pointer hover:bg-surface-container">
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setFiles(prev => [...prev, ...newFiles]);
                    }
                  }}
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="flex flex-col gap-2 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {files.map((file, idx) => (
                  <div key={idx} className="border border-border rounded-xl p-3 bg-surface2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-dim flex items-center justify-center shrink-0">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[13px] font-bold text-text truncate" title={file.name}>{file.name}</p>
                      <p className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} 
                      className="p-2 text-text-muted hover:text-risk shrink-0"
                    >
                      <RiCloseLine className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:scale-[0.97] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => files.length > 0 && onUpload(files)}
            disabled={busy || files.length === 0}
            className="flex-1 h-11 rounded-full bg-primary text-on-primary text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-125 active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiUploadCloud2Line className="w-4 h-4" />}
            {busy ? "Uploading…" : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
