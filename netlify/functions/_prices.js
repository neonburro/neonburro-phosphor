// netlify/functions/_prices.js
//
// ── THE PRICE TABLE ─────────────────────────────────────────────────────────
//
// Dollars per million tokens for every model a burro runs on, and costOf,
// which turns the usage object an Anthropic response carries into one
// dollar figure for the agent_usage row. The numbers are the Claude API
// first party rates read from
// https://platform.claude.com/docs/en/about-claude/pricing on 2026-09-13.
// When Anthropic moves a price this file moves with it, and the rows
// already written keep the price they were written at, the daily Admin
// report is the exact number and reconciles them.
//
// ── SYNC ────────────────────────────────────────────────────────────────────
// This file lives twice, byte for byte, at netlify/functions/_prices.js in
// the neonburro repo and at netlify/functions/_prices.js in the
// neonburro-phosphor repo. Change one and copy it over the other in the same
// commit. The house rule for values that must match across repos is the
// duplication, documented, not a shared package.
//
// ── THE SHAPE OF A PRICE ────────────────────────────────────────────────────
//   input       base input tokens
//   output      output tokens
//   cacheRead   cache hits and refreshes, a tenth of input on every model
//               except claude-fable-5-1, where it is a fortieth (0.025x)
//   cacheWrite  five minute cache writes, 1.25x input. One hour writes are
//               2x input and are priced from the cache_creation breakdown
//               when the response carries it
// Batch halves input and output and stacks with the cache multipliers. Pass
// { batch: true } to costOf for a batch call, nothing here uses it yet.
//
// ── THE USAGE OBJECT ────────────────────────────────────────────────────────
// A response's usage carries input_tokens, output_tokens,
// cache_read_input_tokens and cache_creation_input_tokens, and on newer
// models a cache_creation object with ephemeral_5m_input_tokens and
// ephemeral_1h_input_tokens. input_tokens is the uncached part only, the
// cache counts are on top of it, so the four are summed without overlap.
//
// costOf returns null, not zero, for a model that is not in the table. A
// null cost in agent_usage says add the model here, a zero would say the
// call was free. No oxford commas, no em dashes.

const M = 1_000_000;

export const PRICES = {
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  'claude-fable-5': { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export const BATCH = 0.5;

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The four counts the row stores, pulled from a usage object of any age.
export const tokensOf = (usage = {}) => ({
  input: n(usage.input_tokens),
  output: n(usage.output_tokens),
  cacheRead: n(usage.cache_read_input_tokens),
  cacheWrite: n(usage.cache_creation_input_tokens),
  cacheWrite5m: n(usage.cache_creation?.ephemeral_5m_input_tokens),
  cacheWrite1h: n(usage.cache_creation?.ephemeral_1h_input_tokens),
});

export const costOf = (model, usage, { batch = false } = {}) => {
  const p = PRICES[String(model || '').trim()];
  if (!p) return null;
  const t = tokensOf(usage);
  const k = batch ? BATCH : 1;
  const write = t.cacheWrite5m || t.cacheWrite1h
    ? t.cacheWrite5m * p.cacheWrite + t.cacheWrite1h * p.input * 2
    : t.cacheWrite * p.cacheWrite;
  const dollars = (
    t.input * p.input * k
    + t.output * p.output * k
    + t.cacheRead * p.cacheRead * k
    + write * k
  ) / M;
  return Math.round(dollars * 1e6) / 1e6;
};
