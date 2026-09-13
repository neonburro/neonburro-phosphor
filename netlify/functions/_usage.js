// netlify/functions/_usage.js
//
// ── THE METER ───────────────────────────────────────────────────────────────
//
// recordUsage writes one agent_usage row for one Claude call. It is the
// "our side, immediate, per call" half of the studio's
// docs/02-engineering/agent-hosting.md. Epoch calls it after he answers,
// passes the model string the response says it used and the response's
// usage object, and goes on with his reply. The cost comes from _prices.js.
//
// ── WHAT IT PROMISES ────────────────────────────────────────────────────────
//   never throws       every path is caught, the reply is never at risk
//   never blocks long  the insert is raced against a short ceiling so a
//                      slow database costs the room at most that long
//   one sentence       a failure is one plain console line, no stack
//
// ── WHY THE CALLER STILL AWAITS IT ──────────────────────────────────────────
// Netlify functions run on Lambda and the runtime freezes the instant the
// handler returns. A fetch left un-awaited lands only if the container
// happens to wake again for a later call, so a real fire and forget drops
// rows at random, and a meter that drops rows is the lost write the plan
// warns about. So recordUsage starts the insert at once and returns a
// promise that resolves within CEILING_MS whatever happens. The caller
// awaits it last, after its own work, which in epoch.js overlaps the two
// database round trips it does anyway. The reply is held for the insert or
// the ceiling, whichever is first, and the row is not left to chance.
//
// ── THE KEY ─────────────────────────────────────────────────────────────────
// serverKey from _shared.js, the burrow's one rung ladder, which returns a
// [name, key] pair. Destructure or the write goes 401. The service role
// bypasses RLS on agent_usage and no lesser key has an insert policy, so a
// write that lands on a dead key is refused and says so.
//
// The studio repo carries its own netlify/functions/_usage.js, the same
// file but for the ladder line, it walks supabaseKeyLadder from its own
// _shared.js. No oxford commas, no em dashes.

import { supabaseUrl, serverKey } from './_shared.js';
import { costOf, tokensOf } from './_prices.js';

const CEILING_MS = 1200;

const insertRow = async (row) => {
  const url = supabaseUrl();
  const ladder = [serverKey()].filter(([, key]) => Boolean(key));
  if (!url || ladder.length === 0) {
    console.warn('[usage] no SUPABASE_URL or server key on this site, the call was not counted.');
    return false;
  }
  for (const [name, key] of ladder) {
    try {
      const res = await fetch(`${url}/rest/v1/agent_usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
      if (res.ok) return true;
      const detail = (await res.text().catch(() => '')).slice(0, 160);
      if (res.status === 401 || res.status === 403) {
        console.warn(`[usage] ${name} was refused (${res.status}), trying the next rung.`);
        continue;
      }
      console.warn(`[usage] agent_usage insert failed with ${name}, ${res.status}, ${detail}`);
      return false;
    } catch (err) {
      console.warn(`[usage] agent_usage insert threw with ${name}, ${err.message}`);
    }
  }
  console.warn('[usage] every key on the ladder was refused, the call was not counted.');
  return false;
};

export const recordUsage = ({ burro, model, usage, site, requestId, clientId } = {}) => {
  try {
    const t = tokensOf(usage);
    const cost = costOf(model, usage);
    if (cost === null) console.warn(`[usage] no price for ${model || 'an unnamed model'}, the row is written with cost null.`);
    const row = {
      burro: String(burro || 'unknown').toLowerCase(),
      client_id: clientId || null,
      model: String(model || 'unknown'),
      input_tokens: t.input,
      output_tokens: t.output,
      cache_read_tokens: t.cacheRead,
      cache_write_tokens: t.cacheWrite,
      cost_usd: cost,
      source: 'live',
      request_id: requestId || null,
      site: site || null,
    };
    const write = insertRow(row).catch((err) => {
      console.warn(`[usage] the meter write failed, ${err.message}`);
      return false;
    });
    const ceiling = new Promise((resolve) => setTimeout(() => resolve(false), CEILING_MS));
    return Promise.race([write, ceiling]);
  } catch (err) {
    console.warn(`[usage] the meter could not shape the row, ${err.message}`);
    return Promise.resolve(false);
  }
};
