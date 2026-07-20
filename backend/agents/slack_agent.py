import logging
import httpx
from typing import Dict, Any, List

from ..core.config import settings

logger = logging.getLogger(__name__)

async def push_to_slack(
    meeting_title: str,
    summary: str,
    action_items: List[str]
) -> bool:
    """
    Pushes meeting summary and action items to a configured Slack channel using Block Kit.
    """
    token = getattr(settings, "SLACK_BOT_TOKEN", "")
    channel = getattr(settings, "SLACK_CHANNEL_ID", "")

    if not token or not channel:
        logger.info("[Slack Agent] SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured. Skipping Slack push.")
        return False

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Meeting Recap: {meeting_title}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Summary*\n{summary}"
            }
        },
        {
            "type": "divider"
        }
    ]

    if action_items:
        action_text = "*Action Items*\n" + "\n".join([f"• {item}" for item in action_items])
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": action_text
            }
        })

    payload = {
        "channel": channel,
        "blocks": blocks,
        "text": f"Meeting Recap for {meeting_title}" # Fallback text
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            if res.status_code == 200:
                data = res.json()
                if data.get("ok"):
                    logger.info(f"[Slack Agent] Successfully pushed to Slack channel {channel}")
                    return True
                else:
                    logger.error(f"[Slack Agent] Slack API returned error: {data.get('error')}")
                    return False
            else:
                logger.error(f"[Slack Agent] HTTP error {res.status_code}: {res.text}")
                return False
    except Exception as e:
        logger.error(f"[Slack Agent] Exception during Slack push: {e}")
        return False

async def run_slack_agent(meeting_id: str, summary_output: dict) -> dict:
    """
    Wrapper for gRPC task bus.
    """
    logger.info(f"[Slack Agent] Pushing summary to Slack for meeting {meeting_id}")
    summary = summary_output.get("summary", "")
    action_items = [item.get("text", "") for item in summary_output.get("action_items", [])]
    
    success = await push_to_slack(
        meeting_title=summary_output.get("title", "Meeting Recap"),
        summary=summary,
        action_items=action_items
    )
    
    return {
        "slack_pushed": success,
        "channel": summary_output.get("slack_channel", "default")
    }
