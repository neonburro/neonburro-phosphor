// src/data/handles.js
//
// Names are assigned, not chosen. Three to nine letters, a word and two
// digits, in the shape of a worktree name: marmot-07, pika-42, anvil-19.
// Tyler wanted the feel of a chain link, something you were handed rather than
// something you picked, and a room where nobody is "CryptoKing420".
//
// The words are the valley's and the studio's. Animals that live here, things
// on a workbench, water and weather, the energies the sigil dataset will grow
// into, see docs/sigils.md. Every word is six letters or fewer so the whole
// handle stays inside nine characters with the hyphen and two digits.
//
// `propose()` makes one. The server decides uniqueness, see holder-check.js,
// and the hello page rerolls on a collision. A holder can reroll before
// accepting and never after, a name that changes is not a name.
//
// No oxford commas, no em dashes.

export const WORDS = [
  // animals of the valley and the range
  'marmot', 'pika', 'elk', 'trout', 'raven', 'fox', 'hare', 'magpie', 'bighorn', 'otter', 'moth', 'heron', 'crab', 'owl', 'lynx', 'jay', 'wren', 'vole',
  // things on a bench
  'anvil', 'lantern', 'compass', 'chisel', 'awl', 'spool', 'flint', 'bell', 'key', 'ledger', 'stamp', 'knot', 'plumb', 'gauge', 'rivet', 'hinge',
  // water and weather
  'creek', 'snow', 'fog', 'hail', 'rain', 'frost', 'brook', 'eddy', 'thaw', 'mist', 'dew', 'squall',
  // energies
  'ember', 'spark', 'pulse', 'hum', 'glow', 'flare', 'tide', 'drift', 'static', 'volt', 'beam', 'echo',
].filter((w) => w.length <= 6);

const pad = (n) => String(n).padStart(2, '0');

export const propose = () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${word}-${pad(Math.floor(Math.random() * 100))}`;
};

export const valid = (h) => /^[a-z]{3,6}-\d{2}$/.test(h || '');
