"""
Post-meeting processing pipeline service.
Handles summary generation, guardrail validation, memory embedding,
calendar event creation, and follow-up email notifications.
"""

import asyncio
import logging
import re
import uuid
from datetime import UTC, datetime

from ..agents.orchestrator import AgentTrigger, dispatch
from ..core.database import ensure_meeting_record, get_supabase_admin
from ..core.redis_client import get_full_transcript
from ..core.utils import generate_meeting_title, is_valid_uuid
from ..memory.embeddings import chunk_transcript, embed_batch
from ..memory.qdrant_client import upsert_memories
from ..memory.schemas import MemoryPoint, MemoryType
from ..services.guardrails import validate_summary_output
from ..services.transcript import persist_transcript_to_db

logger = logging.getLogger(__name__)


async def run_end_pipeline(
    meeting_id: str,
    title: str,
    attendees: list[str],
    max_participants: int,
    calendar_token: dict | None,
    org_id: str,
    user_id: str,
) -> None:
    """Background task — full post-meeting processing pipeline."""
    final_title: str = title or "Untitled Meeting"
    logger.info(f"[MeetMaxxing END PIPELINE] Starting pipeline for {meeting_id}...")
    supabase = get_supabase_admin()

    try:
        meeting_row = ensure_meeting_record(
            supabase, meeting_id, org_id, user_id, title
        )
        target_id = meeting_row.get("id") or meeting_id
        google_code = meeting_row.get("google_meet_link") or (
            meeting_id if not is_valid_uuid(meeting_id) else None
        )

        # Mark as processing immediately
        if target_id and is_valid_uuid(target_id):
            try:
                supabase.table("meetings").update({"status": "processing"}).eq(
                    "id", target_id
                ).execute()
            except Exception:
                pass

        # get transcript
        utterances = await get_full_transcript(meeting_id)
        if not utterances and google_code:
            utterances = await get_full_transcript(google_code)
        if not utterances and target_id:
            utterances = await get_full_transcript(target_id)

        old_utterances = (
            meeting_row.get("transcript_data")
            if meeting_row and meeting_row.get("transcript_data")
            else []
        )

        if utterances and old_utterances:
            seen_ids = {u.get("id") for u in old_utterances if u.get("id")}
            merged = list(old_utterances)
            for u in utterances:
                if u.get("id") and u.get("id") not in seen_ids:
                    merged.append(u)
                    seen_ids.add(u.get("id"))
            utterances = merged
        elif not utterances and old_utterances:
            utterances = old_utterances

        # Prefer AI cleaned transcripts (source="audio"). Keep DOM transcripts only if no AI chunk exists for that timestamp.
        if utterances:
            ai_times = {
                u.get("timestamp_ms") for u in utterances if u.get("source") == "audio"
            }
            utterances = [
                u
                for u in utterances
                if u.get("source") == "audio" or u.get("timestamp_ms") not in ai_times
            ]

        # Persist transcript to DB if target_id exists
        if target_id and utterances:
            await persist_transcript_to_db(target_id, utterances)

        if not utterances:
            logger.warning(
                f"No utterances found for meeting {meeting_id}, proceeding with empty transcript to ensure summary generation."
            )
            if target_id:
                supabase.table("meetings").update({"status": "no_transcript"}).eq(
                    "id", target_id
                ).execute()
            # DO NOT RETURN, continue pipeline to generate summary

        if google_code:
            match = re.search(
                r"([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3})", google_code.lower()
            )
            if match:
                google_code = match.group(1)

        # Determine fallback default title
        fallback_default_title = generate_meeting_title(
            title or (meeting_row.get("title") if meeting_row else ""), google_code
        )

        # gen summary
        logger.info(
            f"Dispatching MEETING_END for {meeting_id} with {len(utterances)} utterances"
        )
        summary = await dispatch(
            AgentTrigger.MEETING_END,
            {
                "meeting_id": target_id or meeting_id,
                "title": fallback_default_title,
                "attendees": attendees,
                "utterances": utterances,
                "user_id": user_id,
            },
        )
        logger.info(f"Dispatch MEETING_END returned for {meeting_id}")

        if summary.get("error"):
            logger.error(f"Failed to generate summary: {summary.get('error')}")
            summary["summary"] = f"Error generating summary: {summary.get('error')}"

        # lyzr checks
        raw_transcript = summary.pop("raw_transcript", "")
        guardrail_result = await validate_summary_output(summary, raw_transcript)
        final_summary = guardrail_result.cleaned_output

        # save to db
        today = datetime.now(UTC).date().isoformat()

        if target_id:
            final_sum_text = (
                final_summary.get("summary")
                or final_summary.get("executive_summary")
                or final_summary.get("recap")
                or ""
            )
            if not final_sum_text and "error" in summary:
                final_sum_text = summary["error"]
            if not final_sum_text:
                final_sum_text = "The meeting was brief with limited context, but it has been successfully logged."

            # Determine title: Always use AI-generated title on meeting save,
            # but leave it default if it's short or has no meeting desc/transcript.
            total_transcript_words = (
                sum(len(str(u.get("text", "")).split()) for u in utterances)
                if utterances
                else 0
            )
            is_short_or_no_desc = (
                len(utterances) < 2
                or total_transcript_words < 15
                or not final_sum_text
                or "brief with limited context" in final_sum_text.lower()
                or "too brief" in final_sum_text.lower()
                or "no transcript" in final_sum_text.lower()
                or "error generating summary" in final_sum_text.lower()
            )

            if is_short_or_no_desc:
                final_title = fallback_default_title
            else:
                ai_title = (
                    (final_summary.get("title") or "").strip().strip('"').strip("'")
                )
                if not ai_title or ai_title.lower() in {
                    "untitled meeting",
                    "google meet",
                    "google meet session",
                    "meeting",
                }:
                    try:
                        from ..core.llm_fallback import generate_content_with_fallback

                        decisions_snippet = "; ".join(
                            d.get("text", "") if isinstance(d, dict) else str(d)
                            for d in (final_summary.get("decisions") or [])[:3]
                        )
                        title_prompt = (
                            "Generate a single concise, professional 3-6 word title for this meeting based on its summary.\n"
                            f"Summary: {final_sum_text}\n"
                            f"Decisions: {decisions_snippet or 'None'}\n"
                            "Do not use generic words like 'Meeting' or 'Google Meet'.\n"
                            "Return ONLY the title string, no quotes, no markdown, no other text."
                        )
                        gen_title, _ = await generate_content_with_fallback(
                            prompt=title_prompt,
                            temperature=0.3,
                            max_tokens=30,
                            user_id=user_id,
                        )
                        if gen_title and gen_title.strip():
                            ai_title = gen_title.strip().strip('"').strip("'")
                    except Exception as title_err:
                        logger.warning(
                            f"Failed to generate fallback AI title: {title_err}"
                        )

                final_title = ai_title if ai_title else fallback_default_title

            # Force status to completed so the UI always displays the summary
            final_status = "completed"

            # Compute max union of participants
            all_participants = set(attendees or [])
            if meeting_row and meeting_row.get("attendees"):
                all_participants.update(meeting_row.get("attendees"))
            for u in utterances:
                spk = u.get("speaker")
                if spk and spk not in {"Unknown", "System", ""}:
                    all_participants.add(spk)
            final_attendees_list = list(all_participants)

            # Pad with dummy participants to match max_participants count
            current_count = len(final_attendees_list)
            if max_participants > current_count:
                for i in range(current_count + 1, max_participants + 1):
                    final_attendees_list.append(f"Participant {i}")

            supabase.table("meetings").update(
                {
                    "title": final_title,
                    "summary": final_sum_text,
                    "attendees": final_attendees_list,
                    "decisions": final_summary.get("decisions", []),
                    "follow_up": final_summary.get("follow_up", {}),
                    "guardrail_score": guardrail_result.score,
                    "status": final_status,
                }
            ).eq("id", target_id).execute()

        # save action items in a single batch
        if target_id:
            _valid_priorities = {"high", "medium", "low"}
            action_items_to_insert = []
            for ai in final_summary.get("action_items") or []:
                raw_priority = (ai.get("priority") or "medium").strip().lower()
                priority = (
                    raw_priority if raw_priority in _valid_priorities else "medium"
                )

                raw_due_date = ai.get("due_date")
                due_date = (
                    raw_due_date
                    if raw_due_date
                    and re.match(r"^\d{4}-\d{2}-\d{2}$", str(raw_due_date).strip())
                    else None
                )

                action_items_to_insert.append(
                    {
                        "id": str(uuid.uuid4()),
                        "meeting_id": target_id,
                        "org_id": org_id,
                        "description": ai.get("text", ""),
                        "owner_name": ai.get("owner", "Unassigned"),
                        "priority": priority,
                        "due_date": due_date,
                        "status": "open",
                    }
                )
            if action_items_to_insert:
                try:
                    await asyncio.to_thread(
                        lambda: (
                            supabase.table("action_items")
                            .insert(action_items_to_insert)
                            .execute()
                        )
                    )
                except Exception as e:
                    logger.error(f"Failed to batch insert action items: {e}")

        # embed for qdrant
        chunks = chunk_transcript(utterances)
        decisions_list = final_summary.get("decisions") or []
        texts_to_embed = [c["text"] for c in chunks] if chunks else []
        dec_texts = [d["text"] for d in decisions_list if d.get("text")]

        all_vectors = await embed_batch(texts_to_embed + dec_texts)
        chunk_vectors = all_vectors[: len(texts_to_embed)]
        dec_vectors = all_vectors[len(texts_to_embed) :]

        memory_points = []
        if chunks:
            for i, (chunk, vec) in enumerate(zip(chunks, chunk_vectors)):
                memory_points.append(
                    MemoryPoint(
                        id=str(uuid.uuid4()),
                        vector=vec,
                        text=chunk["text"],
                        org_id=org_id,
                        user_id=user_id,
                        meeting_id=meeting_id,
                        memory_type=MemoryType.TRANSCRIPT_CHUNK,
                        meeting_date=today,
                        speaker_name=chunk.get("speaker_name", ""),
                        timestamp_ms=chunk.get("timestamp_ms", 0),
                    )
                )

        # Store decisions
        for dec, vec in zip(decisions_list, dec_vectors):
            if not vec:
                continue
            memory_points.append(
                MemoryPoint(
                    id=str(uuid.uuid4()),
                    vector=vec,
                    text=dec.get("text", ""),
                    org_id=org_id,
                    user_id=user_id,
                    meeting_id=meeting_id,
                    memory_type=MemoryType.DECISION,
                    meeting_date=today,
                    speaker_name=dec.get("decided_by", ""),
                    priority=2 if dec.get("confidence") == "high" else 1,
                )
            )

        if memory_points:
            await upsert_memories(memory_points)

        # schedule follow-up and send gmail reminder if needed
        if not calendar_token:
            try:
                user_res = (
                    supabase.table("users")
                    .select("calendar_token")
                    .eq("id", user_id)
                    .single()
                    .execute()
                )
                if user_res.data:
                    calendar_token = user_res.data.get("calendar_token")
            except Exception:
                calendar_token = None

        if final_summary.get("follow_up", {}).get("required") or attendees:
            try:
                if not calendar_token or not calendar_token.get("access_token"):
                    supabase.table("meetings").update(
                        {
                            "scheduling_result": {
                                "status": "skipped",
                                "reason": "No Google Calendar OAuth token provided. Connect your Google Calendar in Settings to automatically send invites and follow-up reminders.",
                            }
                        }
                    ).eq("id", target_id or meeting_id).execute()
                else:
                    schedule_result = await dispatch(
                        AgentTrigger.SCHEDULE_FOLLOWUP,
                        {
                            "summary": final_summary,
                            "attendees": attendees,
                            "token": calendar_token,
                            "org_id": org_id,
                            "user_id": user_id,
                        },
                    )
                    supabase.table("meetings").update(
                        {"scheduling_result": schedule_result}
                    ).eq("id", target_id or meeting_id).execute()
            except Exception as e:
                logger.warning(f"Could not persist scheduling_result: {e}")

        # send notifications
        # Send email to organizer
        email_result = await dispatch(
            AgentTrigger.SEND_EMAIL,
            {
                "meeting_id": target_id or meeting_id,
                "meeting_title": final_title,
                "attendees": attendees,
                "summary": final_summary.get("summary", ""),
                "action_items": [
                    ai.get("text") for ai in (final_summary.get("action_items") or [])
                ],
                "send_immediately": True,
                "to_email": user_id,
                "user_id": user_id,
            },
        )

        # Log email result (skip saving to DB as column doesn't exist)
        if email_result.get("sent"):
            logger.info("Email sent successfully to user.")
        else:
            logger.warning(f"Email send result: {email_result}")

    except Exception as e:
        logger.error(
            f"Error in run_end_pipeline for meeting {meeting_id}: {e}", exc_info=True
        )
        try:
            local_target = locals().get("target_id") or meeting_id
            if local_target and is_valid_uuid(local_target):
                supabase.table("meetings").update(
                    {
                        "status": "completed",
                        "summary": "An error occurred while generating the meeting summary. Please try again later.",
                    }
                ).eq("id", local_target).execute()
        except Exception as inner_e:
            logger.error(f"Failed to update error status for {meeting_id}: {inner_e}")
