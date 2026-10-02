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

// Only a Supabase-verified Web3 identity may become a holder wallet. Editable
// user metadata is deliberately absent from this helper.
export const verifiedWalletOf = (user) => {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    const provider = String(identity?.provider || '').toLowerCase();
    if (provider !== 'web3' && provider !== 'solana') continue;
    const data = identity?.identity_data || {};
    const address = [identity?.provider_id, data.address, data.sub]
      .map((candidate) => String(candidate || '').trim())
      .find((candidate) => SOLANA_ADDRESS.test(candidate));
    if (address) return address;
  }
  return null;
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
export const threshold = async (db) => {
  const { data, error } = await db
    .from('burrow_settings')
    .select('value')
    .eq('key', 'min_balance')
    .maybeSingle();
  if (error) throw new Error(`threshold unavailable: ${error.message}`);
  const amount = Number(data?.value);
  return Number.isFinite(amount) && amount > 0 ? amount : 1_000_000;
};

export const json = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
