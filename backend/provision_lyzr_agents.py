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
    
    # 1. Fetch existing agents
    print("Fetching existing Lyzr Studio agents...")
    agents = studio.list_agents()
    agent_list = agents.get('data', []) if isinstance(agents, dict) else agents
    
    # 2. Delete duplicates and temporary evaluators
    print(f"Found {len(agent_list)} agents. Cleaning up temporary and duplicate agents...")
    deleted_count = 0
    for agent in agent_list:
        if "Evaluator" in agent.name or "MeetMaxxing" in agent.name or "MeetMind" in agent.name:
            try:
                studio.delete_agent(agent.id)
                print(f"Deleted: {agent.name} ({agent.id})")
                deleted_count += 1
                time.sleep(0.5) # respect rate limits
            except Exception as e:
                print(f"Failed to delete {agent.id}: {e}")
                
    print(f"Successfully deleted {deleted_count} old agents.")
    
    # 3. Create the Core 9 MeetMaxxing Agents
    core_agents = [
        {
            "name": "Orchestrator Agent - MeetMaxxing", 
            "role": "Central Event Coordinator & Routing Specialist", 
            "goal": "Analyze incoming user triggers and meeting events to orchestrate and delegate tasks to the appropriate specialized sub-agents with perfect accuracy.", 
            "instructions": "You are the central nervous system of MeetMaxxing. Continuously monitor the event bus for real-time and post-meeting triggers. Parse intent, identify required context, and dispatch structured payloads to specific sub-agents (e.g., Summary, Memory, Scheduler) ensuring zero data loss and optimal execution order. Avoid hallucinating triggers."
        },
        {
            "name": "Realtime Agent - MeetMaxxing", 
            "role": "Real-time Meeting Analyst & Copilot", 
            "goal": "Provide instantaneous, highly context-aware suggestions and insights during active meetings by analyzing live transcripts.", 
            "instructions": "Analyze rolling transcript buffers in real-time. Your objective is to extract immediate actionable insights, surface relevant facts, and provide the user with smart suggestions (e.g., 'Ask about X', 'Clarify deadline Y'). Maintain strict groundedness; never hallucinate facts not present in the current live context."
        },
        {
            "name": "Summary Agent - MeetMaxxing", 
            "role": "Executive Summarization Expert", 
            "goal": "Produce highly structured, comprehensive, and perfectly grounded summaries from completed meeting transcripts.", 
            "instructions": "Extract executive summaries, critical decisions, and action items from raw meeting transcripts. Every decision must cite the exact speaker. Every action item must have a clearly assigned owner and deadline if mentioned. Exclude all filler conversation. Ensure 100% groundedness; if it's not in the transcript, do not include it."
        },
        {
            "name": "Memory Agent - MeetMaxxing", 
            "role": "Cross-Meeting Knowledge Archivist", 
            "goal": "Synthesize perfectly accurate answers to user queries by analyzing retrieved historical context across multiple meetings.", 
            "instructions": "You have access to a vector database (Qdrant) of all past meetings. When asked a question, synthesize the retrieved context chunks into a coherent, highly accurate answer. Always cite the meeting or speaker if possible. If the answer is not present in the provided context, explicitly state 'I do not have enough context to answer this' rather than guessing."
        },
        {
            "name": "Email Agent - MeetMaxxing", 
            "role": "Corporate Communications Specialist", 
            "goal": "Format and dispatch professional meeting summaries via email.", 
            "instructions": "Take structured meeting data (summaries, decisions, action items) and format it into a pristine, professional email layout. Ensure tone is appropriate for corporate environments. Prepare the payload perfectly for the Gmail API integration, ensuring all recipients are correctly parsed and mapped."
        },
        {
            "name": "Slack Agent - MeetMaxxing", 
            "role": "Async Communications Dispatcher", 
            "goal": "Format meeting summaries perfectly for Slack markdown and post to relevant channels.", 
            "instructions": "Convert structured meeting outcomes into highly readable, engaging Slack markdown (using block quotes, bolding, and bullet points). Extract @mentions where possible and format the webhook payload to ensure maximum visibility and clarity for async team members."
        },
        {
            "name": "Scheduler Agent - MeetMaxxing", 
            "role": "Intelligent Calendar Organizer", 
            "goal": "Detect follow-up commitments and schedule accurate Google Calendar invites.", 
            "instructions": "Analyze meeting summaries for implied or explicit follow-up commitments. Extract the required attendees, proposed topics, and date/time constraints. Generate the exact payload required to create a Google Calendar invite, resolving ambiguous time references based on the meeting date."
        },
        {
            "name": "Late-Join Agent - MeetMaxxing", 
            "role": "Context Recovery Specialist", 
            "goal": "Instantly bring late attendees up to speed with a concise, accurate briefing of what they missed.", 
            "instructions": "When a user joins late, analyze the transcript from the start of the meeting up to their join time. Provide a rapid, bulleted briefing of key topics discussed, decisions already made, and the current topic of conversation. Be brief and highly relevant to minimize disruption."
        },
        {
            "name": "Transcription Agent - MeetMaxxing", 
            "role": "Audio-to-Text Formatting Engineer", 
            "goal": "Clean, format, and structure raw live captions into readable, speaker-diarized transcripts.", 
            "instructions": "Ingest raw, fragmented utterances from live audio streams. Clean up stutters, false starts, and filler words without losing semantic meaning. Format the output into clean `[MM:SS] Speaker: Text` format, ensuring the transcript is highly readable for downstream agents."
        }
    ]
    
    print(f"Provisioning {len(core_agents)} core agents...")
    for config in core_agents:
        try:
            studio.create_agent(
                name=config["name"],
                role=config["role"],
                goal=config["goal"],
                instructions=config["instructions"],
                provider="gemini-2.0-flash",
                temperature=0.1,
                top_p=0.9,
                memory=True,
                reflection=True,      # Native Evaluator
                bias_check=True,      # Native Evaluator
                llm_judge=True        # Native Evaluator
            )
            print(f"Created: {config['name']}")
            time.sleep(1)
        except Exception as e:
            print(f"Failed to create {config['name']}: {e}")
            
    print("Provisioning complete! Your main core agents will now show up in Lyzr Studio.")

if __name__ == "__main__":
    provision_agents()
