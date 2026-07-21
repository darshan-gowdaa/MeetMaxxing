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
from ..core.utils import parse_json_clean

logger = logging.getLogger(__name__)

class AgentTrigger(str, Enum):
    REALTIME_TICK = "realtime_tick"
    MEETING_END = "meeting_end"
    USER_QUERY = "user_query"
    SCHEDULE_FOLLOWUP = "schedule_followup"
    LATE_JOIN_RECAP = "late_join_recap"
    SEND_EMAIL = "send_email"
    SEND_SLACK = "send_slack"
    TRANSCRIPT_CHUNK = "transcript_chunk"

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
    elif trigger == AgentTrigger.TRANSCRIPT_CHUNK:
        agent_name = "transcription"
        grpc_payload = dict(payload)
    elif trigger == AgentTrigger.MEETING_END:
        agent_name = "summary"
        grpc_payload = dict(payload)
    elif trigger == AgentTrigger.SEND_EMAIL:
        agent_name = "email"
        grpc_payload = dict(payload)
        grpc_payload["summary"] = payload
    elif trigger == AgentTrigger.SEND_SLACK:
        agent_name = "slack"
        grpc_payload = dict(payload)
        grpc_payload["summary"] = payload
    elif trigger == AgentTrigger.SCHEDULE_FOLLOWUP:
        agent_name = "scheduler"
        grpc_payload = dict(payload)
    elif trigger == AgentTrigger.LATE_JOIN_RECAP:
        agent_name = "late_join"
        grpc_payload = dict(payload)
    elif trigger == AgentTrigger.USER_QUERY:
        agent_name = "memory"
        grpc_payload = dict(payload)
    else:
        try:
            raw_response, _ = await run_lyzr_agent("Orchestrator Agent - MeetMaxxing", prompt)
            
            routing_data = parse_json_clean(raw_response)
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
                case AgentTrigger.TRANSCRIPT_CHUNK: agent_name = "transcription"
                case AgentTrigger.SEND_EMAIL: 
                    agent_name = "email"
                    grpc_payload["summary"] = payload
                case AgentTrigger.SEND_SLACK:
                    agent_name = "slack"
                    grpc_payload["summary"] = payload
                case _: raise ValueError(f"Unknown trigger fallback: {trigger}")

    # A2A using Lyzr API (direct agent function execution) instead of gRPC stub
    result = {}
    error_msg = ""
    try:
        if agent_name == "memory":
            from ..agents.memory_agent import run_memory_agent
            result = await run_memory_agent(
                question=grpc_payload.get("question", ""),
                org_id=grpc_payload.get("org_id", ""),
                user_id=grpc_payload.get("user_id", "")
            )
        elif agent_name == "scheduler":
            from ..agents.scheduler_agent import run_scheduler_agent
            result = await run_scheduler_agent(
                summary_output=grpc_payload.get("summary", {}),
                attendee_emails=grpc_payload.get("attendees", []),
                calendar_token=grpc_payload.get("token", {}),
                org_id=grpc_payload.get("org_id", "")
            )
        elif agent_name == "summary":
            from ..agents.summary_agent import run_summary_agent
            result = await run_summary_agent(
                meeting_id=meeting_id,
                title=grpc_payload.get("title", ""),
                attendees=grpc_payload.get("attendees", []),
                utterances=grpc_payload.get("utterances", None)
            )
        elif agent_name == "realtime":
            from ..agents.realtime_agent import run_realtime_agent
            result = await run_realtime_agent(
                meeting_id=meeting_id,
                context=grpc_payload.get("context", {}),
                force=grpc_payload.get("force", False)
            )
        elif agent_name == "email":
            from ..agents.email_agent import run_email_agent
            result = await run_email_agent(
                meeting_id=meeting_id,
                summary_output=grpc_payload.get("summary", {})
            )
        elif agent_name == "slack":
            from ..agents.slack_agent import run_slack_agent
            result = await run_slack_agent(
                meeting_id=meeting_id,
                summary_output=grpc_payload.get("summary", {})
            )
        elif agent_name == "late_join":
            from ..agents.late_join_agent import run_late_join_agent
            result = await run_late_join_agent(
                meeting_id=meeting_id
            )
        elif agent_name == "transcription":
            from ..agents.transcription_agent import process_transcript_chunk
            result = await process_transcript_chunk(
                meeting_id=meeting_id,
                raw_text=grpc_payload.get("raw_text", ""),
                speaker=grpc_payload.get("speaker", ""),
                timestamp_ms=grpc_payload.get("timestamp_ms", 0)
            )
        else:
            return {"error": f"Unknown agent: {agent_name}"}
            
        return result
    except Exception as e:
        logger.error(f"A2A dispatch failed for {agent_name}: {e}")
        return {"error": str(e)}
