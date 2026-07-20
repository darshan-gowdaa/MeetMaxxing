// ─── Meeting ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  google_meet_link?: string;
  title: string;
  start_at: string;
  end_at: string;
  summary: string;
  decisions: Array<{ text: string; decided_by: string; confidence: string }>;
  follow_up: { required: boolean; suggested_topic: string };
  attendees: string[];
  guardrail_score: number;
  transcript_data: Array<{ speaker: string; text: string; timestamp_ms: number }>;
  action_items: Array<{
    id: string;
    description: string;
    owner_name: string;
    priority: string;
    status: string;
    due_date: string;
  }>;
  powered_by?: string;
  email_result?: { sent: boolean; mock?: boolean; message_id?: string; error?: string };
  scheduling_result?: { status: string; event_id?: string; html_link?: string; error?: string };
  status?: string;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface MemorySource {
  meeting_id: string;
  meeting_date: string;
  speaker_name: string;
  memory_type: string;
  excerpt: string;
  score: number;
}

export interface MemoryResult {
  answer: string;
  confidence: string;
  sources: MemorySource[];
  total_retrieved: number;
  powered_by?: string;
  error?: string;
  guardrail_valid?: boolean;
  guardrail_score?: number;
}
