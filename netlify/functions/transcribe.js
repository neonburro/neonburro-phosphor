// netlify/functions/transcribe.js
// SENTINEL: NB_TRANSCRIBE_V1
//
// The fallback ear. Step four of docs/speech.md. A holder in a browser with
// no Web Speech API (every wallet in app browser on iphone) holds the dot,
// the page records, and the audio lands here. This function hands it to
// deepgram and returns the words. The words go into the composer, never
// into the room, the person still presses send.
//
// ── THE VENDOR ──────────────────────────────────────────────────────────────
// Deepgram prerecorded, model nova-3. Verified 2026-09-12 against
// https://developers.deepgram.com/docs/pre-recorded-audio and
// https://developers.deepgram.com/docs/models-languages-overview. Endpoint
// POST https://api.deepgram.com/v1/listen with the raw bytes as the body and
// the audio Content-Type, header Authorization: Token <DEEPGRAM_API_KEY>,
// query model=nova-3 language=<code> smart_format=true. The transcript reads
// from results.channels[0].alternatives[0].transcript. The language is sent
// explicitly, never multi: multi covers ja but not zh, so a Mandarin speaker
// in multi mode comes back as noise. detect_language is deliberately off, it
// overrides the language option and the profile language is the point.
// results.channels[0].detected_language is read when present and otherwise
// the sent code is echoed as detected, the composer does not branch on it.
//
// ── WHO MAY SPEND THE CREDIT ────────────────────────────────────────────────
// The same bearer the room sends with, checked the same way epoch.js checks
// it: db.auth.getUser(token) on the admin client, then the burrow_holders
// row must be eligible. A signed in wallet under the line gets the door,
// not a transcription.
//
// ── THE CAPS, SAY THEM IN BOTH FILES ────────────────────────────────────────
// MAX_BYTES 5MB and MAX_SECONDS 60 match src/lib/speech.js. Bytes are
// checked before the vendor is called. Seconds can only be read after, from
// metadata.duration, so a forged client that sends ninety seconds spends the
// credit once and gets nothing back, and a real client stops the recorder at
// sixty and never trips it. Netlify's own body ceiling is 6MB and a binary
// body arrives base64, so the transport tops out near 4.4MB of audio, the
// 5MB line is a ceiling nobody reaches, a minute of opus is a quarter of one.
//
// ── FAIL SOFT ───────────────────────────────────────────────────────────────
// Every refusal is a 200 with ok false and a reason the composer maps onto a
// copy.js line: quiet (no key, vendor down, timeout), nothing (no words),
// long (over the caps), no session, under. The english sentence rides along
// as error for anything that does not speak copy.js. The key is never
// logged, only whether it is set.
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import { adminClient, json, corsHeaders } from './_shared.js';

const DEEPGRAM = 'https://api.deepgram.com/v1/listen';
const MODEL = 'nova-3';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SECONDS = 60;
const TIMEOUT_MS = 20_000;
const LANGS = { en: 'en', ja: 'ja', zh: 'zh' };
const TYPES = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'video/webm', 'video/mp4', 'application/octet-stream'];

const SAY = {
  quiet: 'the ear is quiet right now. type it, or try again in a minute.',
  nothing: 'nothing came through. hold the dot and speak up.',
  long: 'keep it under a minute.',
  'no session': 'sign in at the door first.',
  under: 'the door opens at the threshold. come back when it does.',
};

const soft = (reason) => json(200, { ok: false, reason, error: SAY[reason] || SAY.quiet });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    console.error('[transcribe] DEEPGRAM_API_KEY is not set');
    return soft('quiet');
  }

  const db = adminClient();
  if (!db) return soft('quiet');

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return soft('no session');
  const { data: userData } = await db.auth.getUser(token);
  const user = userData?.user;
  if (!user) return soft('no session');

  const { data: holder } = await db.from('burrow_holders').select('eligible, lang').eq('user_id', user.id).maybeSingle();
  if (!holder?.eligible) return soft('under');

  // The profile language wins, the query is what the page sends, the holder
  // row is the spare when the page sends nothing sensible.
  const asked = String(event.queryStringParameters?.lang || holder.lang || 'en').toLowerCase().slice(0, 2);
  const language = LANGS[asked] || 'en';

  const rawType = String(event.headers['content-type'] || event.headers['Content-Type'] || '').split(';')[0].trim().toLowerCase();
  const contentType = TYPES.includes(rawType) ? rawType : 'application/octet-stream';

  const audio = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'binary');
  if (audio.length < 1500) return soft('nothing');
  if (audio.length > MAX_BYTES) return soft('long');

  const url = `${DEEPGRAM}?model=${MODEL}&language=${language}&smart_format=true`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let result = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': contentType },
      body: audio,
      signal: ctl.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[transcribe] deepgram', res.status, detail.slice(0, 200));
      return soft('quiet');
    }
    result = await res.json();
  } catch (err) {
    console.error('[transcribe] fetch', err.name, err.message);
    return soft('quiet');
  } finally {
    clearTimeout(timer);
  }

  const duration = Number(result?.metadata?.duration);
  if (Number.isFinite(duration) && duration > MAX_SECONDS + 1) {
    console.warn('[transcribe] over cap', Math.round(duration), 's from', user.id);
    return soft('long');
  }

  const channel = result?.results?.channels?.[0];
  const text = String(channel?.alternatives?.[0]?.transcript || '').trim();
  if (!text) return soft('nothing');

  return json(200, {
    ok: true,
    text: text.slice(0, 2000),
    language,
    detected: channel?.detected_language || language,
    duration: Number.isFinite(duration) ? Math.round(duration * 10) / 10 : null,
  });
};

export default handler;
