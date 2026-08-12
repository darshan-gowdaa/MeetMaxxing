"""
Agent Orchestrator — dispatches agent triggers to the appropriate agent functions.

Routes AgentTrigger events to specialist agents.
All agents are called directly via Python function calls (not gRPC) for simplicity.
"""

from enum import Enum

from loguru import logger


class AgentTrigger(str, Enum):
    MEETING_END = "meeting_end"
    REALTIME_TICK = "realtime_tick"
    LATE_JOIN_RECAP = "late_join_recap"
    SEND_EMAIL = "send_email"
    SCHEDULE_FOLLOWUP = "schedule_followup"


async def dispatch(trigger: AgentTrigger, payload: dict) -> dict:
    """Route a trigger event to the correct agent."""
    try:
        if trigger == AgentTrigger.MEETING_END:
            from .summary_agent import run_summary_agent
            return await run_summary_agent(
                meeting_id=payload.get("meeting_id", ""),
                title=payload.get("title", ""),
                attendees=payload.get("attendees", []),
                utterances=payload.get("utterances"),
            )

        if trigger == AgentTrigger.REALTIME_TICK:
            from .realtime_agent import run_realtime_agent
            return await run_realtime_agent(
                meeting_id=payload.get("meeting_id", ""),
                context=payload.get("context"),
                force=payload.get("force", False),
            )

        if trigger == AgentTrigger.LATE_JOIN_RECAP:
            from .late_join_agent import generate_late_join_recap
            return await generate_late_join_recap(
                meeting_id=payload.get("meeting_id", ""),
                force=payload.get("force", False),
            )

        if trigger == AgentTrigger.SEND_EMAIL:
            from .email_agent import run_email_agent
            return await run_email_agent(
                meeting_id=payload.get("meeting_id", ""),
                meeting_title=payload.get("meeting_title", ""),
                attendees=payload.get("attendees", []),
                summary=payload.get("summary", ""),
                action_items=payload.get("action_items", []),
                send_immediately=payload.get("send_immediately", True),
                to_email=payload.get("to_email", ""),
                user_id=payload.get("user_id", ""),
            )

        if trigger == AgentTrigger.SCHEDULE_FOLLOWUP:
            from .scheduler_agent import run_scheduler_agent
            return await run_scheduler_agent(
                summary_output=payload.get("summary", {}),
                attendee_emails=payload.get("attendees", []),
                calendar_token=payload.get("token", {}),
                org_id=payload.get("org_id", ""),
            )

        logger.error("[Orchestrator] Unknown trigger: {}", trigger)
        return {"error": f"Unknown trigger: {trigger}"}

    except Exception as e:
        logger.exception("[Orchestrator] Error dispatching {}: {}", trigger, e)
        return {"error": str(e)}
