import { useState, useRef, useEffect } from "react";
import { getWebUrl, getBaseUrlBackend } from "../../config";
import { ChatBubble } from "../molecules/ChatBubble";

// Browser API shim — extension runtime injects chrome or browser globally
declare const chrome: any;
declare const browser: any;
const extApi = () =>
  typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);

export function ContextAgent({
  meetingId,
  authToken,
  pendingQuery,
  clearPendingQuery,
}: {
  meetingId: string;
  authToken?: string;
  pendingQuery?: string;
  clearPendingQuery?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "agent"; content: string; sources?: any[] }[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<{ filename: string }[]>([]);
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${getBaseUrlBackend()}/context/files`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const ext = extApi();
      if (res.status === 401) { ext?.storage?.local?.remove?.(["authToken"]); return; }
      if (res.ok) setAvailableFiles((await res.json()).files || []);
    } catch (e) {}
  };

  useEffect(() => { fetchFiles(); }, [meetingId]);

  useEffect(() => {
    if (pendingQuery) { setQuery(pendingQuery); inputRef.current?.focus(); clearPendingQuery?.(); }
  }, [pendingQuery]);

  useEffect(() => {
    if (!showFileDropdown) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t) && dropdownBtnRef.current && !dropdownBtnRef.current.contains(t)) {
        setShowFileDropdown(false);
        setFileSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFileDropdown]);

  useEffect(() => {
    if (autoScroll) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [chatHistory.length, loadingChat, autoScroll]);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setUploadError("");
    if (!files?.length) return;
    setUploading(true);
    let anyFailed = false;
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { setUploadError(`${file.name} exceeds 5MB.`); anyFailed = true; continue; }
      if (![".pdf", ".txt", ".docx"].some((x) => file.name.toLowerCase().endsWith(x))) {
        setUploadError(`${file.name} invalid type.`); anyFailed = true; continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("meeting_id", meetingId);
      try {
        const res = await fetch(`${getBaseUrlBackend()}/context/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: fd,
        });
        const ext = extApi();
        if (res.status === 401) { ext?.storage?.local?.remove?.(["authToken"]); setUploadError("Session expired."); anyFailed = true; break; }
        if (res.ok) uploaded.push(file.name);
        else anyFailed = true;
      } catch { anyFailed = true; }
    }
    if (uploaded.length) { await fetchFiles(); setSelectedTargetFiles((p) => Array.from(new Set([...p, ...uploaded]))); }
    if (anyFailed && !uploadError) setUploadError("Some uploads failed.");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitQuery = async (text: string) => {
    if (!text.trim()) return;
    setQuery("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setChatHistory((p) => [...p, { role: "user", content: text }]);
    setLoadingChat(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${getBaseUrlBackend()}/context/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ meeting_id: meetingId, query: text, target_file: selectedTargetFiles.length ? selectedTargetFiles : null }),
        signal: abortRef.current.signal,
      });
      const ext = extApi();
      if (res.status === 401) { ext?.storage?.local?.remove?.(["authToken"]); setChatHistory((p) => [...p, { role: "agent", content: "Session expired. Please log in again." }]); return; }
      if (res.ok) {
        const data = await res.json();
        setChatHistory((p) => [...p, { role: "agent", content: data.answer, sources: data.sources }]);
      } else {
        setChatHistory((p) => [...p, { role: "agent", content: "Error processing request." }]);
      }
    } catch (e: any) {
      setChatHistory((p) => [...p, { role: "agent", content: e.name === "AbortError" ? "Generation stopped." : "Network error." }]);
    } finally {
      setLoadingChat(false);
      abortRef.current = null;
    }
  };

  const fileSelectorLabel =
    selectedTargetFiles.length === 0 ? "Meeting Context" :
    selectedTargetFiles.length === 1 ? selectedTargetFiles[0] :
    `${selectedTargetFiles.length} files`;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">

        {/* Top bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border bg-background shrink-0 z-10">
          <div className="relative flex-1 max-w-[200px]">
            <button
              ref={dropdownBtnRef}
              onClick={() => { setShowFileDropdown((v) => !v); if (!showFileDropdown) setFileSearch(""); }}
              className="w-full bg-surface-container hover:bg-surface-container-high text-[13px] font-bold text-text rounded-full px-3 py-2 outline-none flex items-center gap-2 transition-colors border border-border shadow-sm"
            >
              <i className="ri-folder-open-line text-text-muted text-[14px]" />
              <span className="truncate text-left flex-1">{fileSelectorLabel}</span>
              <i className={`ri-arrow-down-s-line text-text-muted transition-transform duration-300 ${showFileDropdown ? "rotate-180" : ""}`} />
            </button>
            {showFileDropdown && (
              <div ref={dropdownRef} className="absolute left-0 top-full mt-1 w-[260px] bg-surface-container border border-border rounded-[24px] shadow-xl z-30 flex flex-col overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[12px]" />
                    <input
                      type="text"
                      placeholder="Search context..."
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      className="w-full bg-surface rounded-[16px] text-[12px] font-medium pl-8 pr-3 py-2 text-text outline-none focus:ring-1 focus:ring-primary transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col p-1.5 gap-0.5">
                  <label className={`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors ${selectedTargetFiles.length === 0 ? "bg-primary-container text-on-primary-container" : "text-text hover:bg-surface-container-high"}`}>
                    <input type="checkbox" checked={selectedTargetFiles.length === 0} onChange={() => setSelectedTargetFiles([])} className="rounded-[4px] border-border bg-surface text-primary w-3.5 h-3.5" />
                    <i className="ri-database-2-line text-[14px]" /> All Meeting Context
                  </label>
                  <div className="h-[1px] bg-border my-1 mx-3" />
                  {availableFiles.filter((f) => f.filename.toLowerCase().includes(fileSearch.toLowerCase())).map((f, idx) => {
                    const selected = selectedTargetFiles.includes(f.filename);
                    return (
                      <label key={`${f.filename}-${idx}`} className={`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors truncate ${selected ? "bg-primary-container text-on-primary-container" : "text-text hover:bg-surface-container-high"}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => setSelectedTargetFiles((p) => e.target.checked ? [...p, f.filename] : p.filter((x) => x !== f.filename))}
                          className="rounded-[4px] border-border bg-surface text-primary w-3.5 h-3.5"
                        />
                        <i className="ri-file-text-line text-[14px] opacity-70" />
                        <span className="truncate">{f.filename}</span>
                      </label>
                    );
                  })}
                  {!availableFiles.length && <p className="text-[11px] text-text-muted italic text-center py-3 px-2">No context files uploaded.</p>}
                </div>
                {selectedTargetFiles.length > 0 && (
                  <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-text-muted">{selectedTargetFiles.length} file{selectedTargetFiles.length > 1 ? "s" : ""} selected</span>
                    <button onClick={() => setSelectedTargetFiles([])} className="text-[11px] text-text-muted hover:text-text underline transition-colors">Clear</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setChatHistory([])} title="Clear Chat" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors active:opacity-80">
              <i className="ri-delete-bin-line text-[15px]" />
            </button>
            <button onClick={() => window.open(`${getWebUrl()}/context`, "_blank")} title="Settings" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors active:opacity-80">
              <i className="ri-settings-3-line text-[15px]" />
            </button>
          </div>
        </div>

        {/* Chat feed */}
        <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-3 min-h-0 relative scroll-smooth bg-background">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-70">
              <div className="w-10 h-10 rounded-full bg-surface-container border border-border flex items-center justify-center mb-3 shadow-inner">
                <i className="ri-sparkling-line text-xl text-primary" />
              </div>
              <h4 className="text-text font-semibold text-[14px] mb-1">How can I help?</h4>
              <p className="text-[11.5px] text-text-muted text-center px-4 max-w-[220px] leading-relaxed">
                Ask questions about the meeting or explore selected context files.
              </p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
              onCopy={() => { navigator.clipboard.writeText(msg.content); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 2000); }}
              copied={copiedIndex === i}
            />
          ))}
          {loadingChat && (
            <div className="flex justify-start">
              <div className="bg-surface-container-high rounded-[24px] px-5 py-3.5 rounded-bl-sm border border-border flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2" />
        </div>

        {!autoScroll && (
          <button
            onClick={() => { setAutoScroll(true); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-surface-container-highest text-text rounded-full shadow-lg flex items-center justify-center hover:brightness-110 active:opacity-80 z-20"
            title="Resume auto-scroll"
          >
            <i className="ri-arrow-down-line text-[16px]" />
          </button>
        )}

        {/* Input area */}
        <div className="p-2 bg-background shrink-0 z-20">
          {uploadError && (
            <div className="flex items-center gap-1.5 text-on-risk-container text-[11px] font-medium mb-2 px-3 bg-risk-container py-1.5 rounded-[12px]">
              <i className="ri-error-warning-line" /> {uploadError}
            </div>
          )}
          <div className="flex items-center gap-2 bg-surface-container-high rounded-[28px] p-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all border border-border mx-1 mb-1 shadow-sm">
            <input type="file" multiple className="hidden" accept=".pdf,.docx,.txt" ref={fileInputRef} onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-container-highest transition-colors shrink-0 active:opacity-80"
              title="Upload Context Document"
            >
              {uploading ? <div className="md3-loading-indicator md3-loading-indicator-sm text-text-muted !w-[16px] !h-[16px]" /> : <i className="ri-add-line text-[20px]" />}
            </button>
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (inputRef.current) inputRef.current.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuery(query); } }}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none py-1.5 min-h-[24px] max-h-[120px] resize-none text-[13px] text-text outline-none placeholder:text-text-muted custom-scrollbar"
            />
            {loadingChat ? (
              <button onClick={() => abortRef.current?.abort()} className="w-8 h-8 rounded-full flex items-center justify-center text-on-risk-container bg-risk-container hover:brightness-110 transition-colors shrink-0 active:opacity-80" title="Stop generating">
                <i className="ri-stop-circle-line text-[18px]" />
              </button>
            ) : (
              <button onClick={() => submitQuery(query)} disabled={!query.trim() || loadingChat} className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary bg-primary hover:brightness-110 disabled:opacity-30 transition-colors shrink-0 active:opacity-80">
                <i className="ri-arrow-right-line text-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
