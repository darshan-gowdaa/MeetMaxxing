import time
from enum import Enum

from loguru import logger


class AgentTrigger(str, Enum):
    MEETING_END = "meeting_end"
    REALTIME_TICK = "realtime_tick"
    LATE_JOIN_RECAP = "late_join_recap"
    SEND_EMAIL = "send_email"
    SCHEDULE_FOLLOWUP = "schedule_followup"
    MEMORY_QUERY = "memory_query"
    DOCS_QA = "docs_qa"
    TRANSCRIPT_CHUNK = "transcript_chunk"


async def dispatch(trigger: AgentTrigger, payload: dict) -> dict:
    # routes events to the matching agent and logs execution duration
    t0 = time.time()
    try:
        if trigger == AgentTrigger.MEETING_END:
            from .summary_agent import run_summary_agent
            res = await run_summary_agent(
                meeting_id=payload.get("meeting_id", ""),
                title=payload.get("title", ""),
                attendees=payload.get("attendees", []),
                utterances=payload.get("utterances"),
                user_id=payload.get("user_id", ""),
            )
        elif trigger == AgentTrigger.REALTIME_TICK:
            from .realtime_agent import run_realtime_agent
            res = await run_realtime_agent(
                meeting_id=payload.get("meeting_id", ""),
                context=payload.get("context"),
                force=payload.get("force", False),
                user_id=payload.get("user_id", ""),
            )
        elif trigger == AgentTrigger.LATE_JOIN_RECAP:
            from .late_join_agent import generate_late_join_recap
            res = await generate_late_join_recap(
                meeting_id=payload.get("meeting_id", ""),
                force=payload.get("force", False),
                user_id=payload.get("user_id", ""),
            )
        elif trigger == AgentTrigger.SEND_EMAIL:
            from .email_agent import run_email_agent
            res = await run_email_agent(
                meeting_id=payload.get("meeting_id", ""),
                meeting_title=payload.get("meeting_title", ""),
                attendees=payload.get("attendees", []),
                summary=payload.get("summary", ""),
                action_items=payload.get("action_items", []),
                decisions=payload.get("decisions", []),
                send_immediately=payload.get("send_immediately", True),
                to_email=payload.get("to_email", ""),
                user_id=payload.get("user_id", ""),
                summary_output=payload.get("summary_output"),
            )
        elif trigger == AgentTrigger.SCHEDULE_FOLLOWUP:
            from .scheduler_agent import run_scheduler_agent
            res = await run_scheduler_agent(
                summary_output=payload.get("summary", {}),
                attendee_emails=payload.get("attendees", []),
                calendar_token=payload.get("token", {}),
                org_id=payload.get("org_id", ""),
                user_id=payload.get("user_id", ""),
            )
        elif trigger == AgentTrigger.MEMORY_QUERY:
            from .memory_agent import run_memory_agent
            res = await run_memory_agent(
                question=payload.get("question", ""),
                org_id=payload.get("org_id", ""),
                user_id=payload.get("user_id", ""),
                filters=payload.get("filters"),
            )
        elif trigger == AgentTrigger.DOCS_QA:
            from .docs_qa_agent import run_docs_qa_agent
            res = await run_docs_qa_agent(
                question=payload.get("question", ""),
                org_id=payload.get("org_id", ""),
                user_id=payload.get("user_id", ""),
                filters=payload.get("filters"),
            )
        elif trigger == AgentTrigger.TRANSCRIPT_CHUNK:
            from .transcription_agent import process_transcript_chunk
            res = await process_transcript_chunk(
                meeting_id=payload.get("meeting_id", ""),
                raw_text=payload.get("raw_text", ""),
                speaker=payload.get("speaker", ""),
                timestamp_ms=payload.get("timestamp_ms", 0),
                source=payload.get("source", "extension"),
            )
        else:
            logger.error("[Orchestrator] Unknown trigger: {}", trigger)
            return {"error": f"Unknown trigger: {trigger}"}

        duration = round(time.time() - t0, 2)
        logger.info("[Orchestrator] Trigger {} completed in {}s", trigger, duration)
        return res

    except Exception as e:
        logger.exception("[Orchestrator] Error dispatching {}: {}", trigger, e)
        return {"error": str(e)}

