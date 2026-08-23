// netlify/functions/holder-sweep.js
//
// The slow half of the gate, scheduled hourly in netlify.toml. Every wallet
// the burrow has ever seen gets its balance read again and its eligible flag
// set to the truth. holder-check.js catches a wallet the moment it visits,
// this catches the one that stopped visiting, so the room's count is honest
// even when nobody is home.
//
// Batched politely. A keyed rpc allows a burst but there is no hurry at all,
// so wallets go one at a time with a breath between, and an rpc failure skips
// the wallet rather than flipping it. A flag should only ever change because
// the chain answered.
//
// No oxford commas, no em dashes.

import { adminClient, balanceOf, threshold, json } from './_shared.js';

const BREATH_MS = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const handler = async () => {
  const db = adminClient();
  if (!db) return json(200, { ok: false, error: 'no database' });

  const min = await threshold(db);
  const { data: rows, error } = await db.from('burrow_holders').select('wallet, eligible');
  if (error) {
    console.error('[holder-sweep]', error.message);
    return json(200, { ok: false });
  }

  let flipped = 0;
  let skipped = 0;
  for (const r of rows || []) {
    try {
      const balance = await balanceOf(r.wallet);
      const eligible = balance >= min;
      await db.from('burrow_holders').update({ balance, eligible, checked_at: new Date().toISOString() }).eq('wallet', r.wallet);
      if (eligible !== r.eligible) flipped += 1;
    } catch (err) {
      skipped += 1;
      console.error('[holder-sweep]', r.wallet.slice(0, 6), err.message);
    }
    await sleep(BREATH_MS);
  }

  console.log(`[holder-sweep] ${rows?.length || 0} wallets, ${flipped} flipped, ${skipped} skipped, floor ${min}`);
  return json(200, { ok: true, wallets: rows?.length || 0, flipped, skipped });
};

export default handler;
