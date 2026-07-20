import sys

filepath = 'Z:\\christ-university\\HiDevsHackathonProject\\HiDevs.xyz - Hackathon Prep\\MeetMaxxing\\extension\\sidebar-app\\src\\App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import type { TranscriptChunk, CopilotUpdate } from "./types";',
    'import type { TranscriptChunk, CopilotUpdate } from "./types";\nimport "./sidepanel.css";'
)

# Replace Header
header_start = content.find('<div className="flex flex-col h-screen bg-[#141518] text-[#ffffff] select-none font-sans overflow-hidden">')
header_end = content.find('{!meetingId ? (')

header_new = '''    <>
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon"><i className="ri-sparkling-2-fill"></i></span>
            <span>MeetMaxxing</span>
          </div>
          <div id="status-badge" className={`badge ${meetingId && !isEnded ? 'badge-live' : 'badge-idle'}`}>
            <span className="badge-dot"></span>
            <span className="badge-label">{meetingId && !isEnded ? 'Live' : 'Idle'}</span>
          </div>
        </div>
        <div className="header-right">
          <div id="timer" className="timer">{elapsedTime}</div>
          {meetingId && !isEnded && (
            <button
              id="end-meeting-top-btn"
              className="btn btn-sm btn-danger"
              title="End Meeting & Process Summary"
              onClick={() => triggerAction("REQUEST_END_MEETING")}
            >
              <i className="ri-stop-fill"></i>
              Stop
            </button>
          )}
        </div>
      </header>

      '''

content = content[:header_start] + header_new + content[header_end:]

# Replace Main logic up to Live Transcription
main_start = content.find('{!meetingId ? (')
main_end = content.find('{/* Error Alert Banner */}')

main_new = '''{!meetingId ? (
        <main>
          <div id="idle-state" className="state-container">
            <div className="idle-state">
              <div className="idle-icon">
                <i className="ri-vidicon-line"></i>
              </div>
              <p className="idle-title">Not in a Meeting</p>
              <p className="idle-text">Join a Google Meet call to activate MeetMaxxing AI Copilot</p>
              <div className="idle-steps">
                <div className="idle-step">
                  <span className="step-num">1</span>
                  <span>Open Google Meet</span>
                </div>
                <div className="idle-step">
                  <span className="step-num">2</span>
                  <span>Enable Captions (CC)</span>
                </div>
                <div className="idle-step">
                  <span className="step-num">3</span>
                  <span>Copilot activates auto</span>
                </div>
              </div>
              
              <div style={{ marginTop: "24px" }}>
                <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-full" style={{ textDecoration: 'none' }}>
                  <i className="ri-layout-masonry-line"></i>
                  Open Dashboard
                </a>
              </div>
            </div>
          </div>
        </main>
      ) : isEnded ? (
        <main>
          <div id="ended-state" className="state-container">
            <div className="ended-card">
              <div className="ended-success-ring">
                <div className="ended-icon-wrap">
                  <i className="ri-checkbox-circle-fill"></i>
                </div>
              </div>
              <h2 className="ended-title">Meeting Complete</h2>
              <p className="ended-sub">AI has processed your transcript and generated a full intelligence report.</p>
              
              <div className="ended-stats" style={{ marginTop: '12px' }}>
                <div className="ended-stat">
                  <i className="ri-chat-1-line"></i>
                  <span>{transcriptLines.length}</span>
                  <span className="stat-label">Lines</span>
                </div>
                <div className="ended-stat-divider"></div>
                <div className="ended-stat">
                  <i className="ri-flashlight-line"></i>
                  <span>AI</span>
                  <span className="stat-label">Powered</span>
                </div>
                <div className="ended-stat-divider"></div>
                <div className="ended-stat">
                  <i className="ri-shield-check-line"></i>
                  <span>Safe</span>
                  <span className="stat-label">Guardrail</span>
                </div>
              </div>

              <div className="ended-cta" style={{ marginTop: '16px' }}>
                <a href={`http://localhost:3000/meetings/${meetingId}`} target="_blank" rel="noreferrer" className="btn btn-cta btn-full" style={{ textDecoration: 'none' }}>
                  <i className="ri-layout-masonry-fill"></i>
                  Open Dashboard
                  <i className="ri-arrow-right-line btn-arrow"></i>
                </a>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main>
          <div id="active-state" className="state-container">
            {/* Live Transcription Section */}
            <div className="section md3-card" id="live-transcript-section">
              <div className="section-header" style={{ justifyContent: "flex-start", gap: "8px" }}>
                <button onClick={() => setIsTranscriptMaximized(!isTranscriptMaximized)} className="btn btn-ghost btn-sm" style={{ color: "var(--primary)", padding: "2px 4px" }}>
                  <i className={isTranscriptMaximized ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: "16px" }}></i>
                </button>
                <h3 className="section-title">
                  <i className="ri-chat-voice-fill" style={{ color: "var(--primary)" }}></i>
                  Live Transcription
                  <span className="count-pill">{transcriptLines.length}</span>
                </h3>
              </div>
              <div className={`smooth-collapse ${isTranscriptMaximized ? '' : 'collapsed'}`}>
                <div className="transcript-feed-box" style={{ maxHeight: isTranscriptMaximized ? '200px' : '40px' }}>
                  {transcriptLines.length === 0 ? (
                    <p className="empty-text">Enable Captions (CC) — live speech will appear here</p>
                  ) : (
                    transcriptLines.map((line, idx) => (
                      <div key={idx} className="transcript-line">
                        <span className="transcript-speaker">
                          <div className="transcript-speaker-avatar">{line.speaker.charAt(0)}</div>
                          {line.speaker}
                        </span>
                        <span className="transcript-text">{line.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={transcriptBottomRef} />
                </div>
              </div>
            </div>

            '''

content = content[:main_start] + main_new + content[main_end:]

# Replace Footer
footer_start = content.find('          </main>\n        </>\n      )}\n\n      {/* Material 3 Expressive Footer (`#1e1f20`) */}')
footer_new = '''          </div>
        </main>
      )}

      {meetingId && !isEnded && (
        <footer className="footer" id="active-footer">
          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-full" style={{ textDecoration: 'none' }}>
            <i className="ri-layout-masonry-line"></i>
            Open Dashboard
          </a>
        </footer>
      )}
    </>
  );
}'''

content = content[:footer_start] + footer_new

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
