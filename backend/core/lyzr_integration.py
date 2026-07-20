import asyncio
from typing import Dict, Any, Optional
import lyzr
from .config import settings

_studio: Optional[lyzr.Studio] = None
_agent_cache: Dict[str, lyzr.Agent] = {}

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
    from google import genai
    from .config import settings
    
    if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your-"):
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=settings.GEMINI_FLASH_MODEL or "gemini-2.5-flash",
                contents=prompt,
            )
            if response.text:
                return response.text.strip(), "Gemini 2.5 Flash"
        except Exception as gemini_err:
            print(f"[LLM Fallback] Gemini error: {gemini_err}")
            
    groq_key = getattr(settings, "GROQ_API_KEY", "")
    if groq_key and groq_key.strip():
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                res = await http_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key.strip()}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data["choices"][0]["message"]["content"]
                    return text.strip(), "Groq Llama-3.3 70B"
        except Exception as groq_err:
            print(f"[LLM Fallback] Groq error: {groq_err}")

    raise RuntimeError("All LLM providers (Lyzr, Gemini, Groq) failed or unconfigured.")


async def run_lyzr_agent(name: str, prompt: str, session_id: Optional[str] = None, local_tools: Optional[list] = None, knowledge_bases: Optional[list] = None) -> tuple[str, str]:
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
