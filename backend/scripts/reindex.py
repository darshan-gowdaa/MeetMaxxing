
import asyncio
import sys
import os
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Ensure root directory in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

from supabase import create_client
from backend.memory.qdrant_client import upsert_memories
from backend.memory.schemas import MemoryPoint, MemoryType
from backend.memory.embeddings import embed_batch

async def main():
    c = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
    meetings = c.table('meetings').select('*').eq('status', 'completed').execute().data
    points = []
    for m in meetings:
        org_id = m['org_id']
        user_id = m['user_id']
        mid = m['id']
        date = (m.get('start_at') or '2026-07-20').split('T')[0]
        decs = m.get('decisions') or []
        for d in decs:
            vec = await embed_batch([d['text']])
            if vec and vec[0]:
                points.append(MemoryPoint(
                    id=str(uuid.uuid4()), vector=vec[0], text=d['text'],
                    org_id=org_id, user_id=user_id, meeting_id=mid,
                    memory_type=MemoryType.DECISION, meeting_date=date,
                    speaker_name=d.get('decided_by', ''), priority=2
                ))
        ais = m.get('action_items') or []
        for ai in ais:
            text = ai.get('text', '') or ai.get('description', '')
            vec = await embed_batch([text])
            if vec and vec[0] and text:
                points.append(MemoryPoint(
                    id=str(uuid.uuid4()), vector=vec[0], text=text,
                    org_id=org_id, user_id=user_id, meeting_id=mid,
                    memory_type=MemoryType.ACTION_ITEM, meeting_date=date,
                    speaker_name=ai.get('owner', '') or ai.get('owner_name', ''), priority=1
                ))
        summary = m.get('summary', '')
        if summary:
            vec = await embed_batch([summary])
            if vec and vec[0]:
                points.append(MemoryPoint(
                    id=str(uuid.uuid4()), vector=vec[0], text=summary,
                    org_id=org_id, user_id=user_id, meeting_id=mid,
                    memory_type=MemoryType.KEY_TOPIC, meeting_date=date,
                    speaker_name='', priority=1
                ))
    if points:
        await upsert_memories(points)
        print(f'Upserted {len(points)} memories.')
    else:
        print('No memories to upsert.')

asyncio.run(main())

