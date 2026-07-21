import lyzr
import os
from dotenv import load_dotenv
load_dotenv('.env')

studio = lyzr.Studio(api_key=os.getenv('LYZR_API_KEY'))
agents = studio.list_agents().agents
agent_id = next(a.id for a in agents if a.name == 'Memory Agent - MeetMaxxing')
agent = studio.get_agent(agent_id)

prompt = """Question: what all fishes we getting?

Retrieved context from past meetings:
[Context 0] Meeting 1111 (2026-07-21) - Alice
We are getting salmon, tuna, and cod for the event.

Answer the question conversationally based solely on the context above. 
You MUST format your response as a valid JSON object.
{
  "answer": "Your conversational answer here.",
  "confidence": "high|medium|low",
  "sources_used": [0]
}
"""
try:
    print('Sending payload...')
    res = agent.run(message=prompt)
    print('Res:', res)
except Exception as e:
    print('Error:', e)
