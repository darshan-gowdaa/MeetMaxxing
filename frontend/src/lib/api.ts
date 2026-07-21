const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

function safeParse(text: string) {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error for text:", text, e);
    return {};
  }
}

export async function fetchMeetings(token: string) {
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch meetings");
  const text = await res.text();
  return safeParse(text);
}

export async function fetchMeeting(id: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch meeting");
  const text = await res.text();
  return safeParse(text);
}

export async function queryMemory(question: string, token: string, filters?: Record<string, string>) {
  const res = await fetch(`${BACKEND_URL}/memory/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, ...(filters || {}) }),
  });
  if (!res.ok) throw new Error("Memory query failed");
  const text = await res.text();
  return safeParse(text);
}

export async function updateActionItem(id: string, updates: Record<string, string>, token: string) {
  const res = await fetch(`${BACKEND_URL}/dashboard/action-items/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  const text = await res.text();
  return safeParse(text);
}

export async function deleteMeeting(id: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete meeting");
  return true;
}

export async function updateMeeting(id: string, updates: Record<string, string>, token: string) {
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
