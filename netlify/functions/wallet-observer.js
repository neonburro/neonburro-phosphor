// netlify/functions/wallet-observer.js
//
// Three times an hour this function writes one idempotent observation for each
// named operating wallet. It records public facts only. A heartbeat is not a
// trade and this function has no branch that builds, signs or submits one.
//
// The twenty minute timestamp is rounded before the upsert. A retry therefore
// repairs the same bucket instead of drawing a fake second point. A missing
// price writes native balances with null USD context.
//
// No oxford commas, no em dashes.

import { adminClient, json } from './_shared.js';
import { observationBucket, readOperatingWallets, snapshotRow } from './_transparency.js';

export const handler = async () => {
  const db = adminClient();
  if (!db) return json(503, { ok: false, error: 'database unavailable' });

  try {
    const observation = await readOperatingWallets({ fresh: true });
    const observedAt = observationBucket();
    const rows = observation.wallets.map((wallet) => snapshotRow(wallet, observedAt));
    const { error } = await db
      .from('burro_wallet_snapshots')
      .upsert(rows, { onConflict: 'wallet,observed_at' });
    if (error) throw error;
    return json(200, {
      ok: true,
      observedAt,
      wallets: rows.length,
      usdResolved: rows.every((row) => row.total_usd !== null),
    });
  } catch (error) {
    console.error('[wallet-observer]', error.message);
    return json(503, { ok: false, error: 'observation failed' });
  }
};

export default handler;
