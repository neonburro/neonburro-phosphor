// netlify/functions/holder-check.js
//
// The holder gate. A bearer token proves a Supabase session, a verified Web3
// identity supplies the Solana address and the chain supplies the balance.
// User-editable metadata is deliberately ignored because it cannot authorize a
// wallet. One auth user binds to one wallet and one wallet binds to one user.
//
// The function fails closed. An unavailable chain never reads as a zero
// balance. An ownership collision never reassigns a wallet. Explicit grants
// remain a second access path but do not bypass wallet ownership proof.
//
// No oxford commas, no em dashes.

import { adminClient, balanceOf, threshold, json, corsHeaders, rpc } from './_shared.js';

const HANDLE = /^[a-z]{3,6}-\d{2}$/;
const LANGS = new Set(['en', 'ja', 'zh', 'es']);
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Supabase verifies the signed Web3 message before it places the wallet in an
// identity. user_metadata is editable by the user and never appears here.
const verifiedAddressOf = (user) => {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    const provider = String(identity?.provider || '').toLowerCase();
    if (provider && provider !== 'web3' && provider !== 'solana') continue;
    const data = identity?.identity_data || {};
    const candidates = [identity?.provider_id, data.address, data.sub];
    const address = candidates
      .map((candidate) => String(candidate || '').trim())
      .find((candidate) => SOLANA_ADDRESS.test(candidate));
    if (address) return address;
  }
  return null;
};

const grantedFor = async (db, wallet) => {
  const { data, error } = await db
    .from('burrow_grants')
    .select('wallet')
    .eq('wallet', wallet)
    .maybeSingle();
  if (error) {
    console.error('[holder-check] grant', error.message);
    return false;
  }
  return Boolean(data);
};

const ownershipFor = async (db, wallet, userId) => {
  const [walletResult, userResult] = await Promise.all([
    db
      .from('burrow_holders')
      .select('*')
      .eq('wallet', wallet)
      .maybeSingle(),
    db
      .from('burrow_holders')
      .select('wallet')
      .eq('user_id', userId)
      .limit(2),
  ]);

  if (walletResult.error || userResult.error) {
    console.error(
      '[holder-check] ownership',
      walletResult.error?.message || userResult.error?.message,
    );
    return { error: true, existing: null, collision: false };
  }

  const existing = walletResult.data || null;
  const walletClaimedByAnother = Boolean(existing?.user_id && existing.user_id !== userId);
  const userClaimedAnother = (userResult.data || []).some((row) => row.wallet !== wallet);
  return {
    error: false,
    existing,
    collision: walletClaimedByAnother || userClaimedAnother,
  };
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // GET is the public stethoscope. It reveals health states but no wallet,
  // balance, environment value or provider response.
  if (event.httpMethod === 'GET') {
    const database = adminClient();
    let chain = 'quiet';
    let detail = null;
    try {
      await rpc('getLatestBlockhash', [{ commitment: 'processed' }]);
      chain = 'up';
    } catch (error) {
      const message = String(error.message || '');
      detail = /parse URL/i.test(message) ? 'rpc value is not a url'
        : /401|403/.test(message) ? 'rpc refused the key'
          : /429/.test(message) ? 'rpc throttled'
            : 'rpc unreachable';
    }
    return json(200, {
      ok: true,
      database: database ? 'up' : 'down',
      chain,
      detail,
      rpcConfigured: Boolean(process.env.SOLANA_RPC_URL),
    });
  }

  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });

  const db = adminClient();
  if (!db) return json(200, { ok: false, reason: 'quiet', error: 'no database' });

  const token = (event.headers.authorization || event.headers.Authorization || '')
    .replace(/^Bearer\s+/i, '');
  if (!token) return json(200, { ok: false, reason: 'no session' });

  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(200, { ok: false, reason: 'no session' });

  const wallet = verifiedAddressOf(user);
  if (!wallet) {
    console.error('[holder-check] no verified Web3 identity', user.id);
    return json(200, { ok: false, reason: 'identity' });
  }

  const ownership = await ownershipFor(db, wallet, user.id);
  if (ownership.error) return json(200, { ok: false, reason: 'quiet' });
  if (ownership.collision) {
    console.error('[holder-check] ownership collision', wallet.slice(0, 6), user.id);
    return json(200, { ok: false, reason: 'identity collision' });
  }

  const granted = await grantedFor(db, wallet);
  let balance = Number(ownership.existing?.balance) || 0;
  let sol = null;
  let chainRead = false;

  try {
    balance = await balanceOf(wallet);
    chainRead = true;
    try {
      const lamports = await rpc('getBalance', [wallet]);
      sol = (lamports?.value ?? lamports ?? 0) / 1e9;
    } catch {
      // The wallet view may show a dash while token eligibility remains valid.
    }
  } catch (error) {
    console.error('[holder-check] rpc', error.message);
    if (!granted) {
      return json(200, {
        ok: false,
        reason: 'quiet',
        error: 'the chain did not answer. try again in a minute.',
      });
    }
  }

  const min = await threshold(db);
  const eligible = (chainRead && balance >= min) || granted;
  const now = new Date().toISOString();

  let patch = {};
  try {
    patch = JSON.parse(event.body || '{}');
  } catch {
    patch = {};
  }

  const row = {
    wallet,
    user_id: user.id,
    balance,
    eligible,
    last_seen: now,
  };
  if (chainRead) row.checked_at = now;
  if (!ownership.existing) row.first_seen = now;

  let taken = false;
  if (patch.handle && HANDLE.test(patch.handle) && !ownership.existing?.handle) {
    const { data: clash, error: clashError } = await db
      .from('burrow_holders')
      .select('wallet')
      .eq('handle', patch.handle)
      .maybeSingle();
    if (clashError) {
      console.error('[holder-check] handle', clashError.message);
      return json(200, { ok: false, reason: 'quiet' });
    }
    if (clash && clash.wallet !== wallet) taken = true;
    else row.handle = patch.handle;
  }
  if (patch.lang && LANGS.has(patch.lang)) row.lang = patch.lang;

  const { data: saved, error: upsertError } = await db
    .from('burrow_holders')
    .upsert(row, { onConflict: 'wallet' })
    .select('wallet, handle, lang, eligible, balance, first_seen')
    .maybeSingle();
  if (upsertError) {
    console.error('[holder-check] upsert', upsertError.message);
    return json(200, { ok: false, reason: 'quiet' });
  }

  return json(200, {
    ok: true,
    eligible,
    balance,
    sol,
    wallet,
    threshold: min,
    holder: {
      handle: saved?.handle || null,
      lang: saved?.lang || null,
      taken,
    },
  });
};

export default handler;
