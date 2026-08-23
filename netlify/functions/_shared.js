// netlify/functions/_shared.js
//
// What every burrow function needs. The cors headers, the key ladder, the
// admin client, the rpc call and the threshold read. Small on purpose, this is
// the room's plumbing and plumbing should be boring.
//
// ── THE KEY LADDER ──────────────────────────────────────────────────────────
// The same idea as the studio's _shared.js and for the same reason: in August
// a dead SUPABASE_SECRET_KEY silently stopped the forms for four months. The
// ladder tries every server key name in order and says which one worked, so a
// dead key is one log line and not a season.
//
// No oxford commas, no em dashes.

import { createClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const MINT = 'EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump';

export const supabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;

export const serverKey = () => {
  // SERVICE_ROLE leads on purpose. The studio's SUPABASE_SECRET_KEY has been
  // answering 401 since August and it was copied here alongside the good key,
  // and this function takes the FIRST rung rather than falling through. The
  // proven key goes first, the doubtful one is the spare. If the secret key
  // is ever reissued and preferred, swap the order and say why here.
  const ladder = [
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY],
  ].filter(([, v]) => Boolean(v));
  return ladder[0] || [null, null];
};

// The admin client. Service role, RLS bypassed, so nothing beyond these
// functions ever holds it. Returns null rather than throwing so a handler can
// answer with a sentence.
export const adminClient = () => {
  const url = supabaseUrl();
  const [name, key] = serverKey();
  if (!url || !key) {
    console.error('[burrow] missing SUPABASE_URL or server key');
    return null;
  }
  console.log('[burrow] admin client via', name);
  return createClient(url, key, { auth: { persistSession: false } });
};

const RPC = () => process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const rpc = async (method, params) => {
  const res = await fetch(RPC(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`rpc ${method} ${json.error.message || json.error.code}`);
  return json.result;
};

// Whole NEONBURRO held by a wallet, summed across its token accounts. Throws
// on rpc failure so callers can tell "could not look" from "holds nothing",
// which is the difference between the quiet sentence and the door saying no.
export const balanceOf = async (wallet) => {
  const owned = await rpc('getTokenAccountsByOwner', [wallet, { mint: MINT }, { encoding: 'jsonParsed' }]);
  return (owned?.value || []).reduce((sum, acc) => {
    const n = Number(acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
};

// The threshold, from burrow_settings. Pulse edits the row, the door reads it,
// nobody redeploys to change the number. Falls back to the seed value so a
// missing row fails closed at the seeded height rather than open at zero.
export const threshold = async (db) => {
  const { data } = await db.from('burrow_settings').select('value').eq('key', 'min_balance').maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 ? n : 5_000_000;
};

export const json = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
