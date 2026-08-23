// src/lib/supabase.js
//
// One client for the browser. The studio's project, the public anon key, and a
// session that lives where the visitor said it should.
//
// ── REMEMBER ME ─────────────────────────────────────────────────────────────
// Supabase keeps a session in localStorage by default, which is "remember me"
// whether anybody asked or not. The burrow asks. Until the visitor ticks the
// box on the door, the session lives in sessionStorage and dies with the tab,
// which is exactly what Tyler described: open browser, still in, close it,
// verify again. Tick the box and it moves to localStorage and the next visit
// re verifies the balance on its own and opens the room or the door.
//
// The choice is read once at module load from the same key the door writes,
// so the client is built right the first time rather than swapped later.
//
// ── DEGRADES TO NOTHING ─────────────────────────────────────────────────────
// No url or no key and `supabase` is null. Every consumer checks `ready` and
// shows the quiet sentence rather than a stack trace. A harness or a preview
// without env must still render the door.
//
// No oxford commas, no em dashes.

import { createClient } from '@supabase/supabase-js';

export const REMEMBER_KEY = 'burrow-remember';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const remembered = () => {
  try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; }
};

export const setRemembered = (on) => {
  try { if (on) localStorage.setItem(REMEMBER_KEY, '1'); else localStorage.removeItem(REMEMBER_KEY); } catch { /* private mode */ }
};

const storage = () => {
  try { return remembered() ? window.localStorage : window.sessionStorage; } catch { return undefined; }
};

export const ready = Boolean(url && key);

export const supabase = ready
  ? createClient(url, key, { auth: { storage: storage(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export default supabase;
