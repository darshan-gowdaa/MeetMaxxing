import sys

filepath = 'Z:\\christ-university\\HiDevsHackathonProject\\HiDevs.xyz - Hackathon Prep\\MeetMaxxing\\extension\\sidebar-app\\src\\App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the 3 agents
main_start = content.find('{/* What to answer Agent */}')
main_end = content.find('</main>', main_start)

main_new = '''
            {/* What to answer Agent */}
            <div id="suggestions-section" className="section md3-card">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsSuggestionsMaximized(!isSuggestionsMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#a8c7fa", padding: "2px 4px" }}>
                  <i className={isSuggestionsMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title" style={{ flex: 1 }}>
                  <i className="ri-sparkling-fill" style={{ color: "#a8c7fa" }}></i>
                  "What to answer" Agent
                </h3>
                <button 
                  onClick={() => triggerAction("ASK_SUGGESTIONS")}
                  disabled={isProcessing}
                  className="btn btn-primary btn-sm"
                >
                  <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Suggest
                </button>
              </div>
              <div className={`smooth-collapse ${isSuggestionsMaximized ? '' : 'collapsed'}`}>
                <div id="suggestions-list" className="content-box">
                  {suggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {suggestions.map((sug, idx) => (
                        <div key={idx} className="suggestion-card new" onClick={() => copyToClipboard(sug, idx)}>
                          {sug}
                          {copiedIndex === idx && <i className="ri-check-line" style={{ color: 'var(--success)', float: 'right' }}></i>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">Click Suggest when ready for AI insights</p>
                  )}
                </div>
              </div>
            </div>

            {/* Suggestion of what to Ask */}
            <div id="next-question-section" className={`section md3-card smooth-collapse`} style={{ border: "none", padding: 0, marginBottom: 0 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px", marginBottom: "12px", background: "var(--surface)" }}>
                <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                  <button onClick={() => setIsNextQMaximized(!isNextQMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#7fcfff", padding: "2px 4px" }}>
                    <i className={isNextQMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                  </button>
                  <h3 className="section-title next-q-title" style={{ flex: 1 }}>
                    <i className="ri-question-answer-fill" style={{ color: "#7fcfff" }}></i>
                    "Suggestion of what to Ask"
                  </h3>
                  <button 
                    onClick={() => triggerAction("ASK_NEXT_QUESTION")}
                    disabled={isProcessing}
                    className="btn btn-secondary btn-sm" style={{ background: "rgba(127, 207, 255, 0.1)", color: "#7fcfff" }}
                  >
                    <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Generate
                  </button>
                </div>
                <div className={`smooth-collapse ${isNextQMaximized ? '' : 'collapsed'}`}>
                  {nextQuestion ? (
                    <div className="next-question-card content-box" onClick={() => copyToClipboard(nextQuestion)} style={{ cursor: 'pointer' }}>
                      {nextQuestion}
                      {copiedQuestion && <i className="ri-check-line" style={{ color: 'var(--success)', float: 'right' }}></i>}
                    </div>
                  ) : (
                    <div className="next-question-card content-box" style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      Click Generate to formulate a question.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recap Agent */}
            <div className="section md3-card" id="recap-section">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsRecapMaximized(!isRecapMaximized)} className="btn btn-ghost btn-sm" style={{ color: "#6dd58c", padding: "2px 4px" }}>
                  <i className={isRecapMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title" style={{ flex: 1 }}>
                  <i className="ri-file-list-3-fill" style={{ color: "#6dd58c" }}></i>
                  "Recap Agent"
                </h3>
                <button 
                  onClick={() => triggerAction("REQUEST_RECAP")}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm" style={{ background: "rgba(109, 213, 140, 0.1)", color: "#6dd58c" }}
                >
                  <i className={`ri-refresh-line ${isProcessing ? 'animate-spin' : ''}`}></i> Recap
                </button>
              </div>
              <div className={`smooth-collapse ${isRecapMaximized ? '' : 'collapsed'}`}>
                {recap ? (
                  <div className="recap-box content-box" style={{ whiteSpace: 'pre-wrap' }}>{recap}</div>
                ) : (
                  <div className="recap-box content-box" style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Click Recap for an executive summary.</div>
                )}
              </div>
            </div>
'''

content = content[:main_start] + main_new + '          ' + content[main_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
