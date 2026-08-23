// src/theme/layout.js
// SENTINEL: NB_LAYOUT_V4
//
// ── THE INVARIANT ───────────────────────────────────────────────────────────
//
//   The first glyph of the wordmark and the first character of every heading
//   sit at the same x. At every viewport width. On every page.
//
// ── WHY THIS FILE IS THE ONLY ONE ───────────────────────────────────────────
//
// There were two geometry modules. This one, and src/pages/Home/_geometry.js,
// written earlier to solve the same problem for the home page, with different
// numbers: rail 64px at lg against 40px here, sheet 1600px against 1680px. Two
// files both claiming to be the single source of truth is worse than none,
// because each one looks authoritative when you are reading it.
//
// _geometry.js now re-exports from here. It kept its name so the six components
// importing it did not have to change, and it is the reason the home page rail
// finally matches the nav.
//
// neonburro-shop/src/theme/layout.js is a deliberate copy of this file. Same
// rail, same sheet, same tile inset, same ease, same tile surface. A visitor
// crossing from the studio to the shop should not be able to feel the domain
// change. IF A VALUE MOVES HERE, MOVE IT THERE IN THE SAME COMMIT. There is no
// shared package, that is a known cost and it is smaller than a monorepo.
//
// ── CONTENT IS LEFT ALIGNED, NOT CENTRED ────────────────────────────────────
//
// Got this wrong once. V2 centred the column and made the nav track it with a
// CSS max() expression. Correct arithmetic, wrong decision: the nav is position
// fixed, so it can only ever match a FIXED left edge. Once the column centres,
// its x depends on window width, and a fixed element can only follow if every
// section on every page centres in the same sheet. The home page alone had four
// left edges. On a 2600px screen the nav landed at 460px, on top of a heading
// sitting at 78px.
//
// Left aligned removes the arithmetic. One number, one line, nothing to track
// and nothing to drift when somebody adds a section. SHEET still caps the column
// so a line cannot run 3000px wide. It just does not centre it.
//
// ── WHAT IS NOT IN HERE, ON PURPOSE ─────────────────────────────────────────
//
// The home page band geometry (BAND_GUTTER, PLATE_GAP, TEXT_RAIL, PLATE_RADIUS)
// is duplicated in LiveField.jsx and CollageSection.jsx with a sync note in
// each, not exported from here. See CLAUDE.md. Those four values belong to two
// halves of one band and nowhere else, and a shared constant would invite a
// third consumer.
//
// No oxford commas, no em dashes.

// ── the rail ────────────────────────────────────────────────────────────────
// ONE desktop value, not three. A rail that steps again at lg and xl cannot be
// matched by a fixed position element.
export const RAIL = { base: 5, md: 10 };
export const RAIL_PX = { base: 20, md: 40 };

// ── the sheet ───────────────────────────────────────────────────────────────
export const SHEET = '1680px';
export const SHEET_PX = 1680;

// ── the nav lockup ──────────────────────────────────────────────────────────
// The tile has 11px of padding and a 1px border, so its box starts 12px before
// its wordmark. NAV_LEFT subtracts that, so the LETTERFORM lands on the line.
// Aligning the box instead is what makes this look almost right, which is worse
// than looking wrong.
export const NAV_TILE_INSET = 12;
export const CONTENT_LEFT = `${RAIL_PX.md}px`;
export const NAV_LEFT = `${RAIL_PX.md - NAV_TILE_INSET}px`;
export const NAV_TOP = 26;
export const NAV_H = { base: '64px', md: '76px' };

// Mobile only. Scroll past this and a downward scroll hides the lockup, an
// upward scroll brings it back.
export const NAV_HIDE_AFTER = 120;

// Alias kept so older imports do not break. NAV_LEFT is the real answer.
export const NAV_GUTTER_MD = NAV_TOP;

// ── measure ─────────────────────────────────────────────────────────────────
// SHEET is a viewport constraint. MEASURE is a typographic one. Body copy
// stretched to 1680px is unreadable no matter how good the grid is, so prose
// gets MEASURE and only ever MEASURE. Conflating these two is the most common
// way this system gets broken.
export const MEASURE = '660px';
export const LEDE = '860px';

// ── rhythm ──────────────────────────────────────────────────────────────────
export const BAND_Y = { base: 16, md: 24, lg: 32 };
export const BAND_Y_TIGHT = { base: 12, md: 16, lg: 20 };
export const GUTTER = { base: 8, md: 10, lg: 14 };

// ── display scale ───────────────────────────────────────────────────────────
export const DISPLAY = {
  xl: { base: '38px', md: '68px', lg: '84px' },
  lg: { base: '32px', md: '52px', lg: '64px' },
  md: { base: '26px', md: '38px', lg: '46px' },
  sm: { base: '22px', md: '28px', lg: '32px' },
};

// ── surfaces ────────────────────────────────────────────────────────────────
// Two adjacent bands at the same value read as one flat slab with a hairline in
// it. Stepped by a few points of luminance they read as a stack, and the reader
// gets the order for free without anything being labelled.
export const SHADES = { sunken: '#070708', base: '#0B0B0C', raised: '#141416' };
export const STACK_ORDER = [SHADES.sunken, SHADES.base, SHADES.raised];

// ── motion ──────────────────────────────────────────────────────────────────
// Heavy ease out. Leaves fast, lands almost still. Material's 0.4/0/0.2/1 is
// the safe default and reads as software. This one reads as weight. It is
// already the curve in Navigation.jsx, SignalBar.jsx, CollageSection.jsx and
// the Blog components, written out by hand before it had a name. New work
// imports it from here.
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

// ── the tile surface ────────────────────────────────────────────────────────
// Warm smoked glass, not grey glass. The nav lockup on both domains, the shop's
// saddlebag pill and dock. Navigation.jsx still sets these four values inline
// (it writes them straight onto the element in a scroll handler), so if this
// changes, change Navigation.jsx and the shop's layout.js with it.
export const TILE = {
  bg: 'rgba(36, 26, 22, 0.72)',
  blur: 'blur(14px) saturate(140%)',
  border: 'rgba(110,110,107,0.28)',
  shadow: '0 10px 30px rgba(0,0,0,0.34)',
};

export default {
  RAIL, RAIL_PX, SHEET, SHEET_PX, MEASURE, LEDE,
  BAND_Y, GUTTER, DISPLAY, NAV_LEFT, NAV_TOP, CONTENT_LEFT, SHADES, EASE, TILE,
};
