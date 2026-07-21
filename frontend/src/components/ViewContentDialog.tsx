"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiFileTextLine } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/Md3Loading";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function ViewContentDialog({
  filename,
  meetingId,
  onClose,
}: {
  filename: string;
  meetingId: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    document.body.style.overflow = "hidden";
    
    // Fetch content
    const fetchContent = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/context/file_content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer dev_token"
          },
          body: JSON.stringify({ meeting_id: meetingId, filename })
        });
        if (res.ok) {
          const data = await res.json();
          setContent(data.content || "No content found.");
        } else {
          setError("Failed to load file content.");
        }
      } catch (e) {
        console.error(e);
        setError("Network error loading content.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
    
    return () => { document.body.style.overflow = "unset"; };
  }, [filename, meetingId]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-3xl w-full h-[80vh] flex flex-col border border-border animate-fade-scale shadow-2xl">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <RiFileTextLine className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-[18px] font-bold text-text tracking-tight truncate max-w-md" title={filename}>
              {filename}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 bg-surface2 hover:bg-surface3 rounded-full transition-colors">
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 bg-surface2 border border-border rounded-[20px] p-4 overflow-y-auto custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Md3LoadingIndicator size="lg" />
              <p className="text-sm font-medium text-text-muted mt-4">Loading extracted text...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-risk">
              <RiCloseLine className="w-8 h-8 mb-2" />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : (
            <div className="text-[13px] text-text whitespace-pre-wrap leading-relaxed font-mono">
              {content}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
