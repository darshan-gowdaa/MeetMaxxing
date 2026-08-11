import { useState, useEffect } from 'react';
import { queryMemory } from '@/lib/api';
import type { Meeting, MemoryResult } from '@/types';

export const EXAMPLE_QUERIES = [
  "What did the client say about pricing in the last 3 meetings?",
  "What's pending with Rahul?",
  "What was decided about the API migration?",
  "When is the mobile launch scheduled?",
];

export const CONFIDENCE_STYLES: Record<string, { bar: string; chip: string; label: string }> = {
  high: { bar: "bg-success", chip: "bg-success/15 text-success border-success/30", label: "High confidence" },
  medium: { bar: "bg-warning", chip: "bg-warning/15 text-warning border-warning/30", label: "Medium confidence" },
  low: { bar: "bg-risk", chip: "bg-risk/15 text-risk border-risk/30", label: "Low confidence" },
};

export function useMemoryManager() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>(EXAMPLE_QUERIES);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    import("@/lib/api").then(({ fetchMeetings }) => {
      fetchMeetings()
        .then((data) => {
          const list: Meeting[] = Array.isArray(data) ? data : data.meetings || [];
          if (list.length > 0) {
            const recentTitles = list.slice(0, 4).map(m => m.title || "Untitled Meeting");
            const dynamicQueries = [
              `What were the main decisions in ${recentTitles[0]}?`,
              recentTitles.length > 1 ? `What are the action items from ${recentTitles[1]}?` : "What's pending for me to do?",
              `Summarize the key points discussed about pricing.`,
              `What was discussed in the last few meetings?`
            ];
            setSuggestions(dynamicQueries);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSuggestions(false));
    });
  }, []);

  const handleQuery = async (q: string = query) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setResult(null);

    try {
      const data = await queryMemory(q);
      setResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      setResult({
        answer: error.message || "No relevant memories found.",
        confidence: "low",
        total_retrieved: 0,
        sources: [],
        error: error.message,
        powered_by: "Fallback",
      });
    } finally {
      setLoading(false);
    }
  };

  const conf = result ? (CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.low) : null;

  return {
    query,
    setQuery,
    result,
    setResult,
    loading,
    sourcesOpen,
    setSourcesOpen,
    suggestions,
    loadingSuggestions,
    handleQuery,
    conf
  };
}
