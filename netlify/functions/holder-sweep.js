// netlify/functions/holder-sweep.js
//
// The scheduled half of the holder gate. Each run reads a small ordered slice
// of wallets, checks the chain with limited concurrency and saves a cursor for
// the next run. Bounded batches matter because Netlify scheduled functions have
// a short execution ceiling and the first all-wallet loop nearly spent it on
// deliberate sleep before making the RPC calls.
//
// An RPC failure skips that wallet and never changes its eligibility. Grants
// remain eligible. The cursor wraps only after the final page so every known
// holder is revisited without one long function.
//
// No oxford commas, no em dashes.

import { adminClient, balanceOf, threshold, json } from './_shared.js';

const BATCH_SIZE = 12;
const CONCURRENCY = 3;
const CURSOR_KEY = 'holder_sweep_cursor';

const cursorOf = async (db) => {
  const { data, error } = await db
    .from('burrow_settings')
    .select('value')
    .eq('key', CURSOR_KEY)
    .maybeSingle();
  if (error) {
    console.error('[holder-sweep] cursor read', error.message);
    return '';
  }
  return String(data?.value || '');
};

const saveCursor = async (db, value) => {
  const { error } = await db.from('burrow_settings').upsert({
    key: CURSOR_KEY,
    value,
    note: 'last wallet visited by the bounded Phosphor holder sweep',
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`cursor write ${error.message}`);
};

const grantSet = async (db) => {
  const { data, error } = await db.from('burrow_grants').select('wallet');
  if (error) {
    console.error('[holder-sweep] grants', error.message);
    return new Set();
  }
  return new Set((data || []).map((row) => row.wallet));
};

const updateOne = async (db, row, min, grants) => {
  try {
    const balance = await balanceOf(row.wallet);
    const eligible = balance >= min || grants.has(row.wallet);
    const { error } = await db
      .from('burrow_holders')
      .update({ balance, eligible, checked_at: new Date().toISOString() })
      .eq('wallet', row.wallet);
    if (error) throw new Error(error.message);
    return { flipped: eligible !== row.eligible, skipped: false };
  } catch (error) {
    console.error('[holder-sweep]', row.wallet.slice(0, 6), error.message);
    return { flipped: false, skipped: true };
  }
};

export const handler = async () => {
  const db = adminClient();
  if (!db) return json(200, { ok: false, error: 'no database' });

  const [min, cursor, grants] = await Promise.all([
    threshold(db),
    cursorOf(db),
    grantSet(db),
  ]);

  let query = db
    .from('burrow_holders')
    .select('wallet, eligible')
    .order('wallet', { ascending: true })
    .limit(BATCH_SIZE);
  if (cursor) query = query.gt('wallet', cursor);

  const { data: rows, error } = await query;
  if (error) {
    console.error('[holder-sweep] holders', error.message);
    return json(200, { ok: false });
  }

  // An exact final page leaves the cursor at its last row. The next run sees
  // an empty page, wraps it and lets the following run begin a fresh cycle.
  if (!rows?.length) {
    try {
      await saveCursor(db, '');
    } catch (cursorError) {
      console.error('[holder-sweep]', cursorError.message);
      return json(200, { ok: false });
    }
    return json(200, { ok: true, wallets: 0, flipped: 0, skipped: 0, wrapped: true });
  }

  const outcomes = [];
  for (let index = 0; index < rows.length; index += CONCURRENCY) {
    const group = rows.slice(index, index + CONCURRENCY);
    outcomes.push(...await Promise.all(
      group.map((row) => updateOne(db, row, min, grants)),
    ));
  }

  const nextCursor = rows.length < BATCH_SIZE ? '' : rows[rows.length - 1].wallet;
  try {
    await saveCursor(db, nextCursor);
  } catch (cursorError) {
    console.error('[holder-sweep]', cursorError.message);
    return json(200, { ok: false });
  }

  const flipped = outcomes.filter((outcome) => outcome.flipped).length;
  const skipped = outcomes.filter((outcome) => outcome.skipped).length;
  console.log(
    `[holder-sweep] ${rows.length} wallets, ${flipped} flipped, ${skipped} skipped, floor ${min}`,
  );
  return json(200, {
    ok: true,
    wallets: rows.length,
    flipped,
    skipped,
    wrapped: nextCursor === '',
  });
};

export default handler;
