from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class MemoryType(str, Enum):
    TRANSCRIPT = "transcript"
    TRANSCRIPT_CHUNK = "transcript_chunk"
    DECISION = "decision"
    RELATIONSHIP = "relationship"
    ACTION_ITEM = "action_item"
    KEY_TOPIC = "key_topic"


@dataclass
class MemoryPoint:
    """A single point to upsert into Qdrant."""

    id: str                          # UUID string
    vector: list[float]
    text: str                        # raw text content

    # Required metadata (always present)
    org_id: str
    user_id: str
    meeting_id: str
    memory_type: MemoryType
    meeting_date: str                # ISO date string YYYY-MM-DD

    # Optional metadata
    speaker_id: str = ""
    speaker_name: str = ""
    topic: str = ""
    priority: int = 1                # 1 = normal, 2 = high, 3 = critical
    timestamp_ms: int = 0            # utterance timestamp within meeting

    def to_payload(self) -> dict:
        return {
            "text": self.text,
            "org_id": self.org_id,
            "user_id": self.user_id,
            "meeting_id": self.meeting_id,
            "memory_type": self.memory_type.value,
            "meeting_date": self.meeting_date,
            "speaker_id": self.speaker_id,
            "speaker_name": self.speaker_name,
            "topic": self.topic,
            "priority": self.priority,
            "timestamp_ms": self.timestamp_ms,
        }


@dataclass
class MemoryFilter:
    """Used to build Qdrant filter conditions for retrieval."""

    org_id: str
    user_id: str = ""
    meeting_id: str = ""
    speaker_id: str = ""
    topic: str = ""
    memory_type: MemoryType | None = None
    date_from: str = ""              # ISO date YYYY-MM-DD
    date_to: str = ""


@dataclass
class MemoryResult:
    """Returned from Qdrant search."""

    id: str
    score: float
    text: str
    meeting_id: str
    meeting_date: str
    speaker_name: str
    memory_type: str
    topic: str
