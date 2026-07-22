import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const FALLBACK_QUESTIONS = [
  "What are the main topics in the document?",
  "Summarize the key decisions.",
  "What are the next action items?",
  "Who are the key people mentioned?",
  "Can you explain the main problem discussed?",
  "What is the timeline proposed?",
  "Are there any risks identified?",
  "What is the overall sentiment?",
  "List all the metrics or numbers mentioned.",
  "What are the open questions remaining?"
];

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function ContextAgent({ meetingId, pendingQuery, clearPendingQuery }: { meetingId: string, pendingQuery?: string, clearPendingQuery?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: "user" | "agent", content: string, sources?: any[]}[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  
  const [availableFiles, setAvailableFiles] = useState<{filename: string}[]>([]);
  const [selectedTargetFiles, setSelectedTargetFiles] = useState<string[]>([]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`http://localhost:8000/context/files`, {
        headers: { "Authorization": "Bearer dev_token" }
      });
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

  const refreshQuestions = () => {
    let pool = shuffleArray(FALLBACK_QUESTIONS);
    let finalQs = [];
    finalQs.push(...pool.slice(0, 3));
    setRandomQuestions(finalQs);
  };
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loadingChat]);

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
        const res = await fetch(`http://localhost:8000/context/upload`, {
          method: "POST",
          headers: { "Authorization": "Bearer dev_token" },
          body: formData
        });
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
    if (!textToSubmit.trim()) return;
    setQuery("");
    setShowSuggestions(false);
    setChatHistory(prev => [...prev, { role: "user", content: textToSubmit }]);
    setLoadingChat(true);

    abortControllerRef.current = new AbortController();

    try {
      const reqBody = {
        meeting_id: meetingId,
        query: textToSubmit,
        target_file: selectedTargetFiles.length > 0 ? selectedTargetFiles : null
      };
      
      const res = await fetch(`http://localhost:8000/context/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer dev_token" },
        body: JSON.stringify(reqBody),
        signal: abortControllerRef.current.signal
      });
      if (res.ok) {
        const data = await res.json();
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
    setShowSuggestions(true);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleChat = () => submitQuery(query);

  const handleSettingsClick = () => {
    window.open("http://localhost:3000/context", "_blank");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent p-0 m-0 border-none">
      <div className="flex items-center justify-between mb-3 shrink-0 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-zinc-200 flex items-center gap-1.5">
            <i className="ri-robot-2-fill text-cyan-500 text-[16px]"></i> IntelliAgent
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={handleClearChat}
            title="Clear Chat" 
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <i className="ri-delete-bin-line text-[14px]"></i>
          </button>
          <button 
            onClick={handleSettingsClick}
            title="Manage Uploaded Contexts" 
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <i className="ri-settings-4-line text-[14px]"></i>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 min-h-0 relative">
        {/* Chat Area */}
        <div className="flex flex-col flex-1 min-h-0 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 mx-1 mb-1">
          <div className="px-3 py-3 flex flex-col gap-2 border-b border-zinc-800/60 bg-zinc-900/40 rounded-t-2xl shrink-0">
            <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-[0.05em] flex items-center gap-1">
              Choose files to ask about <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{availableFiles.length}</span>
            </span>
            <div className="relative">
              <button 
                onClick={() => setShowFileDropdown(!showFileDropdown)}
                className="w-full bg-zinc-950 text-[12px] font-medium text-zinc-200 border border-zinc-800 rounded-xl px-3 py-2 outline-none hover:border-cyan-500/50 hover:bg-zinc-900 flex items-center justify-between transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <i className="ri-folder-open-fill text-cyan-500"></i>
                  <span className="truncate">
                    {selectedTargetFiles.length === 0 ? "General Meeting (All Knowledge)" : 
                     selectedTargetFiles.length === 1 ? selectedTargetFiles[0] : 
                     `${selectedTargetFiles.length} files selected`}
                  </span>
                </div>
                <i className={`ri-arrow-down-s-line text-zinc-400 transition-transform ${showFileDropdown ? "rotate-180" : ""}`}></i>
              </button>
              {showFileDropdown && (
                <div className="absolute left-0 right-0 mt-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-[16px] shadow-2xl z-20 flex flex-col overflow-hidden animate-fade-in origin-top">
                  <div className="p-2 border-b border-zinc-700/50 bg-zinc-950/30">
                    <div className="relative">
                      <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[12px]"></i>
                      <input 
                        type="text" 
                        placeholder="Search files..."
                        value={fileSearch}
                        onChange={e => setFileSearch(e.target.value)}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg text-[11px] pl-7 pr-2 py-1.5 text-zinc-200 outline-none focus:border-cyan-500/60 transition-colors"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col p-1">
                    <label className={`flex items-center gap-2 text-[11px] px-2 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/80 transition-colors ${selectedTargetFiles.length === 0 ? 'text-cyan-400 bg-cyan-900/10' : 'text-zinc-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedTargetFiles.length === 0} 
                        onChange={() => setSelectedTargetFiles([])}
                        className="rounded border-zinc-600 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <i className="ri-chat-voice-line text-[14px]"></i> General Meeting (All Knowledge)
                    </label>
                    <div className="h-[1px] bg-zinc-800/50 my-1 mx-2"></div>
                    {availableFiles.filter(f => f.filename.toLowerCase().includes(fileSearch.toLowerCase())).map(f => {
                      const isSelected = selectedTargetFiles.includes(f.filename);
                      return (
                        <label 
                          key={f.filename}
                          className={`flex items-center gap-2 text-[11px] px-2 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/80 transition-colors truncate ${isSelected ? 'text-cyan-400 bg-cyan-900/10' : 'text-zinc-300'}`}
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
                            className="rounded border-zinc-600 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20"
                          />
                          <i className="ri-file-text-line text-[14px] shrink-0 opacity-70"></i> 
                          <span className="truncate">{f.filename}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-4">
            {chatHistory.length === 0 && (
               <div className="flex flex-col items-center justify-center h-full opacity-60">
                 <i className="ri-chat-smile-3-line text-3xl text-zinc-600 mb-2"></i>
                 <p className="text-[12px] text-zinc-400 italic">Ask the context agent anything...</p>
               </div>
            )}
            
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] rounded-[24px] px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 rounded-br-[8px] ml-auto border border-cyan-800/30' : 'bg-zinc-800/60 text-zinc-200 rounded-bl-[8px] mr-auto border border-zinc-700/50 backdrop-blur-md'
                }`}>
                  {msg.role === 'agent' ? (
                    <div className="flex flex-col gap-2 relative group">
                      <button 
                        onClick={() => copyToClipboard(msg.content, i)}
                        className="absolute -top-1 -right-1 p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-zinc-700/50"
                        title="Copy Response"
                      >
                        <i className={copiedIndex === i ? "ri-check-line text-emerald-400 text-[12px]" : "ri-clipboard-line text-[12px]"}></i>
                      </button>
                      <div className="markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>li]:mb-1 [&>strong]:text-cyan-100 font-medium [&>em]:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 border-t border-zinc-700/50 pt-2">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mr-1 flex items-center"><i className="ri-link mr-1"></i>Sources:</span>
                          {msg.sources.map((s: any, idx: number) => (
                            <a key={idx} href={`http://localhost:3000/context`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-zinc-900 hover:bg-cyan-900/40 text-cyan-400 hover:text-cyan-300 text-[10px] px-2.5 py-1 rounded-full border border-zinc-700 hover:border-cyan-500/50 transition-all hover:-translate-y-[1px] active:scale-95 shadow-sm" title={s.speaker_name || "Context Document"}>
                               <i className="ri-file-text-line"></i> {s.speaker_name ? (s.speaker_name.length > 20 ? s.speaker_name.substring(0, 20) + '...' : s.speaker_name) : "Document"}
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
                <div className="bg-zinc-800/90 rounded-2xl px-4 py-3 rounded-bl-sm flex items-center shadow-sm border border-zinc-700/50">
                  <div className="md3-loader !w-4 !h-4 !bg-cyan-400"></div>
                </div>
              </div>
            )}
            
            <div className={`flex flex-col w-full gap-2 mt-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showSuggestions ? 'opacity-100 h-auto pt-3' : 'opacity-0 h-0 overflow-hidden'}`}>
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium tracking-wide">
                  <i className="ri-lightbulb-flash-fill text-amber-400/90"></i> SUGGESTED
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); refreshQuestions(); }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
                  title="Refresh Suggestions"
                >
                  <i className="ri-refresh-line text-[12px]"></i>
                </button>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {randomQuestions.map((q, i) => (
                  <button 
                    key={i} 
                    onClick={() => { submitQuery(q); setShowSuggestions(false); }}
                    className="text-left text-[12px] px-3 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-300 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-300 transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chatEndRef} />
          </div>
          
          <div className="p-2 border-t border-zinc-800/60 bg-zinc-900/60 rounded-b-2xl shrink-0">
            {uploadError && <div className="text-red-400 text-[10px] mb-1 px-2">{uploadError}</div>}
            <div className="flex items-end gap-2 bg-zinc-950/80 border border-zinc-800 rounded-xl p-1.5 px-2 focus-within:border-cyan-500/60 focus-within:bg-zinc-900 transition-all shadow-inner">
              <input type="file" multiple className="hidden" accept=".pdf,.docx,.txt" ref={fileInputRef} onChange={handleFileChange} />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors shrink-0 mb-[2px]"
                title="Upload Context Document"
              >
                {uploading ? <div className="md3-loader !w-[14px] !h-[14px] !bg-zinc-400"></div> : <i className="ri-attachment-2 text-[16px]"></i>}
              </button>

              <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 mb-[2px] ${showSuggestions ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'}`}
                title="Toggle Suggestions"
              >
                <i className="ri-lightbulb-flash-fill text-[16px]"></i>
              </button>
              
              <textarea 
                ref={inputRef}
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                rows={1}
                placeholder="Ask IntelliAgent about context..."
                className="flex-1 bg-transparent border-none py-2 min-h-[36px] max-h-[120px] resize-none text-[13px] text-zinc-200 outline-none placeholder:text-zinc-500 custom-scrollbar"
              />
              
              <div className="mb-[2px]">
                {loadingChat ? (
                  <button onClick={handleStop} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0" title="Stop generating">
                    <i className="ri-stop-circle-fill text-[16px]"></i>
                  </button>
                ) : (
                  <button onClick={handleChat} disabled={!query.trim() || loadingChat} className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 transition-colors shrink-0">
                    <i className="ri-send-plane-fill text-[16px]"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

