// src/components/BubbleMark.jsx
//
// The phosphor mark. A rounded square with a tail off the bottom right, which
// makes it a talk bubble, because phosphor is a room where holders talk to one
// another. Tyler, 2026-10-02, looking at the old mark: you almost have it, it
// is pretty much a rounded square and the bottom right would be like a chat
// bubble. He was reading borderRadius 4px 4px 1px 4px, which squared that one
// corner and got most of the way there without ever growing the tail.
//
// ── THE GEOMETRY LIVES HERE ONCE ────────────────────────────────────────────
//
// public/favicon.svg carries THE SAME PATH at THE SAME viewBox. There is no
// shared module between a react component and a static file in public, so the
// duplication is deliberate and documented in both places. If this path moves,
// move it in public/favicon.svg in the same commit or the tab and the header
// stop agreeing with each other.
//
// The tail is deliberately heavy. The header renders this at 13px, so a
// delicate tail would disappear entirely and leave a plain rounded square.
//
// No Oxford commas, no em dashes.

export const BUBBLE_PATH = 'M20 8 H44 A12 12 0 0 1 56 20 V32 L56 56 L38 44 H20 A12 12 0 0 1 8 32 V20 A12 12 0 0 1 20 8 Z';

const BubbleMark = ({ size = 13, color = '#C5D957', glow = null }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    focusable="false"
    style={glow ? { filter: `drop-shadow(0 0 6px ${glow})`, display: 'block' } : { display: 'block' }}>
    <path d={BUBBLE_PATH} fill={color} />
  </svg>
);

export default BubbleMark;
