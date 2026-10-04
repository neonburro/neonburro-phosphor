// netlify/functions/_transparency.js
//
// One chain reader for the public operating wallet book. The scheduled writer
// and the holder checked feed both use this module so a live card and a stored
// graph can never disagree about which assets or price source count.
//
// NEONBURRO uses one mint filtered Token-2022 program read. Native SOL uses one
// getMultipleAccounts call. USDC needs one owner read per wallet because asking
// a node for every USDC account on Solana would be abusive. Those owner reads
// run three at a time. No key, seed or signing material enters this file.
//
// USD is context, not custody. A total is returned only when both market prices
// are fresh enough to resolve. USDC contributes at face value and remains shown
// separately. Failure leaves the estimate null rather than carrying an old
// number forward without a label.
//
// No oxford commas, no em dashes.

import { MINT, rpc } from './_shared.js';
import { OPERATING_REGISTRY_VERSION, WALLET_ROLES } from '../../src/data/tools.js';

const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PRICE_ENDPOINT = 'https://neonburro.com/.netlify/functions/token-price';
const LAMPORTS = 1_000_000_000;
const CACHE_MS = 60_000;
const BUCKET_MS = 20 * 60 * 1000;

let cache = { at: 0, body: null };

const number = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapLimit = async (list, limit, work) => {
  const output = new Array(list.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await work(list[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return output;
};

const priceContext = async () => {
  try {
    const response = await fetch(PRICE_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    const solPriceUsd = number(payload?.tokens?.sol?.usdPrice);
    const neonburroPriceUsd = number(payload?.tokens?.neonburro?.usdPrice);
    if (!solPriceUsd || !neonburroPriceUsd || payload?.stale) return null;
    const ageMs = Math.max(0, number(payload?.ageMs) || 0);
    return {
      solPriceUsd,
      neonburroPriceUsd,
      priceSource: 'Jupiter through neonburro.com',
      priceObservedAt: new Date(Date.now() - ageMs).toISOString(),
      stale: false,
    };
  } catch {
    return null;
  }
};

const neonburroByOwner = async () => {
  const result = await rpc('getProgramAccounts', [
    TOKEN_2022,
    {
      encoding: 'jsonParsed',
      commitment: 'confirmed',
      filters: [{ memcmp: { offset: 0, bytes: MINT } }],
    },
  ]);
  const balances = {};
  for (const row of result || []) {
    const info = row?.account?.data?.parsed?.info;
    const owner = info?.owner;
    const amount = number(info?.tokenAmount?.uiAmountString);
    if (!owner || amount === null) continue;
    balances[owner] = (balances[owner] || 0) + amount;
  }
  return balances;
};

const usdcFor = async (wallet) => {
  const result = await rpc('getTokenAccountsByOwner', [
    wallet,
    { mint: USDC_MINT },
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ]);
  return (result?.value || []).reduce((sum, row) => {
    const amount = number(row?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString);
    return sum + (amount === null ? 0 : amount);
  }, 0);
};

export const observationBucket = (now = Date.now()) => (
  new Date(Math.floor(now / BUCKET_MS) * BUCKET_MS).toISOString()
);

export const readOperatingWallets = async ({ fresh = false } = {}) => {
  if (!fresh && cache.body && Date.now() - cache.at < CACHE_MS) return cache.body;

  const addresses = WALLET_ROLES.map((wallet) => wallet.address);
  const [native, neonburro, usdc, prices] = await Promise.all([
    rpc('getMultipleAccounts', [
      addresses,
      {
        encoding: 'base64',
        commitment: 'confirmed',
        dataSlice: { offset: 0, length: 0 },
      },
    ]),
    neonburroByOwner(),
    mapLimit(addresses, 3, usdcFor),
    priceContext(),
  ]);

  if (!Array.isArray(native?.value)) throw new Error('native balance rows missing');
  const observedAt = new Date().toISOString();
  const wallets = WALLET_ROLES.map((wallet, index) => {
    const solBalance = Number(native.value[index]?.lamports || 0) / LAMPORTS;
    const neonburroBalance = neonburro[wallet.address] || 0;
    const usdcBalance = usdc[index] || 0;
    const totalUsd = prices
      ? solBalance * prices.solPriceUsd
        + neonburroBalance * prices.neonburroPriceUsd
        + usdcBalance
      : null;
    return {
      wallet: wallet.address,
      walletRoleSlug: wallet.slug,
      walletLabel: wallet.name,
      observedAt,
      slot: native.context?.slot || null,
      solBalance,
      neonburroBalance,
      usdcBalance,
      solPriceUsd: prices?.solPriceUsd || null,
      neonburroPriceUsd: prices?.neonburroPriceUsd || null,
      totalUsd,
      priceSource: prices?.priceSource || null,
      priceObservedAt: prices?.priceObservedAt || null,
      priceStale: prices?.stale || false,
    };
  });

  const body = { wallets, observedAt, prices, registryVersion: OPERATING_REGISTRY_VERSION };
  cache = { at: Date.now(), body };
  return body;
};

export const snapshotRow = (wallet, observedAt = observationBucket()) => ({
  wallet: wallet.wallet,
  wallet_role_slug: wallet.walletRoleSlug,
  wallet_label: wallet.walletLabel,
  observed_at: observedAt,
  slot: wallet.slot,
  sol_balance: wallet.solBalance,
  neonburro_balance: wallet.neonburroBalance,
  usdc_balance: wallet.usdcBalance,
  sol_price_usd: wallet.solPriceUsd,
  neonburro_price_usd: wallet.neonburroPriceUsd,
  total_usd: wallet.totalUsd,
  price_source: wallet.priceSource,
});

export const publicWallet = (row) => ({
  wallet: row.wallet,
  walletRoleSlug: row.wallet_role_slug || row.walletRoleSlug,
  walletLabel: row.wallet_label || row.walletLabel,
  observedAt: row.observed_at || row.observedAt,
  slot: number(row.slot),
  solBalance: number(row.sol_balance ?? row.solBalance) || 0,
  neonburroBalance: number(row.neonburro_balance ?? row.neonburroBalance) || 0,
  usdcBalance: number(row.usdc_balance ?? row.usdcBalance) || 0,
  solPriceUsd: number(row.sol_price_usd ?? row.solPriceUsd),
  neonburroPriceUsd: number(row.neonburro_price_usd ?? row.neonburroPriceUsd),
  totalUsd: number(row.total_usd ?? row.totalUsd),
  priceSource: row.price_source || row.priceSource || null,
});
