"""
ADK Orchestrator — routes triggers to appropriate sub-agents via gRPC Task Bus.
Acts as the root agent managing all specialist agents using the A2A stub.
"""

from enum import Enum
import json
import grpc.aio
import logging
from .. import grpc_bus_pb2
from .. import grpc_bus_pb2_grpc

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
    
    match trigger:
        case AgentTrigger.REALTIME_TICK:
            agent_name = "realtime"
        case AgentTrigger.MEETING_END:
            agent_name = "summary"
        case AgentTrigger.USER_QUERY:
            agent_name = "memory"
        case AgentTrigger.SCHEDULE_FOLLOWUP:
            agent_name = "scheduler"
        case AgentTrigger.LATE_JOIN_RECAP:
            agent_name = "late_join"
        case AgentTrigger.SEND_EMAIL:
            agent_name = "email"
            grpc_payload["summary"] = {
                "title": payload.get("meeting_title", ""),
                "attendees": payload.get("attendees", []),
                "summary": payload.get("summary", ""),
                "action_items": [{"text": item} for item in payload.get("action_items", [])],
                "host_email": payload.get("to_email", ""),
                "user_id": payload.get("user_id", "")
            }
        case AgentTrigger.SEND_SLACK:
            agent_name = "slack"
            grpc_payload["summary"] = {
                "title": payload.get("meeting_title", ""),
                "summary": payload.get("summary", ""),
                "action_items": [{"text": item} for item in payload.get("action_items", [])]
            }
        case _:
            raise ValueError(f"Unknown trigger: {trigger}")

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
