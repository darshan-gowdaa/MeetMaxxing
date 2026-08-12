import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { getWebUrl, getBaseUrlBackend } from "../config";

export function ContextAgent({ meetingId, authToken, pendingQuery, clearPendingQuery }: { meetingId: string, authToken?: string, pendingQuery?: string, clearPendingQuery?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: "user" | "agent", content: string, sources?: any[]}[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  
  const [availableFiles, setAvailableFiles] = useState<{filename: string}[]>([]);
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<string[]>([]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${getBaseUrlBackend()}/context/files`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      // @ts-ignore
      const ext = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
      if (res.status === 401) {
        if (ext && ext.storage?.local) ext.storage.local.remove(["authToken"]);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAvailableFiles(data.files || []);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchFiles();
  }, [meetingId]);
  
  useEffect(() => {
    if (pendingQuery) {
      setQuery(pendingQuery);
      inputRef.current?.focus();
      if (clearPendingQuery) clearPendingQuery();
    }
  }, [pendingQuery, clearPendingQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFileDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        dropdownBtnRef.current && !dropdownBtnRef.current.contains(target)
      ) {
        setShowFileDropdown(false);
        setFileSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFileDropdown]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  useEffect(() => {
    if (autoScroll) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [chatHistory.length, loadingChat, autoScroll]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    setUploadError("");
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setUploading(true);
    let anyFailed = false;
    let newlyUploaded: string[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 5MB limit.`);
        anyFailed = true;
        continue;
      }
      const validExts = ['.pdf', '.txt', '.docx'];
      if (!validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setUploadError(`File ${file.name} has invalid extension.`);
        anyFailed = true;
        continue;
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("meeting_id", meetingId);
      try {
        const res = await fetch(`${getBaseUrlBackend()}/context/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${authToken}` },
          body: formData
        });
        // @ts-ignore
        const ext = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
        if (res.status === 401) {
          if (ext && ext.storage?.local) ext.storage.local.remove(["authToken"]);
          setUploadError("Session expired. Please log in again.");
          anyFailed = true;
          break;
        }

        if (res.ok) {
          newlyUploaded.push(file.name);
        } else {
          anyFailed = true;
        }
      } catch (err) {
        anyFailed = true;
      }
    }
    
    if (newlyUploaded.length > 0) {
      await fetchFiles();
      setSelectedTargetFiles(prev => Array.from(new Set([...prev, ...newlyUploaded])));
    }
    if (anyFailed && !uploadError) {
      setUploadError("Some uploads failed.");
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitQuery = async (textToSubmit: string) => {
    const textStr = String(textToSubmit || "");
    if (!textStr.trim()) return;
    setQuery("");
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setChatHistory(prev => [...prev, { role: "user", content: textStr }]);
    setLoadingChat(true);

    abortControllerRef.current = new AbortController();

    try {
      const reqBody = {
        meeting_id: meetingId,
        query: textStr,
        target_file: selectedTargetFiles.length > 0 ? selectedTargetFiles : null
      };
      
      const reqUrl = `${getBaseUrlBackend()}/context/chat`;
      console.log("API Request:", reqUrl, reqBody);
      const res = await fetch(reqUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(reqBody),
        signal: abortControllerRef.current.signal
      });
      console.log("API Response Status:", res.status);

      // @ts-ignore
      const ext = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
      if (res.status === 401) {
        if (ext && ext.storage?.local) ext.storage.local.remove(["authToken"]);
        setChatHistory(prev => [...prev, { role: "agent", content: "Session expired. Please log in again." }]);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        console.log("API Response Data:", data);
        setChatHistory(prev => [...prev, { role: "agent", content: data.answer, sources: data.sources }]);
      } else {
        setChatHistory(prev => [...prev, { role: "agent", content: "Error processing request." }]);
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setChatHistory(prev => [...prev, { role: "agent", content: "Generation stopped." }]);
      } else {
        setChatHistory(prev => [...prev, { role: "agent", content: "Network error." }]);
      }
    } finally {
      setLoadingChat(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleChat = () => submitQuery(query);

  const handleSettingsClick = () => {
    window.open(`${getWebUrl()}/context`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background p-0 m-0 border-none">
      
      {/* Google Meet MD3 Unified Header */}
      <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">
        
        {/* Top App Bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border bg-background shrink-0 z-10">
          <div className="relative flex-1 max-w-[200px]">
            <button
              ref={dropdownBtnRef}
              onClick={() => { setShowFileDropdown(v => !v); if (!showFileDropdown) setFileSearch(""); }}
              className="w-full bg-surface-container hover:bg-surface-container-high text-[13px] font-bold text-text rounded-full px-3 py-2 outline-none flex items-center gap-2 transition-colors border border-border shadow-sm"
            >
              <i className="ri-folder-open-line text-text-muted text-[14px]"></i>
              <span className="truncate text-left flex-1">
                {selectedTargetFiles.length === 0 ? "Meeting Context" : 
                 selectedTargetFiles.length === 1 ? selectedTargetFiles[0] : 
                 `${selectedTargetFiles.length} files`}
              </span>
              <i className={`ri-arrow-down-s-line text-text-muted transition-transform duration-300 ${showFileDropdown ? "rotate-180" : ""}`}></i>
            </button>
            {showFileDropdown && (
              <div ref={dropdownRef} className="absolute left-0 top-full mt-1 w-[260px] bg-surface-container border border-border rounded-[24px] shadow-xl z-30 flex flex-col overflow-hidden origin-top animate-fade-in duration-200">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[12px]"></i>
                    <input
                      type="text"
                      placeholder="Search context..."
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      className="w-full bg-surface rounded-[16px] text-[12px] font-medium pl-8 pr-3 py-2 text-text outline-none focus:ring-1 focus:ring-primary transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col p-1.5 gap-0.5">
                  {/* All Meeting Context — only active when nothing selected */}
                  <label
                    className={`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      selectedTargetFiles.length === 0 ? 'bg-primary-container text-on-primary-container' : 'text-text hover:bg-surface-container-high'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTargetFiles.length === 0}
                      onChange={() => setSelectedTargetFiles([])}
                      className="rounded-[4px] border-border bg-surface text-primary focus:ring-primary/50 w-3.5 h-3.5"
                    />
                    <i className="ri-database-2-line text-[14px]"></i> All Meeting Context
                  </label>
                  <div className="h-[1px] bg-border my-1 mx-3"></div>
                  {availableFiles.filter(f => f.filename.toLowerCase().includes(fileSearch.toLowerCase())).map((f, idx) => {
                    const isSelected = selectedTargetFiles.includes(f.filename);
                    return (
                      <label
                        key={`${f.filename}-${idx}`}
                        className={`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors truncate ${
                          isSelected ? 'bg-primary-container text-on-primary-container' : 'text-text hover:bg-surface-container-high'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargetFiles(prev => [...prev, f.filename]);
                            } else {
                              setSelectedTargetFiles(prev => prev.filter(x => x !== f.filename));
                            }
                          }}
                          className="rounded-[4px] border-border bg-surface text-primary focus:ring-primary/50 w-3.5 h-3.5"
                        />
                        <i className="ri-file-text-line text-[14px] opacity-70"></i>
                        <span className="truncate">{f.filename}</span>
                      </label>
                    );
                  })}
                  {availableFiles.length === 0 && (
                    <p className="text-[11px] text-text-muted italic text-center py-3 px-2">No context files uploaded.</p>
                  )}
                </div>
                {selectedTargetFiles.length > 0 && (
                  <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-text-muted">{selectedTargetFiles.length} file{selectedTargetFiles.length > 1 ? 's' : ''} selected</span>
                    <button
                      onClick={() => setSelectedTargetFiles([])}
                      className="text-[11px] text-text-muted hover:text-text underline transition-colors"
                    >Clear</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={handleClearChat}
              title="Clear Chat" 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors active:opacity-80"
            >
              <i className="ri-delete-bin-line text-[15px]"></i>
            </button>
            <button 
              onClick={handleSettingsClick}
              title="Settings" 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors active:opacity-80"
            >
              <i className="ri-settings-3-line text-[15px]"></i>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-3 min-h-0 relative scroll-smooth bg-background">
          {chatHistory.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full opacity-70 animate-fade-in duration-500">
               <div className="w-10 h-10 rounded-full bg-surface-container border border-border flex items-center justify-center mb-3 shadow-inner">
                 <i className="ri-sparkling-line text-xl text-primary"></i>
               </div>
               <h4 className="text-text font-semibold text-[14px] mb-1">How can I help?</h4>
               <p className="text-[11.5px] text-text-muted text-center px-4 max-w-[220px] leading-relaxed">
                 Ask questions about the meeting or explore selected context files.
               </p>
             </div>
          )}
          
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-on-primary rounded-[24px] rounded-br-[4px] font-medium' 
                  : 'bg-surface-container text-text rounded-[24px] rounded-bl-[4px] border border-border'
              }`}>
                {msg.role === 'agent' ? (
                  <div className="flex flex-col gap-2 relative group">
                    <button 
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="absolute -top-5 -right-2 p-1.5 rounded-full bg-surface-container-highest hover:brightness-110 text-text opacity-0 group-hover:opacity-100 transition-all active:opacity-80 shadow-sm"
                      title="Copy"
                    >
                      <i className={copiedIndex === i ? "ri-check-line text-primary text-[12px]" : "ri-file-copy-line text-[12px]"}></i>
                    </button>
                    <div className="markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>li]:mb-1 font-normal leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-border">
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold mr-1 flex items-center">Sources</span>
                    {Array.from(new Set(msg.sources.map((s:any) => s.filename || s.doc_name || s.title || s.speaker_name || "Document"))).map((sourceName: any, idx: number) => (
                          <a key={idx} href={`${getWebUrl()}/context?view=${encodeURIComponent(sourceName || '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high text-text text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors border border-border" title={sourceName || "Context Document"}>
                             <i className="ri-file-text-line"></i> {sourceName ? (sourceName.length > 18 ? sourceName.substring(0, 18) + '...' : sourceName) : "Document"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {loadingChat && (
            <div className="flex justify-start">
              <div className="bg-surface-container-high rounded-[24px] px-5 py-3.5 rounded-bl-sm border border-border flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} className="h-2" />
        </div>
        
        {!autoScroll && (
          <button 
            onClick={() => {
              setAutoScroll(true);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-surface-container-highest text-text rounded-full shadow-lg flex items-center justify-center transition-all hover:brightness-110 active:opacity-80 z-20"
            title="Resume auto-scroll"
          >
            <i className="ri-arrow-down-line text-[16px]"></i>
          </button>
        )}
        
        {/* Input Area */}
        <div className="p-2 bg-background shrink-0 z-20">
          
          {uploadError && (
            <div className="flex items-center gap-1.5 text-on-risk-container text-[11px] font-medium mb-2 px-3 bg-risk-container py-1.5 rounded-[12px]">
              <i className="ri-error-warning-line"></i> {uploadError}
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
              {uploading ? <div className="md3-loading-indicator md3-loading-indicator-sm text-text-muted !w-[16px] !h-[16px]"></div> : <i className="ri-add-line text-[20px]"></i>}
            </button>
            
            <textarea 
              ref={inputRef}
              value={query} 
              onChange={e => {
                setQuery(e.target.value);
                if (inputRef.current) inputRef.current.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }} 
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none py-1.5 min-h-[24px] max-h-[120px] resize-none text-[13px] text-text outline-none placeholder:text-text-muted custom-scrollbar flex items-center self-center"
            />
            
            <div className="">
              {loadingChat ? (
                <button onClick={handleStop} className="w-8 h-8 rounded-full flex items-center justify-center text-on-risk-container bg-risk-container hover:brightness-110 transition-colors shrink-0 active:opacity-80" title="Stop generating">
                  <i className="ri-stop-circle-line text-[18px]"></i>
                </button>
              ) : (
                <button onClick={handleChat} disabled={!String(query || "").trim() || loadingChat} className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary bg-primary hover:brightness-110 disabled:opacity-30 transition-colors shrink-0 active:opacity-80">
                  <i className="ri-arrow-right-line text-[18px]"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
