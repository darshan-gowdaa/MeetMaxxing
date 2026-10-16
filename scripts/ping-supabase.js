/**
 * Supabase & Render Keepalive Ping Script
 *
 * Keeps Supabase free-tier project active (preventing the 7-day auto-pause policy)
 * and keeps the Render backend warm.
 *
 * Usage: node scripts/ping-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Helper to load .env if process.env is missing keys
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../backend/.env'),
    path.resolve(__dirname, '../frontend/.env.local'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gcslaozkazuhdqctefpn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BACKEND_URL = (process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://meetmaxxing-api.onrender.com');

async function pingSupabase() {
  if (!SUPABASE_KEY) {
    console.warn('[Keepalive] SUPABASE_KEY not set. Skipping database ping.');
    return;
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/meetings?select=id&limit=1`;
  console.log(`[Keepalive] Pinging Supabase REST API: ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (res.ok) {
      console.log(`[Keepalive] Supabase ping succeeded: HTTP ${res.status}`);
    } else {
      console.warn(`[Keepalive] Supabase returned status ${res.status}`);
    }
  } catch (err) {
    console.error('[Keepalive] Supabase ping failed:', err.message);
  }
}

async function pingRender() {
  const endpoint = `${BACKEND_URL.replace(/\/$/, '')}/health`;
  console.log(`[Keepalive] Pinging Render API: ${endpoint}`);

  try {
    const res = await fetch(endpoint, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      console.log(`[Keepalive] Render ping succeeded: HTTP ${res.status}`, data);
    } else {
      console.warn(`[Keepalive] Render returned status ${res.status}`);
    }
  } catch (err) {
    console.error('[Keepalive] Render ping failed:', err.message);
  }
}

async function run() {
  console.log('[Keepalive] Starting scheduled health ping...');
  await pingSupabase();
  await pingRender();
  console.log('[Keepalive] Finished.');
}

run().catch((err) => {
  console.error('[Keepalive] Fatal error:', err);
  process.exit(1);
});
