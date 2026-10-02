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

import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
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
      // A session that carries no web3 identity can NEVER pass the gate, so
      // calling it quiet is a lie that strands the holder forever. The phone
      // handoff signs people in by email, which produces exactly such a user,
      // and the session survives a hard reset because it is persisted. Tyler
      // sat on "the door is quiet right now" with a saved wallet on screen and
      // no way out, 2026-10-02. It is its own state so the door can clear it.
      if (json?.reason === 'identity' || json?.reason === 'identity collision') {
        return { state: 'stale', reason: json.reason, detail: json.detail || null };
      }
      return { state: 'quiet', error: json?.error || null };
    }
    return { state: json.eligible ? 'in' : 'under', holder: json.holder, threshold: json.threshold, balance: json.balance, sol: json.sol ?? null, wallet: json.wallet || null };
  } catch {
    return { state: 'quiet' };
  }
};

const HolderContext = createContext(null);

export const HolderProvider = ({ children }) => {
  const [snap, setSnap] = useState({ state: 'loading' });
  useEffect(() => {
    let live = true;
    check().then((r) => { if (live) setSnap(r); });
    const auth = supabase?.auth?.onAuthStateChange((event) => {
      if (!live) return;
      if (event === 'SIGNED_OUT') {
        setSnap({ state: 'out' });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSnap({ state: 'loading' });
        setTimeout(() => {
          check().then((result) => { if (live) setSnap(result); });
        }, 0);
      }
    });
    return () => {
      live = false;
      auth?.data?.subscription?.unsubscribe();
    };
  }, []);
  const value = useMemo(() => ({
    ...snap,
    refresh: async (patch) => {
      const result = await check(patch);
      setSnap(result);
      return result;
    },
  }), [snap]);
  return createElement(HolderContext.Provider, { value }, children);
};

export const useHolder = () => useContext(HolderContext) || { state: 'loading', refresh: check };

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
