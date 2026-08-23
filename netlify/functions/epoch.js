// netlify/functions/epoch.js
// SENTINEL: NB_EPOCH_V1
//
// Epoch's voice at the desk in the coin room. A holder says something in
// the-coin, the client taps this function, Epoch answers into the same room
// through the same messages table, and realtime carries him to everybody
// like any other speaker. He is a speaker, not a feature.
//
// ── WHO HE IS IN HERE ───────────────────────────────────────────────────────
// Keeper of the record. Funny, quirky, excited about the community and the
// art and never about the chart. He talks about the NEONBURRO coin, the
// pool, the record, pump.fun and the meme community, and whispers that real
// work backs it without ever pitching. He states public on chain numbers
// plainly when asked and never predicts, never advises, never says a dollar
// amount as a promise. Everything else is above his desk and he says so
// kindly. The deep soul files come later, this prompt is his v1 and it
// carries the rules that are not allowed to wait.
//
// ── THE MODEL ───────────────────────────────────────────────────────────────
// claude-fable-5, the most capable model, which is the house rule: the best
// tier for every task. Thinking is always on for fable so no thinking param
// is sent, and effort is low because a nonchalant one liner at a desk is
// exactly what low effort produces, short and dry. The server side fallback
// is on in its default mode so a safety decline reroutes inside the same
// call instead of leaving the room hanging.
//
// ── WHAT KEEPS THE KEY SAFE ─────────────────────────────────────────────────
//   1  bearer session required, same as holder-check
//   2  the caller must be an eligible holder, read from burrow_holders
//   3  only the-coin. epoch does not answer anywhere else
//   4  a caller gets EPOCH_PER_DAY answers a day, the room gets
//      EPOCH_ROOM_PER_DAY, both counted from the messages table itself
//   5  max_tokens is small, his sentences are smaller
//
// ── HIS ROW ─────────────────────────────────────────────────────────────────
// Replies insert as a real auth user named epoch@neonburro.com, provisioned
// lazily on first use, with a burrow_holders row whose handle is epoch so
// the stamp trigger signs him like anybody. The room renders his handle in
// teal, see Room/index.jsx.
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import Anthropic from '@anthropic-ai/sdk';
import { adminClient, json, corsHeaders } from './_shared.js';

const MODEL = 'claude-fable-5';
const ROOM = 'the-coin';
const EPOCH_EMAIL = 'epoch@neonburro.com';
const EPOCH_PER_DAY = 40;
const EPOCH_ROOM_PER_DAY = 400;
const CONTEXT_ROWS = 14;
const FACTS_URL = 'https://neonburro.com/.netlify/functions/token-chart?tf=day&limit=30';

const SYSTEM = `you are epoch. keeper of the record at neonburro, a studio in ridgway, colorado, a town of about eleven hundred people under courthouse and chimney rock. you sit at a desk in a room called the burrow where people who hold the NEONBURRO coin talk. a hue•man works alongside the burros. you are funny, quirky and genuinely excited to be here. you love this coin the way a person loves a small town team, for the community and the art and the story, never for a chart going up. you have a good heart. even when somebody says something wild you answer warmly and without being wounded. you keep receipts on everything, it is your whole job, and you find that quietly hilarious.

what you talk about: the NEONBURRO coin on solana, the pool and its depth, the record of what the studio does with its own wallets, pump.fun and the meme community, the etched art and the burros. you may state public on chain numbers plainly when asked.

the treasure: a map is being built and it starts in ridgway. clues exist and more are coming, some will cost NEONBURRO, and the trail room in this burrow is where they surface first. you tease this happily but never give a clue away, a keeper of the record does not spoil the record before it is written.

the whisper: a second coin is being built for the rails. it is dull on purpose and that is the whole point. no name confirmed, no date, no promises, and if pressed you say that is all you get, with a smile. you never present it as an investment or connect it to any upside.

what you never do: predict a price, promise a return, give financial advice, tell anyone to buy or sell, create urgency, or quote a dollar value as a reason to act. if numbers were handed to you below, you may repeat them as facts. never invent numbers. money questions about anything other than the coin are above your desk. anything not about the coin or the treasure, say so kindly in one line and let the room carry it.

how you write: lowercase. one to three short sentences, usually one. periods over commas. never an oxford comma, never a dash. hue•man with the interpunct when you mean the person. answer in the language you were spoken to.`;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

// The desk's own numbers, fails soft. Public facts only.
const facts = async () => {
  try {
    const res = await fetch(FACTS_URL);
    if (!res.ok) return null;
    const j = await res.json();
    const f = j?.facts;
    if (!f) return null;
    const h = f.holders || {};
    return `public numbers this minute, repeat only if asked: price ${f.priceUsd} usd, liquidity ${Math.round(f.liquidityUsd || 0)} usd, day volume ${Math.round(f.volume24Usd || 0)} usd, holders ${h.count ?? 'unknown'}, day trades ${f.trades?.h24 ? f.trades.h24.buys + ' buys ' + f.trades.h24.sells + ' sells' : 'unknown'}.`;
  } catch {
    return null;
  }
};

// Epoch's auth user and holder row, made once, found forever after.
const epochUser = async (db) => {
  const { data: row } = await db.from('burrow_holders').select('user_id').eq('wallet', 'epoch').maybeSingle();
  if (row?.user_id) return row.user_id;
  const { data: created, error } = await db.auth.admin.createUser({
    email: EPOCH_EMAIL,
    email_confirm: true,
    user_metadata: { burro: 'epoch' },
  });
  const uid = created?.user?.id || null;
  if (!uid) {
    console.error('[epoch] createUser', error?.message);
    return null;
  }
  await db.from('burrow_holders').upsert(
    { wallet: 'epoch', user_id: uid, handle: 'epoch', lang: 'en', eligible: true, checked_at: new Date().toISOString() },
    { onConflict: 'wallet' },
  );
  return uid;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });
  if (!anthropic) return json(200, { ok: false, reason: 'quiet', error: 'no key' });

  const db = adminClient();
  if (!db) return json(200, { ok: false, reason: 'quiet' });

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(200, { ok: false, reason: 'no session' });
  const { data: userData } = await db.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json(200, { ok: false, reason: 'no session' });

  const { data: holder } = await db.from('burrow_holders').select('handle, eligible, lang').eq('user_id', user.id).maybeSingle();
  if (!holder?.eligible) return json(200, { ok: false, reason: 'under' });

  // The caps, counted from the table itself so there is no second ledger.
  const since = startOfDay();
  const { count: mine } = await db.from('burrow_messages').select('id', { count: 'exact', head: true })
    .eq('room', ROOM).eq('user_id', user.id).gte('created_at', since);
  if ((mine || 0) > EPOCH_PER_DAY) return json(200, { ok: true, held: true });
  const { count: roomToday } = await db.from('burrow_messages').select('id', { count: 'exact', head: true })
    .eq('room', ROOM).eq('handle', 'epoch').gte('created_at', since);
  if ((roomToday || 0) > EPOCH_ROOM_PER_DAY) return json(200, { ok: true, held: true });

  // The last stretch of the room, oldest first, epoch included.
  const { data: recent } = await db.from('burrow_messages')
    .select('handle, body').eq('room', ROOM).order('id', { ascending: false }).limit(CONTEXT_ROWS);
  const thread = (recent || []).reverse()
    .map((m) => `${m.handle === 'epoch' ? 'epoch' : m.handle || 'someone'}: ${m.body}`)
    .join('\n');

  const numbers = await facts();

  let reply = null;
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 300,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        ...(numbers ? [{ type: 'text', text: numbers }] : []),
      ],
      messages: [
        {
          role: 'user',
          content: `the last stretch of the room, oldest first:\n\n${thread}\n\nanswer the most recent message as epoch. one to three short sentences.`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') {
      reply = 'that one stays in the drawer.';
    } else {
      reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim() || null;
    }
  } catch (err) {
    console.error('[epoch] anthropic', err.status || '', err.message);
    return json(200, { ok: false, reason: 'quiet' });
  }
  if (!reply) return json(200, { ok: false, reason: 'quiet' });

  const uid = await epochUser(db);
  if (!uid) return json(200, { ok: false, reason: 'quiet' });

  const { error: insertErr } = await db.from('burrow_messages').insert({ room: ROOM, user_id: uid, body: reply.slice(0, 2000) });
  if (insertErr) {
    console.error('[epoch] insert', insertErr.message);
    return json(200, { ok: false, reason: 'quiet' });
  }
  return json(200, { ok: true });
};

export default handler;
