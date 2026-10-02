// netlify/functions/transparency-feed.js
//
// The holder checked door between the transparency page and its two records.
// Live wallet balances come from the public chain reader. Seven day history and
// service earnings come from the shared Supabase project when the reviewed
// migration is present. A missing migration leaves a clearly labelled fitting
// state while current chain balances remain useful.
//
// The service role is used only after Supabase verifies the bearer and the
// holder row says eligible. The response contains no payer wallet, customer,
// service run id, payout destination or internal note. Community wallet SOL is
// never requested here and never returned.
//
// No oxford commas, no em dashes.

import { adminClient, corsHeaders, json } from './_shared.js';
import { publicWallet, readOperatingWallets } from './_transparency.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const bearer = (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header.replace(/^Bearer\s+/i, '').trim();
};

const holderAllowed = async (db, token) => {
  if (!token) return false;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user?.id) return false;
  const result = await db
    .from('burrow_holders')
    .select('wallet,eligible')
    .eq('user_id', data.user.id)
    .eq('eligible', true)
    .limit(1)
    .maybeSingle();
  return Boolean(!result.error && result.data?.wallet);
};

const historyTotals = (rows) => {
  const hours = new Map();
  for (const row of rows || []) {
    const at = new Date(row.observed_at);
    if (Number.isNaN(at.getTime())) continue;
    at.setUTCMinutes(0, 0, 0);
    const key = at.toISOString();
    const role = row.wallet_role_slug;
    if (!hours.has(key)) hours.set(key, new Map());
    const byRole = hours.get(key);
    const prior = byRole.get(role);
    if (!prior || new Date(row.observed_at) > new Date(prior.observed_at)) byRole.set(role, row);
  }
  return [...hours.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([at, byRole]) => {
      const rowsForHour = [...byRole.values()];
      const sum = (field) => rowsForHour.reduce((total, row) => total + (Number(row[field]) || 0), 0);
      const completeUsd = rowsForHour.length > 0 && rowsForHour.every((row) => row.total_usd !== null);
      return {
        at,
        sol: sum('sol_balance'),
        neonburro: sum('neonburro_balance'),
        usdc: sum('usdc_balance'),
        usd: completeUsd ? sum('total_usd') : null,
      };
    });
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method' });

  const db = adminClient();
  if (!db) return json(503, { ok: false, error: 'database unavailable' });
  if (!(await holderAllowed(db, bearer(event)))) return json(403, { ok: false, error: 'holder gate' });

  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [liveResult, historyResult, latestResult, earningsResult] = await Promise.allSettled([
    readOperatingWallets(),
    db
      .from('burro_wallet_snapshots')
      .select('wallet_role_slug,observed_at,sol_balance,neonburro_balance,usdc_balance,total_usd')
      .gte('observed_at', since)
      .order('observed_at', { ascending: true }),
    db
      .from('burro_wallet_latest')
      .select('wallet,wallet_role_slug,wallet_label,observed_at,slot,sol_balance,neonburro_balance,usdc_balance,sol_price_usd,neonburro_price_usd,total_usd,price_source'),
    db
      .from('burro_agent_earnings_public')
      .select('burro_slug,share_bps,accrual_hours,active,public_note,confirmed_revenue_usd_micros,allocated_usd_micros,accrued_usd_micros,proposed_usd_micros,settled_usd_micros,available_usd_micros,last_reconciled_at,last_accrued_at,last_payout_at,proof_contract_version')
      .order('burro_slug', { ascending: true }),
  ]);

  const live = liveResult.status === 'fulfilled' ? liveResult.value : null;
  const historyQuery = historyResult.status === 'fulfilled' ? historyResult.value : null;
  const latestQuery = latestResult.status === 'fulfilled' ? latestResult.value : null;
  const earningsQuery = earningsResult.status === 'fulfilled' ? earningsResult.value : null;
  const historyReady = Boolean(historyQuery && !historyQuery.error);
  const accountingReady = Boolean(
    earningsQuery
      && !earningsQuery.error
      && (earningsQuery.data || []).length > 0
      && (earningsQuery.data || []).every((row) => row.proof_contract_version === 'receipt-v2'),
  );
  const stored = latestQuery && !latestQuery.error ? (latestQuery.data || []).map(publicWallet) : [];

  return json(200, {
    ok: true,
    observedAt: live?.observedAt || stored[0]?.observedAt || null,
    wallets: live?.wallets || stored,
    history: historyReady ? historyTotals(historyQuery.data) : [],
    earnings: accountingReady ? earningsQuery.data || [] : [],
    historyReady,
    accountingReady,
    live: Boolean(live),
    notes: {
      chain: live ? null : 'the live node did not answer, the last stored observation is shown',
      history: historyReady ? null : 'wallet history waits on the reviewed transparency migration',
      accounting: accountingReady ? null : 'service earnings wait on the reviewed transparency migration',
    },
  });
};

export default handler;

export const config = {
  path: '/.netlify/functions/transparency-feed',
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};
