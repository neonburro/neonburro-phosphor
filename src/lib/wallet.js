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

// ── THE WALLET STANDARD ─────────────────────────────────────────────────────
// Old wallets hang themselves on window.solana. New ones, jupiter mobile
// among them, announce through the wallet standard instead: the wallet
// listens for the app's ready event and registers itself through a callback.
// The night this file taught the door desktop extensions, tyler stood inside
// jupiter mobile's browser pressing a button that could not see the wallet
// wrapped around it. This collector runs at module load and keeps listening,
// wallets that arrive late still land in the list.
const standardWallets = [];
if (typeof window !== 'undefined') {
  try {
    const api = {
      register: (...ws) => {
        for (const w of ws) if (w && !standardWallets.includes(w)) standardWallets.push(w);
        return () => {};
      },
    };
    window.addEventListener('wallet-standard:register-wallet', (event) => {
      try { event.detail(api); } catch { /* a wallet that cannot register */ }
    });
    window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api }));
  } catch { /* very old browser, the globals below still work */ }
}

const isSolanaStandard = (w) => Array.isArray(w?.chains) && w.chains.some((c) => String(c).startsWith('solana:'))
  && (w.features?.['solana:signIn'] || w.features?.['solana:signMessage']);

// Supabase expects the injected provider shape, signIn taking a SIWS input
// and returning one output. A standard wallet returns an array of outputs
// from its feature, so this adapter unwraps it, and connects first when the
// wallet has no account exposed yet.
const adaptStandard = (w) => {
  const signInF = w.features?.['solana:signIn'];
  const connectF = w.features?.['standard:connect'];
  if (!signInF) return null;
  return {
    signIn: async (input) => {
      if (connectF && (!w.accounts || w.accounts.length === 0)) {
        try { await connectF.connect(); } catch { /* the sign in asks again */ }
      }
      const out = await signInF.signIn(input || {});
      return Array.isArray(out) ? out[0] : out;
    },
  };
};

export const STATEMENT = 'the stacks want to know this wallet is yours. nothing moves. nothing is spent.';

export const detect = () => {
  if (typeof window === 'undefined') return null;
  // jupiter answers first, the house preference, 2026-08-26. It can arrive
  // as a global or through the wallet standard and both are checked before
  // anybody else, because a browser holding an EMPTY solflare and a funded
  // jupiter used to get the empty one and a dead end. A locked jupiter is
  // fine, the connect ask wakes its unlock sheet.
  if (window.jupiter?.solana) return { kind: 'jupiter', wallet: window.jupiter.solana };
  const early = standardWallets.filter(isSolanaStandard).find((w) => /jupiter/i.test(w.name || ''));
  if (early) {
    const adapted = adaptStandard(early);
    if (adapted) return { kind: 'standard:jupiter', wallet: adapted };
  }
  // The shapes supabase documents: default detection reads window.solana, and
  // for the rest you hand over the CONTAINER the vendor ships, window.phantom
  // for phantom, window.braveSolana for brave. Solflare injects window.solflare
  // which is itself the provider. Tyler's own chrome runs solflare only, which
  // is how the first version of this file was caught passing the wrong thing.
  if (window.solana) return { kind: 'default', wallet: null };
  if (window.phantom?.solana) return { kind: 'phantom', wallet: window.phantom };
  if (window.braveSolana) return { kind: 'brave', wallet: window.braveSolana };
  if (window.solflare) return { kind: 'solflare', wallet: window.solflare };
  if (window.backpack) return { kind: 'backpack', wallet: window.backpack };
  if (window.coinbaseSolana) return { kind: 'coinbase', wallet: window.coinbaseSolana };
  if (window.okxwallet?.solana) return { kind: 'okx', wallet: window.okxwallet.solana };
  if (window.bitkeep?.solana) return { kind: 'bitget', wallet: window.bitkeep.solana };
  if (window.trustwallet?.solana) return { kind: 'trust', wallet: window.trustwallet.solana };
  if (window.exodus?.solana) return { kind: 'exodus', wallet: window.exodus.solana };
  if (window.magicEden?.solana) return { kind: 'magiceden', wallet: window.magicEden.solana };
  const standard = standardWallets.filter(isSolanaStandard);
  const pick = standard.find((w) => /jupiter/i.test(w.name || '')) || standard[0];
  if (pick) {
    const adapted = adaptStandard(pick);
    if (adapted) return { kind: `standard:${(pick.name || 'wallet').toLowerCase()}`, wallet: adapted };
  }
  return null;
};

// What the door can see, for the diagnostics line. Names, never keys.
export const seen = () => {
  if (typeof window === 'undefined') return [];
  const names = [];
  if (window.solana) names.push(window.solana.isPhantom ? 'phantom' : 'solana');
  if (window.phantom?.solana && !window.solana) names.push('phantom');
  if (window.braveSolana) names.push('brave');
  if (window.solflare) names.push('solflare');
  if (window.jupiter?.solana) names.push('jupiter');
  if (window.backpack) names.push('backpack');
  if (window.coinbaseSolana) names.push('coinbase');
  if (window.okxwallet?.solana) names.push('okx');
  if (window.bitkeep?.solana) names.push('bitget');
  if (window.trustwallet?.solana) names.push('trust');
  if (window.exodus?.solana) names.push('exodus');
  if (window.magicEden?.solana) names.push('magiceden');
  for (const w of standardWallets.filter(isSolanaStandard)) names.push(`${(w.name || 'standard').toLowerCase()}·std`);
  return [...new Set(names)];
};

// Every wallet the browser holds, one entry per name, jupiter first. The
// door's picker reads this so a browser holding several wallets gets a
// choice instead of the house favourite. Ported from the studio's
// send-a-burro gate 2026-08-27, Tyler's law that every wallet door in the
// family behaves the same. If this changes, change the studio's
// src/lib/sendABurro.js the same sitting, both files say so.
export const detectAll = () => {
  if (typeof window === 'undefined') return [];
  const list = [];
  const add = (name, wallet) => {
    if (!list.some((f) => f.name === name)) list.push({ name, wallet });
  };
  if (window.jupiter?.solana) add('jupiter', window.jupiter.solana);
  if (window.phantom?.solana) add('phantom', window.phantom);
  if (window.solflare) add('solflare', window.solflare);
  if (window.backpack) add('backpack', window.backpack);
  if (window.braveSolana) add('brave', window.braveSolana);
  if (window.coinbaseSolana) add('coinbase', window.coinbaseSolana);
  if (window.okxwallet?.solana) add('okx', window.okxwallet.solana);
  if (window.bitkeep?.solana) add('bitget', window.bitkeep.solana);
  if (window.trustwallet?.solana) add('trust', window.trustwallet.solana);
  if (window.exodus?.solana) add('exodus', window.exodus.solana);
  if (window.magicEden?.solana) add('magiceden', window.magicEden.solana);
  for (const w of standardWallets.filter(isSolanaStandard)) {
    const adapted = adaptStandard(w);
    if (adapted) add((w.name || 'wallet').toLowerCase(), adapted);
  }
  if (!list.length && window.solana) add('solana', null);
  list.sort((a, b) => (a.name === 'jupiter' ? -1 : b.name === 'jupiter' ? 1 : 0));
  return list;
};

// Sign in. Resolves to the Supabase session or throws with a sentence a
// person can read. Every failure is also logged with its real shape, the
// first cut swallowed errors into a generic quiet line and cost a night.
// Takes an optional choice from detectAll, no choice keeps the old
// jupiter first auto pick.
export const signIn = async (choice) => {
  if (!supabase) throw new Error('the room is not connected to its database yet');
  const found = choice || detect();
  if (!found) throw new Error('no wallet');
  const args = { chain: 'solana', statement: STATEMENT };
  if (found.wallet) args.wallet = found.wallet;
  const { data, error } = await supabase.auth.signInWithWeb3(args);
  if (error) {
    console.error('[wallet] signInWithWeb3', found.kind || found.name, error);
    throw new Error(error.message || 'the wallet did not sign');
  }
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
