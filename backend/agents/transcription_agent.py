import logging
import re

logger = logging.getLogger(__name__)

# filler words and speech artifacts commonly captured in speech to text
_FILLER_WORDS = re.compile(
    r"\b(um+|uh+|erm+|ah+|like,\s*like|you know,\s*you know)\b",
    re.IGNORECASE,
)
_REPEATED_WORDS = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)


def clean_speech_text(text: str) -> str:
    # cleans up stutters, filler words, and awkward whitespace from live speech
    if not text:
        return ""
    cleaned = text.strip()
    cleaned = _FILLER_WORDS.sub("", cleaned)
    cleaned = _REPEATED_WORDS.sub(r"\1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]

    return cleaned


async def process_transcript_chunk(
    meeting_id: str,
    raw_text: str,
    speaker: str,
    timestamp_ms: int,
    source: str = "extension",
) -> dict:
    # processes an incoming utterance chunk and normalizes the speaker and text
    cleaned_text = clean_speech_text(raw_text)
    normalized_speaker = speaker.strip() if speaker and speaker.strip() else "Speaker"

    # drop noise artifacts like bare brackets or music markers
    is_noise = bool(re.match(r"^\[(?:music|applause|laughter|silence)\]$", cleaned_text, re.IGNORECASE))
    is_valid = bool(cleaned_text and not is_noise)

    return {
        "meeting_id": meeting_id,
        "speaker": normalized_speaker,
        "raw_text": raw_text,
        "text": cleaned_text,
        "timestamp_ms": timestamp_ms,
        "source": source,
        "is_valid": is_valid,
        "processed": True,
    }

