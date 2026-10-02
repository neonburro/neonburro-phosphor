// netlify/functions/earnings-accrual.js
//
// The hourly close for burro service shares. Supabase owns the arithmetic so a
// retry, a delayed schedule and a second function instance all reach the same
// result. The database routine admits only reconciled service settlements with
// a confirmed customer payment and an active ruled percentage.
//
// This function posts accounting rows. It never prepares a wallet instruction,
// signs a payout or changes an earning rule. Payout proposals have their own
// human approval line.
//
// No oxford commas, no em dashes.

import { adminClient, json } from './_shared.js';

export const handler = async () => {
  const db = adminClient();
  if (!db) return json(503, { ok: false, error: 'database unavailable' });

  const { data, error } = await db.rpc('refresh_burro_earnings');
  if (error) {
    console.error('[earnings-accrual]', error.message);
    return json(503, { ok: false, error: 'accrual failed' });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return json(200, {
    ok: true,
    closedAt: new Date().toISOString(),
    allocationsCreated: Number(result?.allocations_created || 0),
    entriesCreated: Number(result?.entries_created || 0),
  });
};

export default handler;
