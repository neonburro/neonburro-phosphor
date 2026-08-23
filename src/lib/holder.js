// src/lib/holder.js
//
// Asks the door whether this session may come in. One request, the function
// reads the balance on chain against the threshold in burrow_settings and
// writes the holder row. The answer shape is the function's, see
// netlify/functions/holder-check.js.
//
// useHolder runs the check on mount and exposes { state, holder, threshold }.
// state is one of loading, out (no session), under (a session whose wallet is
// below the line), in (welcome), quiet (the function could not be reached).
// The room reads it and shows the door for anything but in.
//
// No oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const ENDPOINT = '/.netlify/functions/holder-check';

export const check = async (patch) => {
  if (!supabase) return { state: 'quiet' };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { state: 'out' };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch || {}),
    });
    const json = await res.json();
    // The name sticks to the doorframe. A returning wallet is greeted by the
    // handle it already owns, one wallet is one name forever, so the door
    // says who you are before you even sign.
    try {
      if (json?.holder?.handle) localStorage.setItem('stacks-handle', json.holder.handle);
    } catch { /* private mode */ }
    if (!res.ok || !json.ok) {
      if (json?.reason === 'no session') return { state: 'out' };
      return { state: 'quiet', error: json?.error || null };
    }
    return { state: json.eligible ? 'in' : 'under', holder: json.holder, threshold: json.threshold, balance: json.balance };
  } catch {
    return { state: 'quiet' };
  }
};

export const useHolder = () => {
  const [snap, setSnap] = useState({ state: 'loading' });
  useEffect(() => {
    let live = true;
    check().then((r) => { if (live) setSnap(r); });
    return () => { live = false; };
  }, []);
  return { ...snap, refresh: async (patch) => { const r = await check(patch); setSnap(r); return r; } };
};

// Whole tokens, compact, for the sentence on the door.
export const knownHandle = () => {
  try { return localStorage.getItem('stacks-handle') || null; } catch { return null; }
};

export const tokens = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} thousand`;
  return `${Math.floor(n)}`;
};
