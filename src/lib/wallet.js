// src/lib/wallet.js
//
// The one click. Find a Solana wallet in the browser, ask it to sign a
// sentence, hand the signature to Supabase, get a session back. No email, no
// password, nothing typed.
//
// ── WHY A SIGNATURE AND NOT A PASTED ADDRESS ─────────────────────────────────
// Tyler's first sketch was "paste your wallet address". An address is public.
// Anybody can paste the biggest holder's address and walk in as them. A
// signature costs the wallet nothing, proves the person holds the key, and is
// one tap. Supabase's Web3 provider does the verifying server side and issues
// a real session keyed to the address. That is the whole door.
//
// ── WHICH WALLETS ───────────────────────────────────────────────────────────
// Anything that speaks the Solana wallet standard: Phantom, Solflare, Backpack,
// Jupiter Mobile's in app browser. `detect()` looks in the usual places and
// returns the first live provider. Nothing found means the visitor has no
// wallet and gets the one link, see data/links.js.
//
// ── THE SENTENCE ────────────────────────────────────────────────────────────
// Most Solana wallets require a statement and show it on the consent sheet, so
// it is the first thing a holder reads from the burrow. It says what is being
// proved and nothing more.
//
// No oxford commas, no em dashes.

import { supabase } from './supabase';

export const STATEMENT = 'the burrow wants to know this wallet is yours. nothing moves. nothing is spent.';

export const detect = () => {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.phantom?.solana,
    window.solana,
    window.solflare,
    window.backpack,
    window.jupiter?.solana,
  ];
  return candidates.find((w) => w && (w.isPhantom || w.isSolflare || w.isBackpack || typeof w.signIn === 'function' || typeof w.signMessage === 'function')) || null;
};

// Sign in. Resolves to the Supabase session or throws with a sentence a
// person can read.
export const signIn = async () => {
  if (!supabase) throw new Error('the burrow is not connected to its database yet');
  const wallet = detect();
  if (!wallet) throw new Error('no wallet');
  const { data, error } = await supabase.auth.signInWithWeb3({ chain: 'solana', statement: STATEMENT, wallet });
  if (error) throw new Error(error.message || 'the wallet did not sign');
  return data?.session || null;
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

// The address Supabase recorded for this user. The Web3 provider puts it in
// the user's metadata, the exact key has moved once already, so every place it
// has been seen is tried.
export const addressOf = (user) => {
  if (!user) return null;
  const m = user.user_metadata || {};
  const c = m.custom_claims || {};
  const ids = Array.isArray(user.identities) ? user.identities : [];
  const fromIdentity = ids.map((i) => i?.identity_data?.address || i?.identity_data?.sub).find(Boolean);
  return c.address || m.address || fromIdentity || null;
};

export const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');
