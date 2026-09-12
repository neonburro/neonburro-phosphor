// src/lib/speech.js
//
// Hold to talk, the two rails. The room's composer holds one dot and speaks.
// This file decides which rail the browser gets and runs the one that needs
// plumbing. The page (src/pages/Room/index.jsx) owns the dot and the draft,
// this file owns nothing on screen.
//
// ── RAIL ONE, WEB SPEECH ────────────────────────────────────────────────────
// SpeechRecognition, on device, free, live. Chrome and Safari proper have it.
// The page runs it directly because the result callback writes the draft as
// the person speaks. speechLang() here maps the profile language to the tag
// that api wants, and it must cover every id in LANGS in src/data/copy.js.
//
// ── RAIL TWO, RECORD AND SEND ───────────────────────────────────────────────
// Every wallet in app browser on iphone (phantom, solflare, backpack) ships
// a webview with no SpeechRecognition at all, or one that answers every
// start() with service-not-allowed. Those are the people the room is for.
// So: MediaRecorder captures the hold, release posts the blob to
// netlify/functions/transcribe.js with the profile language, the text lands
// in the draft, the person reads it and sends. Never sent on their behalf.
//
// The pick is made once per page load by talkMode(): speech when the api is
// there and the user agent is not a known wallet, record when MediaRecorder
// and getUserMedia exist, none otherwise and the dot is not drawn. The page
// also flips speech to record at runtime when start() throws
// service-not-allowed, because some webviews expose the constructor and
// refuse the service, and the only way to know is to ask.
//
// ── THE CAPS, SAY THEM IN BOTH FILES ────────────────────────────────────────
// MAX_SECONDS 60 and MAX_BYTES 5MB here match transcribe.js. The client stops
// the recorder at the second cap and refuses to post above the byte cap, the
// function refuses both again because a client is a suggestion. Bitrate is
// asked at 32kbps so a full minute of opus is about a quarter of a megabyte,
// ios ignores the hint and records aac at its own rate, still well under.
//
// ── THE TRAPS ───────────────────────────────────────────────────────────────
// getUserMedia inside a wallet webview can be refused outright by the host
// app, not by the person. That surfaces as NotAllowedError or a missing
// mediaDevices, and there is nothing to retry. The page shows the safari
// line from copy.js and leaves the keyboard. On ios the recorder writes
// audio/mp4, on android and desktop audio/webm, and the blob's own type is
// what gets posted as Content-Type, deepgram sniffs the container anyway.
// A hold shorter than MIN_MS or a blob under MIN_BYTES is dropped without a
// request, a tap on the dot is not a sentence.
//
// No oxford commas, no em dashes.

import { supabase } from './supabase';

export const MAX_SECONDS = 60;
export const MAX_BYTES = 5 * 1024 * 1024;
const MIN_MS = 350;
const MIN_BYTES = 1500;
const ENDPOINT = '/.netlify/functions/transcribe';

// Profile id to the BCP-47 tag SpeechRecognition wants. One line per LANGS
// entry in src/data/copy.js, add a language there and here together.
export const speechLang = (id) => ({ en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' }[id] || 'en-US');

const SR = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);

export const inWalletWebview = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/phantom|solflare|backpack/i.test(ua)) return true;
  const injected = Boolean(window.solana || window.phantom || window.solflare || window.backpack);
  return injected && !SR();
};

export const canRecord = () =>
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder === 'function' &&
  Boolean(navigator.mediaDevices?.getUserMedia);

// 'speech' | 'record' | 'none'
export const talkMode = () => {
  if (SR() && !inWalletWebview()) return 'speech';
  if (canRecord()) return 'record';
  return 'none';
};

const pickMime = () => {
  const wants = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return wants.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

// Opens the mic and starts a recorder. Resolves to a handle with stop(),
// which resolves to the blob, or to null when the hold was too short.
// Throws when the mic is refused, the page turns that into the safari line.
export const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
  const chunks = [];
  const began = Date.now();
  let done = null;
  const finished = new Promise((resolve) => { done = resolve; });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((tr) => tr.stop());
    const blob = new Blob(chunks, { type: rec.mimeType || mime || '' });
    const ms = Date.now() - began;
    done(ms < MIN_MS || blob.size < MIN_BYTES ? null : blob);
  };
  rec.start();
  const cap = setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, MAX_SECONDS * 1000);
  return {
    stop: () => {
      clearTimeout(cap);
      if (rec.state !== 'inactive') rec.stop();
      return finished;
    },
  };
};

// Posts the blob with the session bearer and the profile language. Returns
// { ok: true, text, language, detected } or { ok: false, reason }. reason is
// one of quiet, nothing, long, no session or under and the page maps it onto
// a copy.js line. Never throws.
export const transcribe = async (blob, lang) => {
  if (!supabase || !blob) return { ok: false, reason: 'quiet' };
  if (blob.size > MAX_BYTES) return { ok: false, reason: 'long' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { ok: false, reason: 'no session' };
    const res = await fetch(`${ENDPOINT}?lang=${encodeURIComponent(lang || 'en')}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream', Authorization: `Bearer ${token}` },
      body: blob,
    });
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, reason: 'quiet' };
    return json;
  } catch {
    return { ok: false, reason: 'quiet' };
  }
};
