// src/data/tools.js
// SENTINEL: NB_PHOSPHOR_TOOLS_V1
//
// The holder-visible operating map. These rows explain what each system and
// public studio wallet may do. They contain public addresses and plain rules,
// never keys, environment values or signing material.
//
// Tool access is one of observe, prepare or human sign. No Phosphor worker has
// a signing role. Wallet rows name their allowed work so a later transaction
// can be checked against the role that existed when it happened.
//
// No oxford commas, no em dashes. No dollar figures.

export const ACCESS = {
  observe: 'observe',
  prepare: 'prepare',
  sign: 'human sign',
};

export const TOOLS = [
  {
    slug: 'solana-rpc',
    name: 'Solana RPC',
    icon: 'radio',
    access: ACCESS.observe,
    healthKey: 'chain',
    line: 'reads balances, supply, signatures and confirmed transactions from the chain.',
  },
  {
    slug: 'helius',
    name: 'Helius',
    icon: 'activity',
    access: ACCESS.observe,
    line: 'indexes wallet and pool events, then delivers bounded webhook facts to the ledger.',
  },
  {
    slug: 'supabase',
    name: 'Supabase',
    icon: 'database',
    access: ACCESS.observe,
    healthKey: 'database',
    line: 'verifies Web3 sessions and keeps holder, service, proposal and receipt state behind RLS.',
  },
  {
    slug: 'pumpswap',
    name: 'Pump.fun + PumpSwap',
    icon: 'layers',
    access: ACCESS.observe,
    line: 'the canonical launch and market venue. Phosphor observes it and never trades wallets against one another.',
  },
  {
    slug: 'jupiter',
    name: 'Jupiter Plugin',
    icon: 'prepare',
    access: ACCESS.prepare,
    line: 'prepares a holder\'s own swap. The connected wallet states and signs the transaction.',
  },
  {
    slug: 'wallet-signers',
    name: 'Phantom + Solflare',
    icon: 'pocket',
    access: ACCESS.sign,
    line: 'prove wallet ownership and show a reviewed transaction to the human who controls the key.',
  },
  {
    slug: 'solscan',
    name: 'Solscan',
    icon: 'eye',
    access: ACCESS.observe,
    line: 'opens the public evidence for an address, instruction or confirmed signature.',
  },
  {
    slug: 'netlify',
    name: 'Netlify Functions',
    icon: 'tool',
    access: ACCESS.prepare,
    line: 'runs bounded checks, receipts and proposals. A function never holds a wallet key.',
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    icon: 'service',
    access: ACCESS.observe,
    line: 'confirms cleared service revenue in its source currency before a treasury allocation is proposed.',
  },
  {
    slug: 'solana-pay',
    name: 'Direct Solana rail',
    icon: 'link',
    access: ACCESS.prepare,
    line: 'prepares SOL or USDC requests and verifies settlement. The customer signs and Tender receives.',
  },
];

export const WALLET_ROLES = [
  {
    slug: 'origin',
    name: 'Origin',
    address: 'Gn4M8Z6YVqJfz5VJ7zixoyYp69naKN1K9zV9sJtbUHV5',
    purpose: 'creator history and long-term holding',
    automatic: 'balance, exposure and movement alerts',
    human: 'every movement',
  },
  {
    slug: 'reserve',
    name: 'the Reserve',
    address: 'EwScGspTqWYDuQokKUvGG6bkseQEUL9gKPNdodBPoMLK',
    purpose: 'treasury preservation and approved operating funds',
    automatic: 'runway and allocation reporting',
    human: 'transfers and conversions',
  },
  {
    slug: 'open-hand',
    name: 'the Open Hand',
    address: '2aB6fpZP72Ld28E62bCnwdDH46rszZwRu3dR8vzwyDiM',
    purpose: 'tasks, puzzles and rewards sent outward',
    automatic: 'quotes, budget checks and payout proposals',
    human: 'every payout or market action',
  },
  {
    slug: 'lp',
    name: 'the LP',
    address: '9n35aUiNv2MW1DVjd8Rrh1edyRdSC31HdSWqcVSRT6wc',
    purpose: 'published liquidity positions and fee accounting',
    automatic: 'range health and rebalance proposals',
    human: 'open, add, remove, claim or rebalance',
  },
  {
    slug: 'tender-phone',
    name: 'Tender, phone',
    address: 'HmnkeUfcRaPZpBZv6K5s7s9FThsakSQjVJ2YKdEb9oko',
    purpose: 'small supervised settlements on hand',
    automatic: 'receipt matching and settlement proposals',
    human: 'refunds, payouts and conversions',
  },
  {
    slug: 'tender-desk',
    name: 'Tender, desk',
    address: '86JyeB94ABYCpQshm2xvoqf9WJopdEu8VGswYSufNDgE',
    purpose: 'direct Solana service settlement at the desk',
    automatic: 'request and payment reconciliation',
    human: 'refunds, payouts and conversions',
  },
  {
    slug: 'furnace',
    name: 'thefurnace',
    address: '59ujrcCz4fSXH88vJoeQVXxrd7qbAjXPhb4aWvCK5y9V',
    purpose: 'NEONBURRO intake for the ruled monthly burn',
    automatic: 'balance and misuse alerts',
    human: 'the Token-2022 burn instruction only',
  },
  {
    slug: 'build',
    name: 'Cypher, Build',
    address: '5u3VG7Yj5sF579cFLLCwFLh6KLrFYrAgpsaa5DBZB8v4',
    purpose: 'attribute build work and its public receipts',
    automatic: 'service accounting and proof summaries',
    human: 'every transfer or swap',
  },
];

export const PROPOSAL_STATES = [
  'observed',
  'proposed',
  'approved',
  'signed',
  'confirmed',
  'published',
  'rejected',
];

export default TOOLS;
