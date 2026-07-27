"use client";

import { useState, useRef, useEffect } from "react";
import { 
  RiUploadCloud2Line as Upload, 
  RiMessage3Line as Chat, 
  RiSendPlane2Line as Send,
  RiFileTextLine as FileText,
  RiCheckDoubleLine as CheckDouble
} from "@remixicon/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function ContextManager({ meetingId }: { meetingId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: "user" | "agent", content: string}[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loadingChat]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setUploadSuccess(false); setUploadError("");
    const body = new FormData();
    body.append("file", file); body.append("meeting_id", meetingId);
    try {
      const res = await fetch(`${BACKEND_URL}/context/upload`, { method: "POST", headers: { Authorization: "Bearer dev_token" }, body });
      if (res.ok) { setUploadSuccess(true); setFile(null); }
      else setUploadError((await res.json().catch(()=>({}))).detail || `Error (${res.status})`);
    } catch { setUploadError("Network error"); }
    finally { setUploading(false); }
  };

  const handleChat = async () => {
    if (!query.trim()) return;
    const q = query;
    setQuery("");
    setChatHistory(p => [...p, { role: "user", content: q }]);
    setLoadingChat(true);
    try {
      const res = await fetch(`${BACKEND_URL}/context/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer dev_token" }, body: JSON.stringify({ meeting_id: meetingId, query: q }) });
      let answer = "Request failed.";
      if (res.ok) {
        const data = await res.json();
        answer = data.answer;
      }
      setChatHistory(p => [...p, { role: "agent", content: answer }]);
    } catch { setChatHistory(p => [...p, { role: "agent", content: "Network error." }]); }
    finally { setLoadingChat(false); }
  };

  return (
    <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-6 mt-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[12px] bg-primary/10 flex items-center justify-center">
          <Upload className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-[14px] font-bold text-text tracking-tight uppercase text-primary">
          Meeting Context & Knowledge (RAG)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="flex flex-col gap-4 bg-surface2 rounded-[16px] p-5 border border-border">
          <p className="text-[13px] text-text-muted">
            Upload PDF, DOCX, or TXT files to provide background context for this meeting. The AI will use this knowledge for real-time insights and Q&A.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1 border border-dashed border-border hover:border-primary bg-surface-dim hover:bg-surface3 transition-colors rounded-[12px] p-4 flex flex-col items-center justify-center cursor-pointer min-h-[120px]">
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <FileText className="w-6 h-6 text-text-muted mb-2" />
              <span className="text-[12px] font-medium text-text">
                {file ? file.name : "Select Document"}
              </span>
            </label>
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="relative flex flex-col items-center justify-center gap-1.5 h-20 w-full rounded-[20px] bg-surface2 border border-border text-text font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface3 transition-all active:scale-[0.98]"
          >
            {uploading ? (
              <span className="animate-pulse text-text-muted">Uploading & Indexing...</span>
            ) : uploadSuccess ? (
              <>
                <CheckDouble className="w-6 h-6 text-success" /> 
                <span className="text-success">Indexed Successfully</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-text-muted" /> 
                <span>Upload to Qdrant</span>
              </>
            )}
          </button>
          {uploadError && (
            <p className="text-[12px] text-risk font-medium text-center">{uploadError}</p>
          )}
        </div>

        {/* Chat Section */}
        <div className="flex flex-col gap-4 bg-surface2 rounded-[16px] p-5 border border-border h-[300px]">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                <Chat className="w-6 h-6 opacity-50" />
                <p className="text-[12px] font-medium">Ask questions about the uploaded context</p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-[14px] p-3 text-[13px] ${
                    msg.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-[4px]' 
                      : 'bg-surface3 text-text rounded-tl-[4px] border border-border'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[14px] p-3 text-[13px] bg-surface3 text-text rounded-tl-[4px] border border-border flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask context agent..."
              className="flex-1 h-9 rounded-full bg-surface-dim border border-border px-4 text-[13px] text-text outline-none focus:border-primary transition-colors"
            />
            <button 
              onClick={handleChat}
              disabled={loadingChat || !query.trim()}
              className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

