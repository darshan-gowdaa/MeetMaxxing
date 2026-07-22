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
        if "Docs QA Agent - MeetMaxxing" == agent.name:
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
            "name": "Docs QA Agent - MeetMaxxing",
            "role": "Document Intelligence Specialist",
            "goal": "Answer user questions based on uploaded document contexts with rich Markdown formatting, and answer general questions when context is irrelevant.",
            "instructions": "Role: Document Intelligence Specialist. You are a conversational AI answering questions about uploaded documents. Rules: (1) Answer conversationally with rich Markdown (bolding, bullet points, double explicit newlines for paragraphs). (2) If the provided context is relevant, use it. Do NOT include citations like [Context 0] in the text. (3) If context is NOT relevant, use your general knowledge to answer, and do not say 'I couldn't find relevant information'. (4) Output valid JSON. Escape newlines properly.\n\nExample:\nInput: Query=\"What is the project scope?\" Context=...\nOutput: {\"answer\": \"The project scope covers **Phase 1** and **Phase 2**.\\n\\n- Phase 1: MVP\\n- Phase 2: Scale\", \"confidence\": \"high\", \"sources_used\": [0]}",
            "provider": "google/gemini-3-pro-preview",
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
