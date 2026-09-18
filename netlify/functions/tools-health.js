// netlify/functions/tools-health.js
//
// The read-only pulse behind Phosphor Tools. It performs one cheap database
// query and one cheap chain query, then returns plain health words. It never
// returns environment values, provider errors, wallet data or signing state.
//
// This endpoint observes only. A green reading does not authorize a payment,
// market action or migration.
//
// No oxford commas, no em dashes.

import { adminClient, corsHeaders, json, rpc } from './_shared.js';

const databaseHealth = async () => {
  const db = adminClient();
  if (!db) return 'not configured';
  const { error } = await db
    .from('burrow_settings')
    .select('key')
    .eq('key', 'min_balance')
    .maybeSingle();
  return error ? 'degraded' : 'healthy';
};

const chainHealth = async () => {
  try {
    await rpc('getLatestBlockhash', [{ commitment: 'processed' }]);
    return 'healthy';
  } catch {
    return 'degraded';
  }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method' });

  const [database, chain] = await Promise.all([
    databaseHealth(),
    chainHealth(),
  ]);

  return json(200, {
    ok: true,
    checkedAt: new Date().toISOString(),
    checks: { database, chain },
  });
};

export default handler;
