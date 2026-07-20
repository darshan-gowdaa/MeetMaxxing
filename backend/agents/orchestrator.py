"""
ADK Orchestrator — routes triggers to appropriate sub-agents via gRPC Task Bus.
Acts as the root agent managing all specialist agents using the A2A stub.
"""

from enum import Enum
import json
import grpc.aio
import logging
from ..grpc_bus import grpc_bus_pb2
from ..grpc_bus import grpc_bus_pb2_grpc

logger = logging.getLogger(__name__)

class AgentTrigger(str, Enum):
    REALTIME_TICK = "realtime_tick"
    MEETING_END = "meeting_end"
    USER_QUERY = "user_query"
    SCHEDULE_FOLLOWUP = "schedule_followup"
    LATE_JOIN_RECAP = "late_join_recap"
    SEND_EMAIL = "send_email"
    SEND_SLACK = "send_slack"

async def dispatch(trigger: AgentTrigger, payload: dict) -> dict:
    """
    Central dispatcher — routes to correct agent based on trigger type over gRPC A2A stub.
    """
    agent_name = ""
    meeting_id = payload.get("meeting_id", "default_meeting")
    
    grpc_payload = dict(payload)
    
    from ..core.lyzr_integration import run_lyzr_agent
    
    prompt = f"Incoming Trigger: {trigger.value}\nRaw Payload: {json.dumps(payload)}\n\nDetermine the exact agent_name (realtime, summary, memory, scheduler, late_join, email, slack, transcription) and construct the final grpc_payload dictionary based on your instructions. Return ONLY valid JSON: {{\"agent_name\": \"...\", \"grpc_payload\": {{...}}}}"
    
    # Fast path for realtime to avoid latency
    if trigger == AgentTrigger.REALTIME_TICK:
        agent_name = "realtime"
        grpc_payload = dict(payload)
    else:
        try:
            raw_response, _ = await run_lyzr_agent("Orchestrator Agent - MeetMaxxing", prompt)
            
            # Clean JSON
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
                
            routing_data = json.loads(cleaned.strip())
            agent_name = routing_data.get("agent_name", "")
            grpc_payload = routing_data.get("grpc_payload", dict(payload))
        except Exception as e:
            logger.error(f"[Orchestrator] Lyzr routing failed, falling back to manual routing: {e}")
            agent_name = ""
            grpc_payload = dict(payload)
            match trigger:
                case AgentTrigger.MEETING_END: agent_name = "summary"
                case AgentTrigger.USER_QUERY: agent_name = "memory"
                case AgentTrigger.SCHEDULE_FOLLOWUP: agent_name = "scheduler"
                case AgentTrigger.LATE_JOIN_RECAP: agent_name = "late_join"
                case AgentTrigger.SEND_EMAIL: 
                    agent_name = "email"
                    grpc_payload["summary"] = payload
                case AgentTrigger.SEND_SLACK:
                    agent_name = "slack"
                    grpc_payload["summary"] = payload
                case _: raise ValueError(f"Unknown trigger fallback: {trigger}")

    try:
        async with grpc.aio.insecure_channel('localhost:50051') as channel:
            stub = grpc_bus_pb2_grpc.AgentTaskBusStub(channel)
            request = grpc_bus_pb2.TaskRequest(
                agent_name=agent_name,
                meeting_id=meeting_id,
                payload_json=json.dumps(grpc_payload)
            )
            response = await stub.DispatchTask(request)
            
            if response.success:
                return json.loads(response.result_json) if response.result_json else {}
            else:
                logger.error(f"Agent {agent_name} failed: {response.error_message}")
                return {"error": response.error_message}
    except Exception as e:
        logger.error(f"gRPC dispatch failed: {e}")
        return {"error": str(e)}
