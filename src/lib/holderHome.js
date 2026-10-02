// src/lib/holderHome.js
//
// The browser side of the holder home boundary. It sends only an action and
// owner-editable profile copy. The verified session on the request decides
// which wallet, assignment and referral account the function may touch.
//
// No Oxford commas, no em dashes.

import { supabase } from './supabase';

const ENDPOINT = '/.netlify/functions/holder-home';

export const holderHome = async (action = 'ensure', payload = {}) => {
  if (!supabase) return { ok: false, reason: 'quiet' };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, reason: 'no session' };
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
    return await response.json();
  } catch {
    return { ok: false, reason: 'quiet' };
  }
};

export default holderHome;
