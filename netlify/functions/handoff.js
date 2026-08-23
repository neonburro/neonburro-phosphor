// netlify/functions/handoff.js
// SENTINEL: NB_HANDOFF_V1
//
// The phone signs for the desktop. Three verbs on one endpoint.
//
//   start    the walletless browser asks for a nonce and draws it as a QR
//   approve  the phone, already signed in and eligible, scans and says yes
//   claim    the walletless browser polls, and the first poll after approval
//            receives a one time magic token that verifyOtp turns into a real
//            session for the SAME holder
//
// ── HOW A WEB3 USER GETS A MAGIC TOKEN ──────────────────────────────────────
// Supabase mints sessions, not us. generateLink needs an email, and a wallet
// user has none, so claim quietly gives the user a synthetic address at
// stacks.neonburro.com, confirmed, never mailed, then generates a magiclink
// and hands over only its hashed token. The token is used once, the nonce is
// burned, and the whole dance has a ten minute clock.
//
// ── WHAT KEEPS IT HONEST ────────────────────────────────────────────────────
//   approve requires a live session AND an eligible holder row
//   a nonce approves once and claims once, then it is spent
//   expired nonces answer expired, nothing hangs
//   the table has no public policies, only this function touches it
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import { adminClient, json, corsHeaders } from './_shared.js';

const TTL_MIN = 10;
const SYNTH_DOMAIN = 'stacks.neonburro.com';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });

  const db = adminClient();
  if (!db) return json(200, { ok: false, reason: 'quiet' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  const action = body.action;

  if (action === 'start') {
    const { data, error } = await db.from('burrow_handoffs').insert({}).select('nonce').maybeSingle();
    if (error || !data) return json(200, { ok: false, reason: 'quiet' });
    return json(200, { ok: true, nonce: data.nonce });
  }

  const nonce = String(body.nonce || '');
  if (!/^[0-9a-f-]{36}$/.test(nonce)) return json(200, { ok: false, reason: 'bad nonce' });
  const { data: row } = await db.from('burrow_handoffs').select('*').eq('nonce', nonce).maybeSingle();
  if (!row) return json(200, { ok: false, reason: 'unknown' });
  const ageMin = (Date.now() - new Date(row.created_at).getTime()) / 60000;
  if (ageMin > TTL_MIN || row.used_at) return json(200, { ok: false, reason: 'expired' });

  if (action === 'approve') {
    const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return json(200, { ok: false, reason: 'no session' });
    const { data: userData } = await db.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json(200, { ok: false, reason: 'no session' });
    const { data: holder } = await db.from('burrow_holders').select('eligible, handle').eq('user_id', user.id).maybeSingle();
    if (!holder?.eligible) return json(200, { ok: false, reason: 'under' });
    const { error } = await db.from('burrow_handoffs')
      .update({ status: 'approved', user_id: user.id, approved_at: new Date().toISOString() })
      .eq('nonce', nonce).eq('status', 'pending');
    if (error) return json(200, { ok: false, reason: 'quiet' });
    return json(200, { ok: true, approved: true, handle: holder.handle });
  }

  if (action === 'claim') {
    if (row.status !== 'approved' || !row.user_id) return json(200, { ok: true, waiting: true });
    // Burn the nonce before minting, a race resolves to nobody rather than two.
    const { data: burned } = await db.from('burrow_handoffs')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('nonce', nonce).eq('status', 'approved').select('user_id').maybeSingle();
    if (!burned) return json(200, { ok: false, reason: 'expired' });
    const { data: u } = await db.auth.admin.getUserById(row.user_id);
    let email = u?.user?.email;
    if (!email) {
      email = `${row.user_id}@${SYNTH_DOMAIN}`;
      const { error: setErr } = await db.auth.admin.updateUserById(row.user_id, { email, email_confirm: true });
      if (setErr) {
        console.error('[handoff] email', setErr.message);
        return json(200, { ok: false, reason: 'quiet' });
      }
    }
    const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error('[handoff] link', linkErr?.message);
      return json(200, { ok: false, reason: 'quiet' });
    }
    return json(200, { ok: true, token_hash: link.properties.hashed_token });
  }

  return json(200, { ok: false, reason: 'bad action' });
};

export default handler;
