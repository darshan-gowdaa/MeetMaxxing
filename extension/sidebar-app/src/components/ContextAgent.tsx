import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

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

export function ContextAgent({ meetingId, suggestedQuestion }: { meetingId: string, suggestedQuestion?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: "user" | "agent", content: string}[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  
  useEffect(() => {
    refreshQuestions();
  }, [suggestedQuestion]);

  const refreshQuestions = () => {
    let pool = shuffleArray(FALLBACK_QUESTIONS);
    let finalQs = [];
    if (suggestedQuestion) {
      finalQs.push(suggestedQuestion);
      finalQs.push(...pool.slice(0, 2));
    } else {
      finalQs.push(...pool.slice(0, 3));
    }
    setRandomQuestions(finalQs);
  };
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loadingChat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setUploadError("");
    setUploadSuccess(false);
    if (!selected) {
      setFile(null);
      return;
    }
    
    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds 5MB limit.");
      setFile(null);
      return;
    }
    
    const validExts = ['.pdf', '.txt', '.docx'];
    const hasValidExt = validExts.some(ext => selected.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError("Only PDF, TXT, or DOCX allowed.");
      setFile(null);
      return;
    }
    
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);

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
        setUploadSuccess(true);
        setFile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const submitQuery = async (textToSubmit: string) => {
    if (!textToSubmit.trim()) return;
    setQuery("");
    setChatHistory(prev => [...prev, { role: "user", content: textToSubmit }]);
    setLoadingChat(true);

    try {
      const res = await fetch(`http://localhost:8000/context/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer dev_token" },
        body: JSON.stringify({ meeting_id: meetingId, query: textToSubmit })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "agent", content: data.answer }]);
      } else {
        setChatHistory(prev => [...prev, { role: "agent", content: "Error processing request." }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "agent", content: "Network error." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleChat = () => submitQuery(query);

  const handleSettingsClick = () => {
    window.open("http://localhost:3000/context", "_blank");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent p-0 m-0 border-none">
      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-1.5">
            <i className="ri-folder-open-fill text-cyan-400"></i> Docs QA
          </h3>
        </div>
        <button 
          onClick={handleSettingsClick}
          title="Manage Uploaded Contexts" 
          className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 border border-zinc-700/50 shadow-sm"
        >
          <i className="ri-settings-4-line text-[13px]"></i>
        </button>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Upload Area */}
        <div className="flex flex-col shrink-0">
          <button 
            onClick={() => setShowUpload(!showUpload)} 
            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 transition-colors text-zinc-300 text-[12px] font-medium"
          >
            <span className="flex items-center gap-2">
              <i className="ri-file-upload-line text-cyan-400"></i> Add Context Document
            </span>
            <i className={`ri-arrow-down-s-line transition-transform duration-300 ${showUpload ? 'rotate-180' : ''}`}></i>
          </button>
          
          <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showUpload ? 'grid-rows-[1fr] mt-2' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 text-[12px] flex flex-col gap-2">
                <label className="border border-dashed border-zinc-600 hover:border-cyan-500/50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                  <i className="ri-file-upload-line text-lg text-zinc-400 mb-1"></i>
                  <span className="text-zinc-300">{file ? file.name : "Select Doc (.pdf, .txt, .docx, max 5MB)"}</span>
                </label>
                {uploadError && <span className="text-red-400 text-[10px] text-center">{uploadError}</span>}
                <button 
                  onClick={handleUpload} disabled={!file || uploading} 
                  className="w-full py-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-medium disabled:opacity-50 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-1"
                >
                  {uploading ? "Indexing..." : uploadSuccess ? "Indexed Successfully!" : "Upload to Knowledge Base"}
                </button>
              </div>
            </div>
          </div>
        </div>
            
        {/* Chat Area */}
        <div className="flex flex-col flex-1 min-h-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-3">
            {chatHistory.length === 0 && (
               <p className="text-[11px] text-zinc-500 italic text-center mt-2 mb-auto">Ask the context agent...</p>
            )}
            
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-[20px] p-3 text-[13px] leading-relaxed ${
                  msg.role === 'user' ? 'bg-cyan-600/20 text-cyan-50 border border-cyan-500/20 rounded-br-sm ml-auto' : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-bl-sm mr-auto'
                }`}>
                  {msg.role === 'agent' ? (
                    <div className="markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-1 [&>ul]:mb-2 [&>li]:mb-1 [&>strong]:text-zinc-100 [&>em]:text-zinc-300">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-2.5 rounded-bl-sm flex gap-1 items-center h-[34px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            )}
            
            <div className={`flex flex-col w-full gap-2 mt-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showSuggestions ? 'opacity-100 h-auto pt-2' : 'opacity-0 h-0 overflow-hidden'}`}>
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium">
                  <i className="ri-lightbulb-flash-fill text-amber-400"></i> Suggested Queries
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); refreshQuestions(); }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  title="Refresh Suggestions"
                >
                  <i className="ri-refresh-line text-[11px]"></i>
                </button>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {randomQuestions.map((q, i) => (
                  <button 
                    key={i} 
                    onClick={() => { submitQuery(q); setShowSuggestions(false); }}
                    className="text-left text-[11px] p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-zinc-300 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300 transition-all duration-200 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chatEndRef} />
          </div>
          
          <div className="p-2 border-t border-zinc-800/80 bg-zinc-900/50 rounded-b-xl">
            <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1 px-2 focus-within:border-cyan-500/50 focus-within:bg-zinc-900 transition-all">
              <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${showSuggestions ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'}`}
                title="Toggle Suggestions"
              >
                <i className="ri-lightbulb-flash-fill text-[13px]"></i>
              </button>
              <input 
                type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask about context..."
                className="flex-1 bg-transparent border-none py-1.5 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600"
              />
              <button onClick={handleChat} disabled={!query.trim() || loadingChat} className="w-6 h-6 rounded flex items-center justify-center text-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400 disabled:opacity-30 transition-colors">
                <i className="ri-send-plane-fill text-[13px]"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

