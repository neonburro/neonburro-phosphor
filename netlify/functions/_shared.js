// netlify/functions/_shared.js
//
// What every burrow function needs. The CORS headers, server client, RPC call
// and holder threshold live here so the gate and its sweep use one source.
// Changing this file changes every server-side holder decision.
//
// SERVER KEYS
// Service role leads because it is the proven server key in this project.
// SUPABASE_SECRET_KEY is a compatibility spare. Only the first configured key
// is used, so a configured but invalid first key must be repaired in Netlify.
// No key or signing material may ever be returned by these helpers.
//
// No oxford commas, no em dashes.

import { createClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const MINT = 'EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump';

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ── IDENTITIES ONLY, BUT NOT BY PROVIDER NAME ─────────────────────────
//
// Only a Supabase verified identity may become a holder wallet. Editable user
// metadata is deliberately absent from this helper and must stay absent.
// src/lib/wallet.js addressOf reads user_metadata.custom_claims.address first
// and that is correct THERE, because the browser is only drawing a chip. It is
// never correct here. user_metadata is writable by the account that owns it, so
// a holder who set their own address would inherit any wallet's balance and any
// wallet's access. That is the whole reason this helper exists.
//
// What changed, 2026-10-02. The provider name was pinned to web3 or solana and
// Tyler could not get in with a real jupiter signature, looping back to the
// door every time. Pinning the NAME was the mistake. The security property
// comes from reading `identities` at all, because that array is server owned,
// and not from recognising what supabase decided to call the provider this
// month. So every identity is scanned now and the first one carrying a valid
// Solana address wins. Strictly no weaker than before and no longer dependent
// on a string we do not control.
//
// walletShapeOf is the companion. When no address is found it reports WHICH
// providers were present so the door can say something true instead of a guess.
// It returns provider names and counts only, never an address.
// Where supabase ACTUALLY puts the address, read off the real row 2026-10-04:
//
//   identity.provider          'web3'
//   identity_data.sub          'web3:solana:86JyeB94...NDgE'   PREFIXED
//   identity_data.custom_claims.address  '86JyeB94...NDgE'     NESTED
//
// Neither of those is a bare address at the top level, which is why two earlier
// passes at this function found nothing and refused every genuine jupiter
// signature. The address was never missing. It was one level down and wearing a
// prefix, and both earlier versions looked only at the top level.
//
// identity_data is written by supabase during the verified sign in and is NOT
// user writable. user_metadata carries the same custom_claims and IS writable by
// the account, so it stays out of here. That distinction is the whole security
// property of this helper and it has not moved.
export const verifiedWalletOf = (user) => {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    const data = identity?.identity_data || {};
    const claims = data.custom_claims || {};
    const candidates = [
      claims.address, claims.public_key,
      data.address, data.wallet, data.public_key,
      identity?.provider_id, data.sub,
    ];
    for (const raw of candidates) {
      const value = String(raw || '').trim();
      if (!value) continue;
      // 'web3:solana:<address>' is the shape sub and provider_id arrive in, so
      // the last colon segment is the address. A bare address has no colon and
      // passes through this untouched.
      const address = value.includes(':') ? value.split(':').pop() : value;
      if (SOLANA_ADDRESS.test(address)) return address;
    }
  }
  return null;
};

export const walletShapeOf = (user) => {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return {
    identities: identities.length,
    providers: identities.map((identity) => String(identity?.provider || 'unknown')).join(',') || 'none',
  };
};

export const supabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;

export const serverKey = () => {
  const ladder = [
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY],
  ].filter(([, value]) => Boolean(value));
  return ladder[0] || [null, null];
};

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

// A full URL is preferred. A bare Helius key is accepted for compatibility
// with the first environment setup. The value stays inside the function.
const rpcUrl = () => {
  const value = (process.env.SOLANA_RPC_URL || '').trim();
  if (!value) return 'https://api.mainnet-beta.solana.com';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://mainnet.helius-rpc.com/?api-key=${value}`;
};

export const rpc = async (method, params) => {
  const response = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`rpc ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`rpc ${method} ${payload.error.message || payload.error.code}`);
  return payload.result;
};

// Whole NEONBURRO held by a wallet, summed across its token accounts. RPC
// failure throws so callers never confuse an unavailable node with zero.
export const balanceOf = async (wallet) => {
  const owned = await rpc('getTokenAccountsByOwner', [wallet, { mint: MINT }, { encoding: 'jsonParsed' }]);
  return (owned?.value || []).reduce((sum, account) => {
    const amount = Number(account?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
};

// Pulse will edit this row later. The fallback matches Tyler's current ruling
// so a missing row never silently restores the retired five-million gate.
// ── THE GATE IS A MILLION, AND A ROW CAN ONLY EVER LOOSEN IT ─────────────
//
// Tyler, 2026-10-02. Holding is the gate. He said first that any holder should
// get in, then asked for a minimal floor of about fifty dollars and asked for a
// recommendation. A million tokens is the answer and the council's own wallets
// are the argument. At the five million the room was set to, lyra at 4,937,954,
// volt at 4,671,807, kolache at 2,609,349 and echo at 1,065,896 are all shut
// out of their own room, and tender clears it by 5,210 tokens, roughly four
// cents. A bar that evicts your own council is the wrong bar.
//
// It is counted in TOKENS and never in dollars. A dollar gate revokes
// membership on a price dip, so somebody who paid to get in yesterday stands
// outside today having done nothing at all. Tokens do not behave that way.
//
// A million is about $8.51 at today's price and it is reachable, which a dollar
// bar is not. token-price.js puts the largest order that clears the two percent
// slippage ceiling at $37.75, so a fifty dollar entry would cost a newcomer more
// than the pool can fill without moving the price against them.
//
// burrow_settings.min_balance still works and still needs no deploy, but it can
// only ever LOWER this number. A row that nobody reading this repo can inspect
// must never be able to lock holders out, which is exactly what a stale five
// million would quietly do while this file claimed otherwise.
export const GATE = 1_000_000;

export const threshold = async (db) => {
  const { data, error } = await db
    .from('burrow_settings')
    .select('value')
    .eq('key', 'min_balance')
    .maybeSingle();
  if (error) throw new Error(`threshold unavailable: ${error.message}`);
  const amount = Number(data?.value);
  const asked = Number.isFinite(amount) && amount > 0 ? amount : GATE;
  return Math.min(asked, GATE);
};

export const json = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
