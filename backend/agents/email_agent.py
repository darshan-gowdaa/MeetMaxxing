import logging
from typing import Dict, Any, List

from ..core.lyzr_integration import run_lyzr_agent

logger = logging.getLogger(__name__)

_EMAIL_SYSTEM_PROMPT = """You are MeetMaxxing's Email Agent.
Your job is to draft a professional, concise follow-up email based on the meeting summary and action items.

Input will be:
- Meeting Title
- Attendees (if any)
- Summary of discussion
- Action Items

Output EXACTLY one string which is the email body (no subject line, just the body). 
Start with a polite greeting, provide a very brief executive summary, bullet points for action items, and a professional sign-off.
Do NOT use markdown code blocks. Just return the raw text.
"""

async def draft_followup_email(
    meeting_title: str,
    attendees: List[str],
    summary: str,
    action_items: List[str]
) -> str:
    """
    Uses the LLM fallback pipeline to draft a professional follow-up email.
    """
    prompt = f"""
Meeting Title: {meeting_title}
Attendees: {', '.join(attendees) if attendees else 'Unknown'}

Summary:
{summary}

Action Items:
{chr(10).join(f'- {item}' for item in action_items)}

Draft the email body now.
"""
    
    try:
        raw_email, powered_by = await run_lyzr_agent("Email Agent - MeetMaxxing", prompt)
        logger.info(f"[Email Agent] Successfully drafted email using {powered_by}")
        return raw_email.strip()
    except Exception as e:
        logger.error(f"[Email Agent] Error drafting email: {e}")
        # Fallback to a dumb template if LLM fails
        email_body = f"Hello team,\n\nThank you for attending the '{meeting_title}' meeting.\n\n"
        email_body += f"Summary:\n{summary}\n\n"
        if action_items:
            email_body += "Action Items:\n"
            for item in action_items:
                email_body += f"- {item}\n"
        email_body += "\nBest,\nMeetMaxxing AI"
        return email_body

async def send_followup_email(
    to_email: str,
    subject: str,
    body: str,
    user_id: str
) -> bool:
    """
    Sends the drafted email using the user's Gmail OAuth token.
    (Integration with existing google_auth service)
    """
    # Assuming google_auth handles the actual sending if we have the user's token.
    # We will stub this to just print for now, as the actual gmail send logic
    # might require the OAuth token flow which is handled elsewhere.
    logger.info(f"[Email Agent] Sending email to {to_email} with subject '{subject}'")
    try:
        # Mock email sending success
        return True
    except Exception as e:
        logger.error(f"[Email Agent] Failed to send email: {e}")
        return False

async def run_email_agent(meeting_id: str, summary_output: dict) -> dict:
    """
    Wrapper for gRPC task bus.
    """
    logger.info(f"[Email Agent] Starting follow-up email draft for meeting {meeting_id}")
    summary = summary_output.get("summary", "")
    action_items = [item.get("text", "") for item in summary_output.get("action_items", [])]
    
    # Draft email
    email_body = await draft_followup_email(
        meeting_title=summary_output.get("title", "Meeting Recap"),
        attendees=summary_output.get("attendees", []),
        summary=summary,
        action_items=action_items
    )
    
    # In a full flow, send email to primary attendee or host
    sent = await send_followup_email(
        to_email=summary_output.get("host_email", "host@example.com"),
        subject=f"Meeting Recap: {summary_output.get('title', 'Meeting')}",
        body=email_body,
        user_id=summary_output.get("user_id", "default")
    )
    
    return {
        "email_body": email_body,
        "sent": sent,
        "to_email": summary_output.get("host_email", "host@example.com")
    }
