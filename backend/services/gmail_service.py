"""
Gmail API service wrapper.
Handles OAuth2 token management and email sending for smart calendar reminders and meeting insights.
"""

import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ..core.config import settings


def _build_service(token_data: dict):
    """Build Google Gmail service from stored OAuth token dict."""
    creds = Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_CALENDAR_SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


async def send_reminder_email(
    to_emails: list[str],
    subject: str,
    body_text: str,
    token_data: dict | None = None,
) -> dict:
    """
    Send an email notification or smart reminder via Gmail API v1.
    If token_data is None or offline mock token, returns a simulated success response.
    """
    if not to_emails:
        return {"sent": False, "reason": "No recipient emails provided"}

    if not token_data or not token_data.get("access_token"):
        return {"sent": False, "error": "Missing OAuth token data"}

    try:
        service = _build_service(token_data)
        message = MIMEMultipart()
        message["to"] = ", ".join(to_emails)
        message["subject"] = subject
        message.attach(MIMEText(body_text, "plain"))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent_message = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw_message})
            .execute()
        )
        return {
            "sent": True,
            "message_id": sent_message.get("id"),
            "recipients": to_emails,
            "subject": subject,
        }
    except HttpError as e:
        # Fallback cleanly if API fails
        return {
            "sent": False,
            "error": f"Gmail API error: {e.status_code} — {e.reason}",
        }
    except Exception as e:
        return {
            "sent": False,
            "error": str(e),
        }
