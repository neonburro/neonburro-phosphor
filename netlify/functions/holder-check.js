// netlify/functions/holder-check.js
//
// The door's brain. POST with the session's bearer token, get back whether
// this wallet may come in, right now, from the chain.
//
// ── WHAT IT DOES, IN ORDER ──────────────────────────────────────────────────
//   1  reads the Supabase session from the Authorization header. no session,
//      no answer. the token IS the proof the wallet signed, see lib/wallet.js
//   2  digs the wallet address out of the user record. the Web3 provider has
//      moved this key once already so several homes are tried
//   3  reads the NEONBURRO balance from the chain, one getTokenAccountsByOwner
//   4  reads the threshold from burrow_settings
//   5  upserts the holder row: wallet, user id, balance, eligible, times. an
//      optional patch body claims a handle and a language, exactly once, a
//      taken handle answers taken:true and touches nothing
//   6  answers { ok, eligible, balance, threshold, holder }
//
// ── FAIL CLOSED, SAY WHY ────────────────────────────────────────────────────
// An rpc that cannot be reached answers eligible false with reason quiet, and
// the door shows the quiet sentence. Nobody gets in because a node was down,
// and nobody is told they are poor because a node was down either.
//
// No oxford commas, no em dashes.

import { adminClient, balanceOf, threshold, json, corsHeaders } from './_shared.js';

const HANDLE = /^[a-z]{3,6}-\d{2}$/;
const LANGS = new Set(['en', 'ja', 'zh', 'es']);

const addressOf = (user) => {
  const m = user?.user_metadata || {};
  const c = m.custom_claims || {};
  const ids = Array.isArray(user?.identities) ? user.identities : [];
  const fromIdentity = ids.map((i) => i?.identity_data?.address || i?.identity_data?.sub).find(Boolean);
  return c.address || m.address || fromIdentity || null;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  // GET is the stethoscope. No session, no wallet, no balance, it only says
  // whether the database and the chain answer through the same doors the real
  // check uses, so a failing verify can be diagnosed from outside without log
  // access. It costs one cheap rpc call and reveals nothing.
  if (event.httpMethod === 'GET') {
    const db2 = adminClient();
    let chain = 'quiet';
    let detail = null;
    try {
      const { rpc } = await import('./_shared.js');
      await rpc('getLatestBlockhash', [{ commitment: 'processed' }]);
      chain = 'up';
    } catch (err) {
      detail = err.message;
    }
    return json(200, { ok: true, database: db2 ? 'up' : 'down', chain, detail, rpcConfigured: Boolean(process.env.SOLANA_RPC_URL) });
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });

  const db = adminClient();
  if (!db) return json(200, { ok: false, reason: 'quiet', error: 'no database' });

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(200, { ok: false, reason: 'no session' });

  const { data: userData, error: userErr } = await db.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json(200, { ok: false, reason: 'no session' });

  const wallet = addressOf(user);
  if (!wallet) return json(200, { ok: false, reason: 'quiet', error: 'no wallet on the session' });

  let balance;
  try {
    balance = await balanceOf(wallet);
  } catch (err) {
    console.error('[holder-check] rpc', err.message);
    return json(200, { ok: false, reason: 'quiet', error: `the chain did not answer (${err.message})` });
  }

  const min = await threshold(db);
  const eligible = balance >= min;
  const now = new Date().toISOString();

  let patch = {};
  try { patch = JSON.parse(event.body || '{}'); } catch { patch = {}; }

  const { data: existing } = await db.from('burrow_holders').select('*').eq('wallet', wallet).maybeSingle();

  const row = {
    wallet,
    user_id: user.id,
    balance,
    eligible,
    checked_at: now,
    last_seen: now,
  };
  if (!existing) row.first_seen = now;

  // The handle, claimed once. A different wallet holding the name answers
  // taken and changes nothing. The same wallet asking again is idempotent.
  let taken = false;
  if (patch.handle && HANDLE.test(patch.handle) && !existing?.handle) {
    const { data: clash } = await db.from('burrow_holders').select('wallet').eq('handle', patch.handle).maybeSingle();
    if (clash && clash.wallet !== wallet) taken = true;
    else row.handle = patch.handle;
  }
  if (patch.lang && LANGS.has(patch.lang)) row.lang = patch.lang;

  const { data: saved, error: upsertErr } = await db
    .from('burrow_holders')
    .upsert(row, { onConflict: 'wallet' })
    .select('wallet, handle, lang, eligible, balance, first_seen')
    .maybeSingle();
  if (upsertErr) {
    console.error('[holder-check] upsert', upsertErr.message);
    return json(200, { ok: false, reason: 'quiet' });
  }

  return json(200, {
    ok: true,
    eligible,
    balance,
    threshold: min,
    holder: { handle: saved?.handle || null, lang: saved?.lang || null, taken },
  });
};

export default handler;
