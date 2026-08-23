// src/theme/colors.js
//
// The burrow's palette. The same night as the studio, the same warm white ink,
// and a different accent, because this is a different room.
//
// ── THE RING ────────────────────────────────────────────────────────────────
// The reference is a plate in the Solana folder on the studio's desk: a burro
// in a fedora inside a neon ring that runs teal on one side and purple on the
// other. Teal is ours, the avatar is the teal burro. Purple is the chain, the
// official Solana purple. The ring is the door. So teal is the one accent and
// it is spent once per screen, the way lime is spent once on the studio, and
// purple appears only where the chain itself is being talked about, a wallet,
// a signature, a balance. Never both on one element.
//
// Never lime here. Lime is the studio's and a visitor should feel they went
// somewhere when they came through the door.
//
// Surfaces and text are the studio's values under the studio's names so a
// component can move between the two repos without a rename.
//
// No oxford commas, no em dashes.

export const colors = {
  surface: {
    base: '#0B0B0C',
    raised: '#141416',
    sunken: '#070708',
    line: 'rgba(255,255,255,0.08)',
    lineStrong: 'rgba(255,255,255,0.14)',
  },
  text: {
    primary: '#F4F3F1',
    secondary: '#A8A7A4',
    muted: '#6E6E6B',
    inverse: '#0B0B0C',
  },
  accent: {
    // teal, the burrow's one accent. the avatar, the live dot, the focus ring
    signal: '#35E0C8',
    signalHover: '#5BEAD6',
    signalMuted: '#1F8F80',
    signalAlpha: {
      8: 'rgba(53,224,200,0.08)',
      16: 'rgba(53,224,200,0.16)',
      32: 'rgba(53,224,200,0.32)',
    },
    // purple, the chain. wallets, signatures, balances. nowhere else
    chain: '#9945FF',
    chainMuted: '#5E2BA8',
    chainAlpha: {
      8: 'rgba(153,69,255,0.08)',
      16: 'rgba(153,69,255,0.16)',
      32: 'rgba(153,69,255,0.32)',
    },
  },
};

export default colors;
