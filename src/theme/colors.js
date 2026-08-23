// src/theme/colors.js
//
// phosphor's palette. The same night as the studio, the same warm white ink,
// and the studio's own lime as the one accent, because Tyler ruled the
// product keeps the family colour. Teal survives with one job: money. A
// balance, a buy, a number that is yours reads teal, so your eye learns that
// teal in this room always means value. Purple keeps its one job too: the
// chain. A wallet address, a signature, nothing else.
//
// One accent spent like the studio spends it. Lime once per screen for the
// action that matters, teal only where money is stated, purple only where
// the chain talks. Never all three on one element.
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
    // lime, the family accent. actions, focus, the live dot
    signal: '#C5D957',
    signalHover: '#D2E26B',
    signalMuted: '#A6B84A',
    signalAlpha: {
      8: 'rgba(197,217,87,0.08)',
      16: 'rgba(197,217,87,0.16)',
      32: 'rgba(197,217,87,0.32)',
    },
    // teal, money only. balances, worth, a buy on the tape
    money: '#35E0C8',
    moneyMuted: '#1F8F80',
    moneyAlpha: {
      8: 'rgba(53,224,200,0.08)',
      16: 'rgba(53,224,200,0.16)',
      32: 'rgba(53,224,200,0.32)',
    },
    // purple, the chain. wallets, signatures. nowhere else
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
