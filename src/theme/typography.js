// src/theme/typography.js
// SENTINEL: NB_TYPE_V2
//
// ── TWO FACES ───────────────────────────────────────────────────────────────
//
// Geist Sans reads, Geist Mono labels. Both are self hosted through
// @fontsource (imported once in src/main.jsx, latin subset only), so nothing
// here depends on a third party request. Sans ships in 400 500 600 700, mono
// in 400 500. Do not add weights or faces without a reason that survives a
// build size check, the fonts are on the critical path of every page.
//
// ── THE SCALE, IN PIXELS ────────────────────────────────────────────────────
//
// Pixels rather than rems on purpose. The wordmark and the collage geometry
// are tuned to the pixel and a user font size preference does not need to
// resize the brand. Body copy is md 16 on relaxed 1.6. Headings are Sans at
// 600 with tight tracking, never 800. 8xl and 9xl exist for the hero wordmark
// alone.
//
// neonburro-shop/src/theme/typography.js is a copy of this scale so a visitor
// crossing from the studio to the shop cannot feel the type change. If a value
// moves here, move it there in the same commit.
//
// ── TEXT STYLES ─────────────────────────────────────────────────────────────
//
// textStyles name the three patterns that recur on every page, so a component
// can say textStyle="kicker" instead of restating five props. They are the
// canon for the values in the brand brief. Nothing is forced to use them, but
// new work should.
//
//   kicker     mono 10px 500, uppercase, 0.2em. Above a heading, beside a dot.
//              Muted grey by default, lime when it names something live. This
//              replaces badges, chips and coloured pills, which we do not use.
//   wordmark   Sans 600 lowercase, tracking -0.035em, line height 1. The name.
//              The period is a separate lime disc, see Hero.jsx and Footer.jsx.
//   lede       lg to xl at relaxed. The one paragraph under a heading.
//
// No oxford commas, no em dashes.

export const typography = {
  fonts: {
    heading: "'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
  },
  fontSizes: {
    '2xs': '11px',
    'xs': '12px',
    'sm': '14px',
    'md': '16px',    // body
    'lg': '18px',    // lede on mobile
    'xl': '21px',    // lede
    '2xl': '26px',   // h3, room names
    '3xl': '32px',   // h1 on mobile
    '4xl': '40px',   // h2
    '5xl': '52px',   // h1
    '6xl': '64px',   // display
    '7xl': '80px',
    '8xl': '96px',   // hero wordmark on md
    '9xl': '128px',  // hero wordmark on lg and up
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    none: 1,         // the wordmark
    tight: 1.08,     // display and h1
    snug: 1.18,      // h2 and h3
    normal: 1.4,     // ui copy, captions
    relaxed: 1.6,    // body
  },
  letterSpacings: {
    tighter: '-0.04em',  // the wordmark, the footer mark
    tight: '-0.02em',    // every heading
    normal: '0',
    wide: '0.02em',
    wider: '0.06em',
    widest: '0.14em',    // kickers start here and run to 0.24em
  },
  textStyles: {
    kicker: {
      fontFamily: "'Geist Mono', ui-monospace, monospace",
      fontSize: '10px',
      fontWeight: 500,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
    wordmark: {
      fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 600,
      letterSpacing: '-0.035em',
      lineHeight: 1,
      textTransform: 'lowercase',
    },
    lede: {
      fontSize: { base: '18px', md: '21px' },
      lineHeight: 1.6,
      fontWeight: 400,
    },
  },
};

export default typography;
