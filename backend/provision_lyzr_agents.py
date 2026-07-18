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
        {"name": "MeetMaxxing Orchestrator", "role": "Coordinator", "goal": "Route user triggers to the right agent", "instructions": "You listen to the event bus and trigger specific sub-agents."},
        {"name": "MeetMaxxing Realtime Agent", "role": "Assistant", "goal": "Provide live meeting suggestions", "instructions": "You analyze live meeting transcripts and provide suggestions."},
        {"name": "MeetMaxxing Summary Agent", "role": "Summarizer", "goal": "Summarize completed meetings", "instructions": "You extract decisions and action items from transcripts."},
        {"name": "MeetMaxxing Memory Agent", "role": "Archivist", "goal": "Answer cross-meeting questions", "instructions": "You query Qdrant to synthesize answers across multiple meetings."},
        {"name": "MeetMaxxing Email Agent", "role": "Communicator", "goal": "Send meeting summaries via email", "instructions": "You format summaries and dispatch them to Gmail API."},
        {"name": "MeetMaxxing Slack Agent", "role": "Communicator", "goal": "Post summaries to Slack channels", "instructions": "You format summaries for Slack markdown and send webhooks."},
        {"name": "MeetMaxxing Scheduler Agent", "role": "Organizer", "goal": "Schedule follow-up meetings", "instructions": "You detect follow-up commitments and create Google Calendar invites."},
        {"name": "MeetMaxxing Late-Join Agent", "role": "Summarizer", "goal": "Bring late attendees up to speed", "instructions": "You summarize what a late attendee missed in the meeting."},
        {"name": "MeetMaxxing Transcription Agent", "role": "Listener", "goal": "Clean and format live captions", "instructions": "You ingest raw utterances and format them into readable transcripts."}
    ]
    
    print(f"Provisioning {len(core_agents)} core agents...")
    for config in core_agents:
        try:
            studio.create_agent(
                name=config["name"],
                role=config["role"],
                goal=config["goal"],
                instructions=config["instructions"],
                provider="gemini-2.0-flash"
            )
            print(f"Created: {config['name']}")
            time.sleep(1)
        except Exception as e:
            print(f"Failed to create {config['name']}: {e}")
            
    print("Provisioning complete! Your main core agents will now show up in Lyzr Studio.")

if __name__ == "__main__":
    provision_agents()
