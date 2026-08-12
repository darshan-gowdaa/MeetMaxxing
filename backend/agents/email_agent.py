"""
Email Agent — drafts and sends meeting summary emails.

Trigger: SEND_EMAIL trigger from Orchestrator (post-meeting pipeline)
Input:   meeting_id, summary, action_items, attendees
Flow:    Draft email → format Markdown → send via Resend
"""

import logging
import re
import uuid

import resend

from ..core.config import settings
from ..core.utils import is_valid_uuid
from ..core.database import get_supabase_admin

logger = logging.getLogger(__name__)


def _format_action_items_html(items: list) -> str:
    """Format action items list into HTML for the email."""
    if not items:
        return "<p>No action items recorded.</p>"

    rows = ""
    for item in items:
        if isinstance(item, dict):
            text = item.get("text") or item.get("description") or ""
            owner = item.get("owner") or item.get("owner_name") or "Unassigned"
            priority = (item.get("priority") or "medium").capitalize()
            due = item.get("due_date") or "Not specified"
        else:
            text = str(item)
            owner = "Unassigned"
            priority = "Medium"
            due = "Not specified"

        rows += (
            f"<tr>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0'>{text}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0'>{owner}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0'>{priority}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0'>{due}</td>"
            f"</tr>"
        )

    return (
        "<table style='width:100%;border-collapse:collapse;font-size:14px;'>"
        "<thead><tr style='background:#f8fafc'>"
        "<th style='padding:8px;text-align:left'>Task</th>"
        "<th style='padding:8px;text-align:left'>Owner</th>"
        "<th style='padding:8px;text-align:left'>Priority</th>"
        "<th style='padding:8px;text-align:left'>Due</th>"
        "</tr></thead>"
        f"<tbody>{rows}</tbody></table>"
    )


def _build_email_html(meeting_title: str, summary: str, action_items: list, meeting_id: str) -> str:
    """Build full HTML email body for meeting summary."""
    summary_html = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", summary or "No summary available.")
    summary_html = summary_html.replace("\n", "<br>")
    action_items_html = _format_action_items_html(action_items)

    dashboard_url = f"{settings.FRONTEND_URL}/meetings/{meeting_id}"
    return f"""<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;color:#1a202c;background:#f7fafc;margin:0;padding:0">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px 40px">
    <h1 style="color:#fff;margin:0;font-size:24px">Meeting Summary</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0">{meeting_title}</p>
  </div>
  <div style="padding:32px 40px">
    <h2 style="font-size:16px;color:#4a5568;text-transform:uppercase;letter-spacing:.05em">Summary</h2>
    <p style="color:#2d3748;line-height:1.7">{summary_html}</p>
    <h2 style="font-size:16px;color:#4a5568;text-transform:uppercase;letter-spacing:.05em;margin-top:32px">Action Items</h2>
    {action_items_html}
    <div style="margin-top:32px;text-align:center">
      <a href="{dashboard_url}" style="background:#667eea;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Full Summary →</a>
    </div>
  </div>
  <div style="padding:16px 40px;background:#f7fafc;border-top:1px solid #e2e8f0;text-align:center">
    <p style="color:#718096;font-size:12px;margin:0">Sent by MeetMaxxing — your AI meeting copilot</p>
  </div>
</div>
</body>
</html>"""


async def run_email_agent(
    meeting_id: str,
    meeting_title: str = "",
    attendees: list[str] | None = None,
    summary: str = "",
    action_items: list | None = None,
    send_immediately: bool = True,
    to_email: str = "",
    user_id: str = "",
    summary_output: dict | None = None,
) -> dict:
    """
    Draft and send a meeting summary email.

    to_email is expected to be an actual email address.
    Falls back to Supabase lookup if it looks like a UUID.
    """
    # Accept summary_output dict as alternative to explicit params
    if summary_output and not summary:
        summary = summary_output.get("summary", "")
    if summary_output and not action_items:
        action_items = summary_output.get("action_items", [])
    if summary_output and not meeting_title:
        meeting_title = summary_output.get("title", "Meeting Summary")

    action_items = action_items or []

    # Resolve recipient email — to_email may be a UUID from pipeline
    recipient_email = to_email or ""
    if not recipient_email or is_valid_uuid(recipient_email):
        lookup_id = user_id or recipient_email
        if lookup_id:
            try:
                supabase = get_supabase_admin()
                res = supabase.table("users").select("email").eq("id", lookup_id).single().execute()
                if res.data and res.data.get("email"):
                    recipient_email = res.data["email"]
            except Exception as e:
                logger.warning("[Email Agent] Could not resolve email for user_id {}: {}", lookup_id, e)

    if not recipient_email or "@" not in recipient_email:
        logger.warning("[Email Agent] No valid recipient email — skipping send.")
        return {
            "sent": False,
            "reason": "No valid recipient email.",
            "draft_saved": True,
        }

    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY in ["", "your-resend-key"]:
        return {
            "sent": False,
            "draft_saved": True,
            "reason": "RESEND_API_KEY not configured.",
            "to": recipient_email,
        }

    html_body = _build_email_html(
        meeting_title or "Meeting Summary",
        summary,
        action_items,
        meeting_id,
    )

    if not send_immediately:
        return {
            "sent": False,
            "draft_saved": True,
            "draft": {"subject": f"Meeting Summary: {meeting_title}", "body": html_body},
        }

    try:
        resend.api_key = settings.RESEND_API_KEY
        result = resend.Emails.send({
            "from": "MeetMaxxing <noreply@meetmaxxing.app>",
            "to": [recipient_email],
            "subject": f"Meeting Summary: {meeting_title or 'Your Meeting'}",
            "html": html_body,
        })
        logger.info("[Email Agent] Email sent → {} (id: {})", recipient_email, result.get("id"))
        return {
            "sent": True,
            "resend_id": result.get("id"),
            "to": recipient_email,
        }
    except Exception as e:
        logger.error("[Email Agent] Failed to send email: {}", e)
        return {
            "sent": False,
            "error": str(e)[:200],
            "to": recipient_email,
        }
