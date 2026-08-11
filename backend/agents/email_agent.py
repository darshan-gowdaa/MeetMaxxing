import logging
import os
import markdown
import resend
from ..core.lyzr_integration import run_lyzr_agent
from ..core.database import get_supabase_admin

logger = logging.getLogger(__name__)

_EMAIL_SYSTEM_PROMPT = """You are MeetMaxxing's Email Agent.
Your job is to draft a professional, concise follow-up email based on the meeting summary and action items.

Input will be:
- Meeting Title
- Attendees (if any)
- Summary of discussion
- Action Items

Output EXACTLY one string which is the email body formatted in Markdown (no subject line).
Start with a polite greeting (e.g. # Meeting Recap), provide a very brief executive summary, bullet points for action items, and a professional sign-off.
Do NOT use HTML tags. Use markdown for headings (##) and bold (**).
"""

MD3_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<style>
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #f3f4f9;
    color: #1f1f1f;
    margin: 0;
    padding: 32px;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 32px;
    padding: 40px;
    box-shadow: 0 4px 12px rgba(11, 87, 208, 0.05);
  }
  h1, h2, h3 {
    color: #0b57d0;
    margin-top: 0;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  p, li {
    font-size: 16px;
    line-height: 1.6;
    color: #444746;
  }
  ul {
    padding-left: 20px;
  }
  .footer {
    margin-top: 40px;
    font-size: 14px;
    color: #74777f;
    text-align: center;
    border-top: 1px solid #e0e0e0;
    padding-top: 20px;
  }
</style>
</head>
<body>
  <div class="container">
    {content}
    <div class="footer">
      Sent by <strong>MeetMaxxing AI</strong><br>
      You can manage your notification preferences in your dashboard.
    </div>
  </div>
</body>
</html>
"""

async def draft_followup_email(
    meeting_title: str,
    attendees: list[str],
    summary: str,
    action_items: list[str]
) -> str:
    prompt = f"""{_EMAIL_SYSTEM_PROMPT}

Meeting Title: {meeting_title}
Attendees: {', '.join(attendees) if attendees else 'Unknown'}

Summary:
{summary}

Action Items:
{chr(10).join(f'- {item}' for item in action_items)}

Draft a highly professional, well-formatted markdown follow-up email.
Use clear sections:
1. A polite greeting
2. A brief 1-2 sentence executive summary
3. Bulleted action items (assigning names where available)
4. A professional sign-off

Do NOT include subject lines. Return only the final ready-to-send markdown body."""
    
    try:
        raw_email, powered_by = await run_lyzr_agent("Email Agent - MeetMaxxing", prompt)
        logger.info(f"[Email Agent] Successfully drafted email using {powered_by}")
        return raw_email.strip()
    except Exception as e:
        logger.error(f"[Email Agent] Error drafting email: {e}")
        email_body = f"# Meeting Recap: {meeting_title}\n\n"
        email_body += f"## Summary\n{summary}\n\n"
        if action_items:
            email_body += "## Action Items\n"
            for item in action_items:
                email_body += f"- {item}\n"
        email_body += "\nBest,\nMeetMaxxing AI"
        return email_body

async def send_followup_email(
    to_email: str,
    subject: str,
    body_markdown: str,
    user_id: str
) -> bool:
    try:
        supabase = get_supabase_admin()
        res = supabase.table("users").select("notifications").eq("id", user_id).execute()
        if res.data:
            notifs = res.data[0].get("notifications") or {}
            if not notifs.get("email", True):
                logger.info(f"[Email Agent] User {user_id} disabled email notifications. Skipping.")
                return False
    except Exception as e:
        logger.warning(f"[Email Agent] Could not verify notification preferences: {e}")

    html_content = markdown.markdown(body_markdown)
    final_html = MD3_TEMPLATE.replace("{content}", html_content)

    resend_key = os.environ.get("RESEND_API_KEY")
    if not resend_key:
        logger.error("[Email Agent] RESEND_API_KEY not set. Cannot send email.")
        return False

    resend.api_key = resend_key
    
    logger.info(f"[Email Agent] Sending email to {to_email} with subject '{subject}' via Resend")
    try:
        r = resend.Emails.send({
            "from": "MeetMaxxing <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": final_html
        })
        logger.info(f"[Email Agent] Email sent successfully: {r}")
        return True
    except Exception as e:
        logger.error(f"[Email Agent] Failed to send email via Resend: {e}")
        return False

async def run_email_agent(meeting_id: str, summary_output: dict) -> dict:
    logger.info(f"[Email Agent] Starting follow-up email draft for meeting {meeting_id}")
    summary = summary_output.get("summary", "")
    raw_action_items = summary_output.get("action_items", [])
    action_items = [
        item.get("text", str(item)) if isinstance(item, dict) else str(item)
        for item in raw_action_items
    ]
    
    email_body = await draft_followup_email(
        meeting_title=summary_output.get("title", "Meeting Recap"),
        attendees=summary_output.get("attendees", []),
        summary=summary,
        action_items=action_items
    )
    
    user_id = summary_output.get("user_id", "default")
    to_email = summary_output.get("host_email", "host@example.com")
    
    sent = await send_followup_email(
        to_email=to_email,
        subject=f"Meeting Recap: {summary_output.get('title', 'Meeting')}",
        body_markdown=email_body,
        user_id=user_id
    )
    
    return {
        "email_body": email_body,
        "sent": sent,
        "to_email": to_email
    }
