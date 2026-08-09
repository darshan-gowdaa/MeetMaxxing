import asyncio

import lyzr

from .config import settings

_studio: lyzr.Studio | None = None
_agent_cache: dict[str, lyzr.Agent] = {}

def get_studio() -> lyzr.Studio:
    global _studio
    if _studio is None:
        if not settings.LYZR_API_KEY or settings.LYZR_API_KEY in ["mock-key", ""]:
            raise ValueError("LYZR_API_KEY not configured")
        _studio = lyzr.Studio(api_key=settings.LYZR_API_KEY)
    return _studio

def get_lyzr_agent(name: str) -> lyzr.Agent:
    global _agent_cache
    if name in _agent_cache:
        return _agent_cache[name]
    
    studio = get_studio()
    # Note: list_agents might be sync or async depending on the SDK version, 
    # but based on provision script it is sync.
    agents = studio.list_agents()
    agent_list = agents.get('data', []) if isinstance(agents, dict) else agents
    
    for a in agent_list:
        if a.name == name:
            agent = studio.get_agent(a.id)
            _agent_cache[name] = agent
            return agent
            
    raise ValueError(f"Agent '{name}' not found in Lyzr Studio")

async def _llm_direct_fallback(prompt: str) -> tuple[str, str]:
    """Route through the full LLM fallback chain: Gemini → Groq → OpenRouter → Perplexity."""
    try:
        from .llm_fallback import generate_content_with_fallback
        text, provider = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            max_tokens=4096,
            bypass_cache=True,
        )
        if text and text.strip():
            return text.strip(), provider
    except Exception as e:
        print(f"[Lyzr Integration] Full fallback chain failed: {e}")

    raise RuntimeError("All LLM providers (Lyzr, Gemini, Groq, OpenRouter, Perplexity) failed or unconfigured.")


async def run_lyzr_agent(name: str, prompt: str, session_id: str | None = None, local_tools: list | None = None, knowledge_bases: list | None = None) -> tuple[str, str]:
    """
    Fetches the agent from Lyzr Studio by name and executes it via Lyzr SDK.
    If Lyzr Studio fails, falls back seamlessly to Gemini Flash / Groq.
    Returns (response_text, powered_by_string).
    """
    try:
        loop = asyncio.get_event_loop()
        agent = await loop.run_in_executor(None, get_lyzr_agent, name)
        
        kwargs = {}
        if session_id:
            kwargs["session_id"] = session_id
        if local_tools:
            kwargs["local_tools"] = local_tools
        if knowledge_bases:
            kwargs["knowledge_bases"] = knowledge_bases
            
        def _sync_call():
            if hasattr(agent, "chat"):
                return agent.chat(prompt, **kwargs)
            return agent.run(message=prompt, **kwargs)

        response = await loop.run_in_executor(None, _sync_call)
        
        text = response.response if hasattr(response, "response") else str(response)
        if text and text.strip():
            return text.strip(), "AI Synthesized Answer"
    except Exception as e:
        print(f"[Lyzr Integration] Lyzr agent '{name}' failed ({e}). Falling back to Gemini/Groq...")

    return await _llm_direct_fallback(prompt)
