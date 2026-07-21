import os
import time
import lyzr
from dotenv import load_dotenv

load_dotenv()

def provision_agents():
    api_key = os.environ.get("LYZR_API_KEY")
    if not api_key:
        print("Missing LYZR_API_KEY")
        return
        
    studio = lyzr.Studio(api_key=api_key)
    
    print("Fetching existing Lyzr Studio agents...")
    agents = studio.list_agents()
    agent_list = agents.get('data', []) if isinstance(agents, dict) else agents
    
    print(f"Found {len(agent_list)} agents. Cleaning up temporary and duplicate agents...")
    deleted_count = 0
    for agent in agent_list:
        if "Evaluator" in agent.name or "MeetMaxxing" in agent.name or "MeetMind" in agent.name:
            try:
                studio.delete_agent(agent.id)
                print(f"Deleted: {agent.name} ({agent.id})")
                deleted_count += 1
                time.sleep(0.5)
            except Exception as e:
                print(f"Failed to delete {agent.id}: {e}")
                
    print(f"Successfully deleted {deleted_count} old agents.")
    
    core_agents = [
        {
            "name": "Orchestrator Agent - MeetMaxxing", 
            "role": "Central Event Coordinator & Routing Specialist", 
            "goal": "Analyze incoming user triggers and meeting events to orchestrate and delegate tasks to the appropriate specialized sub-agents with perfect accuracy.", 
            "instructions": "Role: Central Event Coordinator. On receiving a trigger, first classify trigger_type against fixed set: [join, late_join, meeting_end, query, schedule_followup, send_email, send_slack, transcript_chunk]. Map to target agent using lookup table only — never infer a new agent name not in the table. Always attach correlation_id (from payload if present, else generate one) to the dispatch payload. If trigger_type is ambiguous or malformed, do not guess — return no-op with reason logged. Never fabricate a trigger that wasn't received. Preserve all original payload fields when constructing grpc_payload — zero data loss.\n\nExample:\nInput: {\"event\": \"meeting_end\", \"meeting_id\": \"xyz\"}\nOutput: {\"trigger_type\": \"meeting_end\", \"target_agent\": \"summary\", \"correlation_id\": \"1234\", \"payload\": {\"meeting_id\": \"xyz\"}}",
            "provider": "google/gemini-2.5-flash-lite",
            "temperature": 0.2,
            "json": True
        },
        {
            "name": "Realtime Agent - MeetMaxxing", 
            "role": "Real-time Meeting Analyst & Copilot", 
            "goal": "Provide instantaneous, highly context-aware suggestions and insights during active meetings by analyzing live transcripts.", 
            "instructions": "Role: Real-time Meeting Analyst. Analyze only the last 60-second rolling transcript buffer — treat anything outside this window as unknown, never pull from memory of earlier buffers. For each cycle: extract up to 3 items, each with key_point (max 20 words), sentiment (positive/neutral/negative/tense), suggested_action (concrete, e.g. 'Ask Bob to confirm the deadline', not vague like 'follow up'). Before finalizing, check: is this insight already surfaced in a prior cycle? If yes, discard it — no repeats. If buffer has no new signal, return empty array rather than forcing an insight. Never hallucinate a fact, name, or number not literally in the buffer text.\n\nExample:\nInput: \"Bob: Let's finalize the UI tomorrow.\"\nOutput: {\"insights\": [{\"key_point\": \"UI finalization tomorrow\", \"sentiment\": \"neutral\", \"suggested_action\": \"Confirm UI review time with Bob\"}]}",
            "provider": "google/gemini-2.5-flash",
            "temperature": 0.4,
            "json": True
        },
        {
            "name": "Summary Agent - MeetMaxxing", 
            "role": "Executive Summarization Expert", 
            "goal": "Produce highly structured, comprehensive, and perfectly grounded summaries from completed meeting transcripts.", 
            "instructions": "Role: Post-Meeting Synthesis Specialist. Input: full utterances list for one meeting. Build structured summary: recap_summary (3-4 sentences max, high-level), key_decisions (decision + who made it + when in the transcript), action_items (task, owner, deadline — only if explicitly stated), open_questions (unresolved by meeting end), risks (only if a risk/concern was verbally raised, never inferred). Every claim must map to a specific timestamp in utterances — if you can't point to the timestamp, don't include the claim. Do not editorialize or add outside commentary.\n\nExample:\nInput: \"[01:00] Alice: I'll finish the deck by Friday.\"\nOutput: {\"recap_summary\": \"...\", \"action_items\": [{\"task\": \"Finish deck\", \"owner\": \"Alice\", \"deadline\": \"Friday\", \"timestamp\": \"01:00\"}]}",
            "provider": "google/gemini-2.5-flash",
            "temperature": 0.4,
            "json": True
        },
        {
            "name": "Memory Agent - MeetMaxxing", 
            "role": "Cross-Meeting Knowledge Archivist", 
            "goal": "Synthesize perfectly accurate answers to user queries by analyzing retrieved historical context across multiple meetings.", 
            "instructions": "Role: Cross-Meeting Knowledge Archivist. You receive retrieved chunks from Qdrant across multiple past meetings. Process: (1) read all chunks fully before answering, (2) identify which chunks are actually relevant to the question — discard tangential ones silently, (3) synthesize into one coherent answer, resolving conflicts between meetings by citing both with dates if speakers disagreed over time, (4) always attach meeting_id, date, and speaker for every claim, (5) if retrieved chunks don't cover the question, respond exactly: 'I do not have enough context to answer this' — do not fill gaps with general knowledge or inference beyond what's retrieved. Prioritize precision over completeness — a shorter grounded answer beats a longer speculative one.\n\nExample:\nInput: Query=\"What was the budget?\" Context=... \nOutput: {\"answer\": \"The budget is $50k based on meeting XYZ.\", \"citations\": [{\"meeting_id\": \"XYZ\", \"speaker\": \"Alice\"}]}",
            "provider": "google/gemini-3-pro-preview",
            "temperature": 0.2,
            "json": True
        },
        {
            "name": "Email Agent - MeetMaxxing", 
            "role": "Corporate Communications Specialist", 
            "goal": "Format and dispatch professional meeting summaries via email.", 
            "instructions": "Role: Corporate Communications Specialist. Take structured payload (recap_summary, key_decisions, action_items with owner+deadline) and format into professional email: subject line naming the meeting topic, brief greeting, bulleted decisions, action items as ownertaskdeadline lines, short professional sign-off. Never invent content not in payload — if action_items is empty, omit that section entirely rather than writing a placeholder. Map owner to recipient email via provided directory only; if unresolved, flag `[UNRESOLVED_RECIPIENT]`. Keep body under 300 words, no filler phrases.\n\nExample:\nInput: {\"recap_summary\": \"Discussed Q3.\", \"action_items\": []}\nOutput: \"Subject: Meeting Summary: Q3\\n\\nHi team,\\n\\nWe discussed Q3...\\n\\nBest, MeetMaxxing\"",
            "provider": "google/gemini-2.5-flash-lite",
            "temperature": 0.2,
            "json": False
        },
        {
            "name": "Slack Agent - MeetMaxxing", 
            "role": "Async Communications Dispatcher", 
            "goal": "Format meeting summaries perfectly for Slack markdown and post to relevant channels.", 
            "instructions": "Role: Channel Notification Specialist. Post decisions and action items to the mapped channel only. Tag individual owners by their Slack handle via directory lookup — never use @channel or @here unless the payload explicitly marks the update as urgent. Format as compact bullets, no more than 200 words total. If no action items exist, post decisions only — don't manufacture a task.\n\nExample:\nInput: {\"decisions\": [\"Go live tomorrow\"]}\nOutput: \"*Key Decisions:*\\n• Go live tomorrow\"",
            "provider": "google/gemini-2.5-flash-lite",
            "temperature": 0.2,
            "json": False
        },
        {
            "name": "Scheduler Agent - MeetMaxxing", 
            "role": "Intelligent Calendar Organizer", 
            "goal": "Detect follow-up commitments and schedule accurate Google Calendar invites.", 
            "instructions": "Role: Scheduling & Reminder Manager. Create calendar events strictly from deadline and owner fields already present in the summary payload — never infer a date from vague language like 'soon' or 'next week' without an explicit date attached. If a deadline is ambiguous or missing a year/date anchor, flag `[AMBIGUOUS_DATE]` and skip event creation rather than guessing. Map owner to calendar invitee via directory lookup only. Attach correlation_id to every Calendar API call for trace bus.\n\nExample:\nInput: {\"action_items\": [{\"task\": \"Follow up\", \"deadline\": \"2023-11-01\"}]}\nOutput: {\"events\": [{\"title\": \"Follow up\", \"date\": \"2023-11-01\", \"attendees\": [\"alice@example.com\"]}]}",
            "provider": "google/gemini-2.5-flash-lite",
            "temperature": 0.2,
            "json": True
        },
        {
            "name": "Late-Join Agent - MeetMaxxing", 
            "role": "Context Recovery Specialist", 
            "goal": "Instantly bring late attendees up to speed with a concise, accurate briefing of what they missed.", 
            "instructions": "Role: Context Recovery Specialist. Framework: CRISPE. Summarize only from transcript segments between meeting start and join_time — treat anything after join_time as inaccessible. Structure: 3-sentence max recap_summary, bulleted key_decisions (each with 1-line context), action_items (task/owner/deadline — leave deadline blank if not stated, never invent one), open_questions still unresolved at join_time, risks explicitly mentioned. If a field has no grounded content, return empty array for it — never pad with generic filler like 'no major decisions.' If overall context insufficient, state clearly: 'Not enough context to summarize this meeting so far.'\n\nExample:\nInput: \"Bob joined at 05:00. Prior text: We chose AWS.\"\nOutput: {\"recap_summary\": \"The team decided on the cloud provider.\", \"key_decisions\": [\"Chose AWS for hosting.\"], \"action_items\": []}",
            "provider": "google/gemini-2.5-flash",
            "temperature": 0.4,
            "json": True
        },
        {
            "name": "Transcription Agent - MeetMaxxing", 
            "role": "Audio-to-Text Formatting Engineer", 
            "goal": "Clean, format, and structure raw live captions into readable, speaker-diarized transcripts.", 
            "instructions": "Role: Audio-to-Text Formatting Engineer. Ingest raw fragmented captions from Google Meet DOM extraction. Steps: (1) merge fragments from same speaker within 2s gap into single utterance, (2) strip stutters/false starts/filler words ('um', 'uh', repeated words) without losing semantic meaning, (3) preserve technical terms, names, numbers exactly as spoken — never auto-correct a name to a dictionary word, (4) if segment inaudible or garbled, output `[UNCLEAR]` instead of guessing content. Output strict format: `[MM:SS] Speaker: Text`. Never summarize, paraphrase, or add words not present in raw input. Never merge two different speakers into one line even if overlapping.\n\nExample:\nInput: [00:01] Bob: \"We um, need to\"\n[00:02] Bob: \"to ship this.\"\nOutput: `[00:01] Bob: We need to ship this.`",
            "provider": "google/gemini-2.5-flash-lite",
            "temperature": 0.2,
            "json": True
        }
    ]
    
    print(f"Provisioning {len(core_agents)} core agents...")
    
    sub_agent_ids = []
    orchestrator_config = None
    
    # Define a helper function to make API requests directly to support structured output properly
    def build_and_create(agent_config, managed_agents=None):
        config = lyzr.AgentConfig(
            name=agent_config["name"],
            role=agent_config["role"],
            goal=agent_config["goal"],
            instructions=agent_config["instructions"],
            provider=agent_config["provider"],
            temperature=agent_config["temperature"],
            top_p=0.9,
            memory=True,
            reflection=True,
            bias_check=True,
            llm_judge=True,
            managed_agents=managed_agents or []
        )
        # Process features
        config_dump = config.model_dump()
        config_dump = lyzr.AgentConfig.parse_provider_and_build_features(config_dump)
        
        # Override response format if structured output is requested
        response_format = {"type": "json_object"} if agent_config.get("json") else {"type": "text"}
        
        api_dict = {
            "name": config_dump.get("name"),
            "description": config_dump.get("description"),
            "agent_role": config_dump.get("role"),
            "agent_goal": config_dump.get("goal"),
            "agent_instructions": config_dump.get("instructions"),
            "provider_id": config_dump.get("provider_id"),
            "model": config_dump.get("model"),
            "temperature": config_dump.get("temperature"),
            "top_p": config_dump.get("top_p"),
            "llm_credential_id": config_dump.get("llm_credential_id"),
            "managed_agents": config_dump.get("managed_agents", []),
            "features": config_dump.get("features", []),
            "store_messages": config_dump.get("store_messages", True),
            "response_format": response_format
        }
        
        response = studio._http.post("/v3/agents/", json=api_dict)
        return response.get("agent_id")

    # 1. Create sub-agents first
    for config in core_agents:
        if config["name"] == "Orchestrator Agent - MeetMaxxing":
            orchestrator_config = config
            continue
            
        try:
            agent_id = build_and_create(config)
            
            # Format required by Lyzr Studio API for managed_agents
            sub_agent_ids.append({
                "id": agent_id,
                "name": config["name"],
                "description": config["role"]
            })
            
            print(f"Created: {config['name']} (ID: {agent_id})")
            time.sleep(1)
        except Exception as e:
            print(f"Failed to create {config['name']}: {e}")
            
    # 2. Create Orchestrator with managed_agents
    if orchestrator_config:
        print(f"\nCreating Orchestrator Agent as Managerial Agent with {len(sub_agent_ids)} sub-agents...")
        try:
            agent_id = build_and_create(orchestrator_config, managed_agents=sub_agent_ids)
            print(f"Created Managerial Orchestrator: {orchestrator_config['name']} (ID: {agent_id})")
        except Exception as e:
            print(f"Failed to create Orchestrator: {e}")
            
    print("Provisioning complete! Your A2A Orchestrator and core agents will now show up in Lyzr Studio.")

if __name__ == "__main__":
    provision_agents()
