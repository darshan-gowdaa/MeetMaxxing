import fs from 'fs';

const original = fs.readFileSync('src/components/ContextAgent.tsx.bak', 'utf-8');
const parts = original.split('  return (');
const header = parts[0];

const newReturn = `  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#1E1F22] p-0 m-0 border-none">
      
      {/* Google Meet MD3 Unified Header */}
      <div className="flex flex-col flex-1 min-h-0 bg-[#1E1F22] overflow-hidden">
        
        {/* Top App Bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-700/50 bg-[#1E1F22] shrink-0 z-10">
          <div className="relative flex-1 max-w-[200px]">
            <button 
              onClick={() => setShowFileDropdown(!showFileDropdown)}
              className="w-full bg-zinc-800/50 hover:bg-zinc-800 text-[12px] font-medium text-zinc-300 rounded-full px-3 py-1.5 outline-none flex items-center gap-2 transition-colors border border-transparent active:border-zinc-700"
            >
              <i className="ri-folder-open-line text-zinc-400 text-[14px]"></i>
              <span className="truncate text-left flex-1">
                {selectedTargetFiles.length === 0 ? "Meeting Context" : 
                 selectedTargetFiles.length === 1 ? selectedTargetFiles[0] : 
                 \`\${selectedTargetFiles.length} files\`}
              </span>
              <i className={\`ri-arrow-down-s-line text-zinc-400 transition-transform duration-300 \${showFileDropdown ? "rotate-180" : ""}\`}></i>
            </button>
            {showFileDropdown && (
              <div className="absolute left-0 top-full mt-1 w-[260px] bg-[#282A2D] border border-zinc-700 rounded-2xl shadow-xl z-30 flex flex-col overflow-hidden origin-top animate-fade-in duration-200">
                <div className="p-2 border-b border-zinc-700">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[12px]"></i>
                    <input 
                      type="text" 
                      placeholder="Search context..."
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      className="w-full bg-[#1E1F22] rounded-xl text-[12px] font-medium pl-8 pr-3 py-2 text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-500 transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col p-1.5 gap-0.5">
                  <label className={\`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors \${selectedTargetFiles.length === 0 ? 'bg-[#3A3F45] text-zinc-100' : 'text-zinc-300 hover:bg-[#32363B]'}\`}>
                    <input 
                      type="checkbox" 
                      checked={selectedTargetFiles.length === 0} 
                      onChange={() => setSelectedTargetFiles([])}
                      className="rounded-[4px] border-zinc-600 bg-[#1E1F22] text-zinc-400 focus:ring-zinc-500/50 w-3.5 h-3.5"
                    />
                    <i className="ri-database-2-line text-[14px]"></i> All Meeting Context
                  </label>
                  <div className="h-[1px] bg-zinc-700 my-1 mx-3"></div>
                  {availableFiles.filter(f => f.filename.toLowerCase().includes(fileSearch.toLowerCase())).map(f => {
                    const isSelected = selectedTargetFiles.includes(f.filename);
                    return (
                      <label 
                        key={f.filename}
                        className={\`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl cursor-pointer transition-colors truncate \${isSelected ? 'bg-[#3A3F45] text-zinc-100' : 'text-zinc-300 hover:bg-[#32363B]'}\`}
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
                          className="rounded-[4px] border-zinc-600 bg-[#1E1F22] text-zinc-400 focus:ring-zinc-500/50 w-3.5 h-3.5"
                        />
                        <i className="ri-file-text-line text-[14px] opacity-70"></i> 
                        <span className="truncate">{f.filename}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={handleClearChat}
              title="Clear Chat" 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors active:scale-[0.95]"
            >
              <i className="ri-delete-bin-line text-[15px]"></i>
            </button>
            <button 
              onClick={handleSettingsClick}
              title="Settings" 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors active:scale-[0.95]"
            >
              <i className="ri-settings-3-line text-[15px]"></i>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-3 min-h-0 relative scroll-smooth bg-[#1E1F22]">
          {chatHistory.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full opacity-60 animate-fade-in duration-500">
               <h4 className="text-zinc-200 font-medium text-[15px] mb-1">How can I help?</h4>
               <p className="text-[12px] text-zinc-400 text-center px-4 max-w-[240px] leading-relaxed">
                 Ask questions about the meeting or explore the selected context files.
               </p>
             </div>
          )}
          
          {chatHistory.map((msg, i) => (
            <div key={i} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
              <div className={\`max-w-[88%] px-4 py-2.5 text-[13px] leading-relaxed \${
                msg.role === 'user' 
                  ? 'bg-[#A8C7FA] text-[#062E6F] rounded-3xl rounded-br-sm font-medium' 
                  : 'bg-[#282A2D] text-[#E3E3E3] rounded-3xl rounded-bl-sm border border-zinc-700/50'
              }\`}>
                {msg.role === 'agent' ? (
                  <div className="flex flex-col gap-2 relative group">
                    <button 
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="absolute -top-5 -right-2 p-1.5 rounded-full bg-[#32363B] hover:bg-[#3A3F45] text-zinc-300 opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-sm"
                      title="Copy"
                    >
                      <i className={copiedIndex === i ? "ri-check-line text-[#A8C7FA] text-[12px]" : "ri-file-copy-line text-[12px]"}></i>
                    </button>
                    <div className="markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>li]:mb-1 [&>strong]:text-zinc-100 font-normal leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-zinc-700/60">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mr-1 flex items-center">Sources</span>
                        {msg.sources.map((s: any, idx: number) => (
                          <a key={idx} href={\`http://localhost:3000/context\`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-[#1E1F22] hover:bg-[#32363B] text-zinc-300 text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors border border-zinc-700/80" title={s.speaker_name || "Context Document"}>
                             <i className="ri-file-text-line"></i> {s.speaker_name ? (s.speaker_name.length > 18 ? s.speaker_name.substring(0, 18) + '...' : s.speaker_name) : "Document"}
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
              <div className="bg-[#282A2D] rounded-3xl px-5 py-3.5 rounded-bl-sm border border-zinc-700/50 flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-[#A8C7FA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-[#A8C7FA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-1.5 h-1.5 bg-[#A8C7FA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div className={\`flex flex-col w-full gap-2 mt-auto transition-all duration-300 \${showSuggestions ? 'opacity-100 pt-4' : 'opacity-0 h-0 overflow-hidden pt-0'}\`}>
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <i className="ri-sparkling-line"></i> Suggestions
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {randomQuestions.map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => { submitQuery(q); setShowSuggestions(false); }}
                  className="text-left text-[12px] font-medium px-4 py-2.5 rounded-2xl bg-[#282A2D] text-zinc-300 hover:bg-[#32363B] active:bg-[#3A3F45] transition-colors border border-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div ref={chatEndRef} className="h-2" />
        </div>
        
        {!autoScroll && (
          <button 
            onClick={() => {
              setAutoScroll(true);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#32363B] text-zinc-200 rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-[#3A3F45] active:scale-95 z-20"
            title="Resume auto-scroll"
          >
            <i className="ri-arrow-down-line text-[16px]"></i>
          </button>
        )}
        
        {/* Input Area */}
        <div className="p-2 bg-[#1E1F22] shrink-0 z-20">
          
          {/* Action Chips above input */}
          <div className="flex items-center gap-1.5 mb-2 px-1">
             <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={\`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors active:scale-95 border \${showSuggestions ? 'bg-[#A8C7FA] text-[#062E6F] border-transparent' : 'bg-[#282A2D] text-zinc-300 hover:bg-[#32363B] border-zinc-700/80'}\`}
                title="Toggle Suggestions"
              >
                <i className="ri-lightbulb-line text-[13px]"></i> 
                <span>Suggestions</span>
              </button>
              <button 
                onClick={() => { refreshQuestions(); setShowSuggestions(true); }}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#282A2D] text-zinc-300 hover:bg-[#32363B] border border-zinc-700/80 transition-colors active:scale-95"
                title="Refresh Suggestions"
              >
                <i className="ri-refresh-line text-[13px]"></i>
              </button>
          </div>

          {uploadError && (
            <div className="flex items-center gap-1.5 text-[#F2B8B5] text-[11px] font-medium mb-2 px-3 bg-[#8C1D18]/30 py-1.5 rounded-lg">
              <i className="ri-error-warning-line"></i> {uploadError}
            </div>
          )}
          
          <div className="flex items-end gap-1.5 bg-[#282A2D] rounded-3xl p-1.5 focus-within:ring-1 focus-within:ring-zinc-500 transition-all">
            <input type="file" multiple className="hidden" accept=".pdf,.docx,.txt" ref={fileInputRef} onChange={handleFileChange} />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#32363B] transition-colors shrink-0 active:scale-95 mb-0.5"
              title="Upload Context Document"
            >
              {uploading ? <div className="md3-loading-indicator md3-loading-indicator-sm text-zinc-400 !w-[16px] !h-[16px]"></div> : <i className="ri-add-line text-[20px]"></i>}
            </button>
            
            <textarea 
              ref={inputRef}
              value={query} 
              onChange={e => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = \`\${Math.min(e.target.scrollHeight, 120)}px\`;
              }} 
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none py-2 min-h-[36px] max-h-[120px] resize-none text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 custom-scrollbar mb-0.5"
            />
            
            <div className="mb-0.5 mr-0.5">
              {loadingChat ? (
                <button onClick={handleStop} className="w-8 h-8 rounded-full flex items-center justify-center text-[#F2B8B5] bg-[#8C1D18] hover:bg-[#B3261E] transition-colors shrink-0 active:scale-95" title="Stop generating">
                  <i className="ri-stop-circle-line text-[18px]"></i>
                </button>
              ) : (
                <button onClick={handleChat} disabled={!String(query || "").trim() || loadingChat} className="w-8 h-8 rounded-full flex items-center justify-center text-[#1E1F22] bg-[#A8C7FA] hover:bg-[#D3E3FD] disabled:opacity-30 disabled:bg-[#32363B] disabled:text-zinc-500 transition-colors shrink-0 active:scale-95">
                  <i className="ri-send-plane-fill text-[16px]"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/ContextAgent.tsx', header + newReturn);
