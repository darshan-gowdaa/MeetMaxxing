const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||"https://meetmaxxing-api.onrender.com";

import { supabase } from"./supabase";

async function getToken() {
 let { data: { session } } = await supabase.auth.getSession();
 if (!session) {
 await new Promise(r => setTimeout(r, 500));
 const res = await supabase.auth.getSession();
 session = res.data.session;
 }
 return session?.access_token ??"";
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

/** Extract a human-readable message from a failed backend response. */
async function apiError(res: Response, fallback: string): Promise<Error> {
 let detail = fallback;
 try {
   const body = await res.text();
   const parsed = safeParse(body, null) as { detail?: string; error?: string; msg?: string } | null;
   detail = parsed?.detail || parsed?.error || parsed?.msg || fallback;
 } catch {
   // keep fallback
 }
 return new Error(detail);
}

/** Render free tier sleeps; boot returns 502/503/504 until the app is up. */
export function isColdStartStatus(status: number): boolean {
 return status === 502 || status === 503 || status === 504;
}

export class HttpError extends Error {
 status: number;
 constructor(status: number, message: string) {
   super(message);
   this.status = status;
 }
}

/** True when the error is a Render cold-start (or a network failure/timeout). */
export function isColdStartError(err: unknown): boolean {
 if (err instanceof HttpError) return isColdStartStatus(err.status);
 const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
 return /failed to fetch|load failed|networkerror|timeout|econnrefused|503|504|502/.test(msg);
}

export async function fetchMeetings() {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/dashboard/meetings`, {
 headers: { Authorization: `Bearer ${token}` },
 cache:"no-store",
 });
 if (!res.ok) throw new Error("Failed to fetch meetings");
 const text = await res.text();
 return safeParse(text, []);
}

export async function fetchMeeting(id: string) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 cache:"no-store",
 });
 if (!res.ok) {
   if (isColdStartStatus(res.status)) throw new HttpError(res.status, "Backend is starting up");
   throw await apiError(res, "Failed to fetch meeting");
 }
 const text = await res.text();
 return safeParse(text, null);
}

export async function queryMemory(question: string, filters?: Record<string, string>) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/memory/query`, {
 method:"POST",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
 },
 body: JSON.stringify({ question, ...(filters || {}) }),
 cache:"no-store",
 });
 if (!res.ok) throw new Error("Memory query failed");
 const text = await res.text();
 return safeParse(text);
}

export async function updateActionItem(id: string, updates: Record<string, string>) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/dashboard/action-items/${id}`, {
 method:"PATCH",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
 },
 body: JSON.stringify(updates),
 });
 if (!res.ok) throw await apiError(res, `Failed to update action item: ${res.status}`);
 const text = await res.text();
 return safeParse(text);
}

export async function deleteMeeting(id: string) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
 method:"DELETE",
 headers: { Authorization: `Bearer ${token}` },
 });
 if (!res.ok) throw new Error("Failed to delete meeting");
 return true;
}

export async function updateMeeting(id: string, updates: Record<string, string>) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/dashboard/meetings/${id}`, {
 method:"PATCH",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
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
 method:"POST",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
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
 method:"POST",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
 },
 body: JSON.stringify({}),
 });
 if (!res.ok) throw new Error("Failed to reprocess meeting");
 const text = await res.text();
 return safeParse(text);
}
export async function getAuthToken() { return getToken(); }

export async function scheduleFollowUp(meetingId: string, payload: Record<string, unknown>) {
 const token = await getToken();
 const res = await fetch(`${BACKEND_URL}/meeting/${meetingId}/schedule_followup`, {
 method:"POST",
 headers: {
 Authorization: `Bearer ${token}`,
"Content-Type":"application/json",
 },
 body: JSON.stringify(payload),
 });
 if (!res.ok) throw await apiError(res, "Failed to schedule follow-up");
 const text = await res.text();
 return safeParse(text);
}

