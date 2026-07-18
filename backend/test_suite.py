"""
Comprehensive End-To-End Test Suite for MeetMaxxing API and Agents.
Tests:
1. Live STT + Transcript Ingestion (/ingest/start, /ingest/transcript)
2. Live Insights & Late Call Join Recap via Realtime Agent (run_realtime_agent)
3. Meeting End Pipeline & Summary Agent (/meeting/{id}/end, decisions, action items)
4. Multi-Meeting Memory Context & Grounded Q&A (/memory/query via Qdrant)
5. Smart Calendar Reminder & Follow-up Scheduling via Calendar API + Gmail API
"""

import asyncio
import sys
import unittest
from pathlib import Path

if __package__ is None or __package__ == "":
    _parent_dir = str(Path(__file__).resolve().parent.parent)
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)

from backend.core.database import get_supabase_admin
from backend.services.transcript import ingest_chunk, create_meeting_record
from backend.agents.realtime_agent import run_realtime_agent
from backend.agents.summary_agent import run_summary_agent
from backend.agents.memory_agent import run_memory_agent
from backend.agents.scheduler_agent import run_scheduler_agent
from backend.services.guardrails import validate_summary_output
from backend.memory.qdrant_client import ensure_collection, search_memories
from backend.memory.schemas import MemoryFilter, MemoryType


class TestMeetMaxxingPipeline(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await ensure_collection()
        self.org_id = "11111111-1111-1111-1111-111111111111"
        self.user_id = "22222222-2222-2222-2222-222222222222"
        self.meeting_id = "33333333-3333-3333-3333-333333333333"
        supabase = get_supabase_admin()
        try:
            supabase.table("users").upsert({
                "id": self.user_id,
                "org_id": self.org_id,
                "email": "test_ai_copilot@example.com",
                "name": "AI Copilot Tester"
            }).execute()
        except Exception:
            res = supabase.table("users").select("id, org_id").limit(1).execute()
            if res.data:
                self.user_id = res.data[0]["id"]
                self.org_id = res.data[0]["org_id"]

    async def test_01_transcript_ingestion_and_live_insights(self):
        """Test Case 1 & 2: Ingest live chunks and verify realtime insights + late call join recap."""
        print("\n--- Running Test Case 1 & 2: Live Ingestion & Realtime Insights ---")
        # 1. Create meeting record
        record = await create_meeting_record(
            org_id=self.org_id,
            user_id=self.user_id,
            title="Q3 Roadmap & Architecture Review",
            attendees=["rahul@christ.edu", "sriya@christ.edu"],
        )
        self.assertIsNotNone(record)
        m_id = record.get("id", self.meeting_id)

        # 2. Ingest rolling utterances
        utterances = [
            {"meeting_id": m_id, "speaker": "Rahul", "text": "Let's review our Q3 AI architecture.", "timestamp_ms": 1000},
            {"meeting_id": m_id, "speaker": "Sriya", "text": "We need to ensure Gemini Flash API gives under 2s latency for live suggestions.", "timestamp_ms": 15000},
            {"meeting_id": m_id, "speaker": "Rahul", "text": "Also make sure late joiners get instant recap summaries.", "timestamp_ms": 30000},
            {"meeting_id": m_id, "speaker": "Sriya", "text": "I will handle the summary agent and Lyzr integration.", "timestamp_ms": 45000},
            {"meeting_id": m_id, "speaker": "Rahul", "text": "Great, then the architecture looks solid.", "timestamp_ms": 60000},
        ]
        for utt in utterances:
            res = await ingest_chunk(utt)
            self.assertEqual(res["meeting_id"], m_id)

        # 3. Trigger Realtime Agent
        realtime_output = await run_realtime_agent(m_id, context={"title": "Q3 Roadmap", "attendees": ["Rahul", "Sriya"]})
        self.assertIn("suggestions", realtime_output)
        self.assertIn("risks", realtime_output)
        self.assertIn("next_question", realtime_output)
        self.assertIn("recap", realtime_output)
        # Verify late call join recap
        self.assertTrue(len(realtime_output["recap"]) > 0)
        print(f"-> Realtime Recap (Late Join Insights): {realtime_output['recap']}")
        print(f"-> Realtime Suggestions: {realtime_output['suggestions']}")

    async def test_02_meeting_end_and_guardrails(self):
        """Test Case 3: Summary Agent, Lyzr Guardrail groundedness verification, database storage."""
        print("\n--- Running Test Case 3: Meeting End Pipeline & Guardrail Check ---")
        utterances = [
            {"speaker": "Rahul", "text": "We decided to adopt Qdrant vector DB for memory storage.", "timestamp_ms": 1000},
            {"speaker": "Sriya", "text": "I will handle the Google Calendar and Gmail API reminder integration by tomorrow.", "timestamp_ms": 5000},
        ]
        summary = await run_summary_agent(
            meeting_id=self.meeting_id,
            title="AI Memory & Scheduling Sync",
            attendees=["rahul@christ.edu", "sriya@christ.edu"],
        )
        self.assertIn("summary", summary)
        self.assertIn("decisions", summary)
        self.assertIn("action_items", summary)

        # Guardrail check
        guardrail = await validate_summary_output(summary, "\n".join([f"{u['speaker']}: {u['text']}" for u in utterances]))
        self.assertIsNotNone(guardrail.cleaned_output)
        print(f"-> Guardrail Score: {guardrail.score}")
        print(f"-> Extracted Decisions: {guardrail.cleaned_output.get('decisions')}")
        print(f"-> Extracted Action Items: {guardrail.cleaned_output.get('action_items')}")

    async def test_03_multi_meeting_memory_query(self):
        """Test Case 4: Grounded cross-meeting natural language query using Qdrant + Gemini."""
        print("\n--- Running Test Case 4: Cross-Meeting Memory Context & Q&A ---")
        # Upsert some test memories
        from backend.memory.qdrant_client import upsert_memories
        from backend.memory.embeddings import embed_text
        from backend.memory.schemas import MemoryPoint
        import uuid

        text_data = "Rahul confirmed in the last meeting that pricing will be $49/user/month with a 14-day free trial."
        vec = await embed_text(text_data)
        pt = MemoryPoint(
            id=str(uuid.uuid4()),
            vector=vec,
            text=text_data,
            org_id=self.org_id,
            user_id=self.user_id,
            meeting_id="44444444-4444-4444-4444-444444444444",
            memory_type=MemoryType.DECISION,
            meeting_date="2026-07-01",
            speaker_name="Rahul",
        )
        await upsert_memories([pt])

        # Query memory
        mem_answer = await run_memory_agent(
            question="What did Rahul confirm about pricing?",
            org_id=self.org_id,
            user_id=self.user_id,
        )
        self.assertIn("answer", mem_answer)
        self.assertIn("confidence", mem_answer)
        print(f"-> Memory Answer: {mem_answer['answer']}")
        print(f"-> Confidence: {mem_answer['confidence']}")

    async def test_04_scheduler_and_gmail_reminder(self):
        """Test Case 5: Smart Calendar reminder & follow-up invite via Google Calendar API + Gmail API."""
        print("\n--- Running Test Case 5: Smart Calendar & Gmail API Follow-up ---")
        summary_payload = {
            "summary": "Reviewed architecture and finalized Calendar+Gmail reminder flow.",
            "decisions": [{"text": "Deploy Gmail reminder notification service.", "decided_by": "Rahul"}],
            "action_items": [{"text": "Verify email invite links", "owner": "Sriya"}],
            "follow_up": {"required": True, "suggested_topic": "Deployment Check-in", "suggested_attendees": ["rahul@christ.edu", "sriya@christ.edu"]},
        }
        mock_token = {"access_token": "mock_access_token"}
        res = await run_scheduler_agent(
            summary_output=summary_payload,
            attendee_emails=["rahul@christ.edu", "sriya@christ.edu"],
            calendar_token=mock_token,
            org_id=self.org_id,
        )
        self.assertTrue(res.get("scheduled"))
        self.assertIsNotNone(res.get("event_id"))
        self.assertTrue(res.get("gmail_reminder_sent"))
        print(f"-> Scheduled Event ID: {res['event_id']}")
        print(f"-> Calendar Summary: {res['event_summary']}")
        print(f"-> Gmail Reminder Sent: {res['gmail_reminder_sent']}")


if __name__ == "__main__":
    unittest.main()
