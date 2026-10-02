// netlify/functions/handoff.js
//
// The phone signs for one walletless desktop without turning the public QR
// value into a session credential. Start returns two unrelated values:
//
//   nonce         a public locator placed in the QR for the phone
//   claim_secret  a 256-bit secret kept only in the desktop's memory
//
// Only the SHA-256 digest of claim_secret reaches the database. Approval and
// claim each run through a row-locking database function, so simultaneous
// requests cannot approve over one another or claim a session twice. Claim
// consumes the row before Supabase mints a one-time email token. If minting
// fails, the person starts again rather than reopening a consumed credential.
//
// This endpoint accepts only same-origin browser requests. Every response is
// private and no-store because a successful claim contains a one-time auth
// token. The rate limit still matters for start and polling abuse even though
// the secret carries 256 bits of entropy.
//
// No Oxford commas, no em dashes. hue•man with the interpunct.

import { createHash, randomBytes } from 'node:crypto';
import { adminClient } from './_shared.js';

const SYNTH_DOMAIN = 'stacks.neonburro.com';
const HANDOFF_PATH = '/.netlify/functions/handoff';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLAIM_SECRET = /^[A-Za-z0-9_-]{43}$/;

const normalizedOrigin = (value) => {
  try { return new URL(String(value || '')).origin; } catch { return null; }
};

const configuredOrigins = () => {
  const values = [
    'https://phosphor.neonburro.com',
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
  ];
  return new Set(values.map(normalizedOrigin).filter(Boolean));
};

const requestOrigin = (event) => normalizedOrigin(event.headers?.origin || event.headers?.Origin);

export const sameOrigin = (event) => {
  const origin = requestOrigin(event);
  if (!origin) return null;
  if (configuredOrigins().has(origin)) return origin;
  const parsed = new URL(origin);
  const local = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  const dev = process.env.CONTEXT === 'dev' || process.env.NETLIFY_DEV === 'true';
  return local && dev ? origin : null;
};

export const validNonce = (value) => UUID.test(String(value || ''));
export const validClaimSecret = (value) => CLAIM_SECRET.test(String(value || ''));
export const digestClaimSecret = (value) => createHash('sha256').update(String(value)).digest('hex');

const responseHeaders = (origin) => ({
  ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store, private, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'Referrer-Policy': 'no-referrer',
  Pragma: 'no-cache',
  Vary: 'Origin',
});

const answer = (statusCode, body, origin, extraHeaders = {}) => ({
  statusCode,
  headers: { ...responseHeaders(origin), ...extraHeaders },
  body: statusCode === 204 ? '' : JSON.stringify(body),
});

const parseBody = (event) => {
  try {
    const parsed = JSON.parse(event.body || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const bearer = (event) => String(event.headers?.authorization || event.headers?.Authorization || '')
  .replace(/^Bearer\s+/i, '')
  .trim();

const rpcDecision = async (db, name, args) => {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data && typeof data === 'object' ? data : { state: 'quiet' };
};

const decisionAnswer = (decision, origin) => {
  const state = String(decision?.state || 'quiet');
  if (state === 'waiting') return answer(202, { ok: true, waiting: true }, origin);
  if (state === 'unknown') return answer(404, { ok: false, reason: 'unknown' }, origin);
  if (state === 'expired') return answer(410, { ok: false, reason: 'expired' }, origin);
  if (state === 'used') return answer(409, { ok: false, reason: 'used' }, origin);
  if (state === 'conflict') return answer(409, { ok: false, reason: 'conflict' }, origin);
  if (state === 'denied') return answer(403, { ok: false, reason: 'denied' }, origin);
  if (state === 'under') return answer(403, { ok: false, reason: 'under' }, origin);
  return answer(503, { ok: false, reason: 'quiet' }, origin);
};

const start = async (db, origin) => {
  const claimSecret = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from('burrow_handoffs')
    .insert({ claim_secret_hash: digestClaimSecret(claimSecret), expires_at: expiresAt })
    .select('nonce, expires_at')
    .maybeSingle();
  if (error || !data?.nonce) {
    if (error) console.error('[handoff] start', error.message);
    return answer(503, { ok: false, reason: 'quiet' }, origin);
  }
  return answer(201, {
    ok: true,
    nonce: data.nonce,
    claim_secret: claimSecret,
    expires_at: data.expires_at,
  }, origin);
};

const approve = async (db, event, body, origin) => {
  if (!validNonce(body.nonce)) return answer(400, { ok: false, reason: 'bad nonce' }, origin);
  const token = bearer(event);
  if (!token) return answer(401, { ok: false, reason: 'no session' }, origin);
  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return answer(401, { ok: false, reason: 'no session' }, origin);
  let decision;
  try {
    decision = await rpcDecision(db, 'approve_burrow_handoff', {
      p_nonce: body.nonce,
      p_user_id: user.id,
    });
  } catch (error) {
    console.error('[handoff] approve', error.message);
    return answer(503, { ok: false, reason: 'quiet' }, origin);
  }
  if (decision.state === 'approved') return answer(200, { ok: true, approved: true }, origin);
  return decisionAnswer(decision, origin);
};

const oneTimeToken = async (db, userId) => {
  const { data: found, error: findError } = await db.auth.admin.getUserById(userId);
  if (findError || !found?.user) throw new Error(findError?.message || 'user unavailable');
  let email = found.user.email;
  if (!email) {
    email = `${userId}@${SYNTH_DOMAIN}`;
    const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) throw new Error(error.message);
  }
  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) throw new Error(linkError?.message || 'token unavailable');
  return tokenHash;
};

const claim = async (db, body, origin) => {
  if (!validNonce(body.nonce)) return answer(400, { ok: false, reason: 'bad nonce' }, origin);
  if (!validClaimSecret(body.claim_secret)) return answer(400, { ok: false, reason: 'bad claim' }, origin);
  let decision;
  try {
    decision = await rpcDecision(db, 'claim_burrow_handoff', {
      p_nonce: body.nonce,
      p_claim_secret_hash: digestClaimSecret(body.claim_secret),
    });
  } catch (error) {
    console.error('[handoff] claim', error.message);
    return answer(503, { ok: false, reason: 'quiet' }, origin);
  }
  if (decision.state !== 'claimed' || !decision.user_id) return decisionAnswer(decision, origin);
  try {
    const tokenHash = await oneTimeToken(db, decision.user_id);
    return answer(200, { ok: true, token_hash: tokenHash }, origin);
  } catch (error) {
    console.error('[handoff] token', error.message);
    return answer(503, { ok: false, reason: 'restart' }, origin);
  }
};

export const handler = async (event) => {
  const origin = sameOrigin(event);
  if (!origin) return answer(403, { ok: false, reason: 'origin' }, null);
  if (event.httpMethod === 'OPTIONS') return answer(204, {}, origin);
  if (event.httpMethod !== 'POST') return answer(405, { ok: false, reason: 'method' }, origin, { Allow: 'POST, OPTIONS' });
  const body = parseBody(event);
  if (!body) return answer(400, { ok: false, reason: 'body' }, origin);
  const db = adminClient();
  if (!db) return answer(503, { ok: false, reason: 'quiet' }, origin);
  if (body.action === 'start') return start(db, origin);
  if (body.action === 'approve') return approve(db, event, body, origin);
  if (body.action === 'claim') return claim(db, body, origin);
  return answer(400, { ok: false, reason: 'bad action' }, origin);
};

export const config = {
  path: HANDOFF_PATH,
  rateLimit: {
    windowLimit: 90,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};

export default handler;
