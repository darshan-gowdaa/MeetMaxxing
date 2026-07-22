import os
from dotenv import load_dotenv
from supabase import create_client
from collections import defaultdict

load_dotenv('backend/.env')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("Fetching all meetings...")
data = supabase.table('meetings').select('id, title, summary, transcript_data, created_at').execute().data

# Group by title
by_title = defaultdict(list)
for m in data:
    if m.get('title') and m.get('title').startswith('Meet -'):
        by_title[m['title']].append(m)

deleted_count = 0
for title, meetings in by_title.items():
    if len(meetings) > 1:
        # Sort by created_at desc (newest first)
        meetings.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Find the one to keep
        # Prefer the one with transcript or summary
        keep = None
        for m in meetings:
            if m.get('transcript_data') or (m.get('summary') and 'no transcript available' not in m.get('summary', '').lower()):
                keep = m
                break
        
        if keep is None:
            # If none have useful data, keep the newest
            keep = meetings[0]
            
        # Delete the rest
        for m in meetings:
            if m['id'] != keep['id']:
                print(f"Deleting duplicate {m['id']} for {title}...")
                supabase.table('meetings').delete().eq('id', m['id']).execute()
                deleted_count += 1

print(f"Deleted {deleted_count} duplicate meetings.")
