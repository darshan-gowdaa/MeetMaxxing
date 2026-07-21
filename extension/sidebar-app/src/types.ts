export interface TranscriptChunk {
  speaker: string;
  text: string;
  timestamp?: number;
  source?: string;
}

export interface CopilotUpdate {
  meeting_id?: string;
  suggestions?: string[];
  risks?: string[];
  next_question?: string;
  recap?: string;
  error?: string;
  status?: string;
  powered_by?: string;
}
