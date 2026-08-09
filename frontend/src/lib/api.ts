const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

import { supabase } from "./supabase";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function safeParse(text: string, fallback: unknown = null) {
  if (!text || !text.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error for text:", text, e);
    return fallback;
  }
}

export async function fetchMeetings() {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch meetings");
  const text = await res.text();
  return safeParse(text, []);
}

export async function fetchMeeting(id: string) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch meeting");
  const text = await res.text();
  return safeParse(text, null);
}

export async function queryMemory(question: string, filters?: Record<string, string>) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/memory/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, ...(filters || {}) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Memory query failed");
  const text = await res.text();
  return safeParse(text);
}

export async function updateActionItem(id: string, updates: Record<string, string>) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/dashboard/action-items/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update action item: ${res.status}`);
  const text = await res.text();
  return safeParse(text);
}

export async function deleteMeeting(id: string) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete meeting");
  return true;
}

export async function updateMeeting(id: string, updates: Record<string, string>) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update meeting");
  const text = await res.text();
  return safeParse(text);
}

export async function endMeeting(id: string) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/meeting/${id}/end`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to end meeting");
  const text = await res.text();
  return safeParse(text);
}

export async function reprocessMeeting(id: string) {
  const token = await getToken();
  const res = await fetch(`${BACKEND_URL}/meeting/${id}/reprocess`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to reprocess meeting");
  const text = await res.text();
  return safeParse(text);
}
export async function getAuthToken() { return getToken(); }
