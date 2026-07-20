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

    def send_slack_message(markdown_content: str) -> str:
        """Sends the formatted markdown content to the team Slack channel."""
        if not token or not channel:
            return "SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured."
            
        payload = {
            "channel": channel,
            "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": markdown_content}}],
            "text": "Meeting Recap"
        }
        try:
            import httpx
            # Use sync httpx for the Lyzr tool to avoid loop issues
            res = httpx.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
                timeout=10.0
            )
            return f"Success: {res.status_code}" if res.status_code == 200 else f"Error: {res.text}"
        except Exception as e:
            return f"Exception: {str(e)}"

    from ..core.lyzr_integration import run_lyzr_agent
    
    prompt = f"Meeting Title: {meeting_title}\nSummary: {summary}\nAction Items: {action_items}\n\nFormat a highly readable Slack markdown update and use your tool to send it."
    
    try:
        await run_lyzr_agent("Slack Agent - MeetMaxxing", prompt, local_tools=[send_slack_message])
        logger.info(f"[Slack Agent] Lyzr agent executed Slack tool for channel {channel}")
        return True
    except Exception as e:
        logger.error(f"[Slack Agent] Lyzr native tool execution failed: {e}")
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
