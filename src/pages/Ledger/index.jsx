// src/pages/Ledger/index.jsx
// SENTINEL: NB_BURROW_LEDGER_V1
//
// The ledger room. Epoch's desk with the week laid open on it. An hourly
// reading of the coin, price and holders and the pool, drawn as two small
// charts and a row of vitals. His line is the architecture: value moves
// (the price chart), history remains (the holders chart).
//
// ── WHERE THE NUMBERS COME FROM ─────────────────────────────────────────────
// token_snapshots in the shared Supabase project, written hourly by the
// studio's netlify/functions/token-snapshot.js from GeckoTerminal, Jupiter
// and the chain itself. Anon readable, so the fetch is a plain client select.
// Rows fail soft at the source, a row can carry holders and no price, every
// series filters its own nulls rather than trusting the row.
//
// The select is DESCENDING with a limit then reversed here. Ascending with a
// limit would pin the window to the oldest rows the moment the table outgrew
// the limit, which it will.
//
// ── THE CHARTS ──────────────────────────────────────────────────────────────
// Hand rolled svg, no chart library, phosphor ships nothing it does not need.
// viewBox 600x160 stretched with preserveAspectRatio none, labels live in
// html outside the svg so they never stretch. One lime per screen, the
// holders chart gets it because history is the room's promise. Price draws
// in the quiet teal the room already uses for handles.
//
// ── THE GATE ────────────────────────────────────────────────────────────────
// Holders only, same as the room. useHolder on mount, anything but in walks
// back to the door. The soft copy of a gate, rls on the tables is the hard
// one, though this table is deliberately public, the gate here is the point
// of the room, holders get the reading first.
//
// No oxford commas, no em dashes.

import { useEffect, useMemo, useState } from 'react';
import { Box, HStack, Text, VStack, SimpleGrid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { EASE } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { supabase } from '../../lib/supabase';
import { t } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };
const TEAL = '#7FD4C8';

const fmtUsd = (n) => {
  if (n == null || !Number.isFinite(n)) return '·';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
};

const fmtPct = (n) => (n == null || !Number.isFinite(n) ? null : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`);

// One series drawn as a filled line. Points arrive as numbers already
// filtered of nulls. The svg stretches to its box, so nothing but the two
// paths lives inside it.
const Spark = ({ points, stroke, fill }) => {
  const d = useMemo(() => {
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const pad = (max - min) * 0.12 || max * 0.05 || 1;
    const lo = min - pad;
    const span = max + pad - lo;
    const W = 600;
    const H = 160;
    const xy = points.map((v, i) => [
      (i / (points.length - 1)) * W,
      H - ((v - lo) / span) * H,
    ]);
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L${W} ${H} L0 ${H} Z` };
  }, [points]);

  if (!d) return null;
  return (
    <Box as="svg" viewBox="0 0 600 160" preserveAspectRatio="none" w="100%" h={{ base: '120px', md: '160px' }} display="block">
      <path d={d.area} fill={fill} stroke="none" />
      <path d={d.line} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </Box>
  );
};

const Chart = ({ label, rows, pick, stroke, fill, format }) => {
  const points = rows.map(pick).filter((v) => v != null && Number.isFinite(v));
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <Box border="1px solid" borderColor={colors.surface.line} borderRadius="16px" overflow="hidden" bg={colors.surface.raised}>
      <HStack justify="space-between" px={4} pt={3.5} pb={1}>
        <Text {...kicker} color={colors.text.muted}>{label}</Text>
        <Text fontFamily="mono" fontSize="12px" color={colors.text.primary}>{format(last)}</Text>
      </HStack>
      <Spark points={points} stroke={stroke} fill={fill} />
      <HStack justify="space-between" px={4} pb={3} pt={1.5}>
        <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>{t('ledger_week')} · {format(first)}</Text>
        <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>{t('ledger_now')}</Text>
      </HStack>
    </Box>
  );
};

const Stat = ({ label, value, aside, asideColor }) => (
  <Box border="1px solid" borderColor={colors.surface.line} borderRadius="16px" px={4} py={3.5} bg={colors.surface.raised}>
    <Text {...kicker} color={colors.text.muted} mb={1.5}>{label}</Text>
    <HStack align="baseline" spacing={2}>
      <Text fontFamily="mono" fontSize="16px" color={colors.text.primary}>{value}</Text>
      {aside && <Text fontFamily="mono" fontSize="11px" color={asideColor || colors.text.muted}>{aside}</Text>}
    </HStack>
  </Box>
);

const Ledger = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (holder.state !== 'in' || !supabase) return;
    supabase
      .from('token_snapshots')
      .select('taken_at,price_usd,holders,liquidity_usd,volume_24h_usd,change_24h_pct,buys_24h,sells_24h')
      .order('taken_at', { ascending: false })
      .limit(168)
      .then(({ data }) => setRows((data || []).slice().reverse()));
  }, [holder.state]);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  const last = rows?.length ? rows[rows.length - 1] : null;
  const firstHolders = rows?.map((r) => r.holders).find((v) => v != null) ?? null;
  const lastHolders = last?.holders ?? null;
  const weekDelta = firstHolders != null && lastHolders != null ? lastHolders - firstHolders : null;
  const change = fmtPct(last?.change_24h_pct);

  return (
    <Box flex="1" overflowY="auto">
      <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }} pt={{ base: 8, md: 12 }} pb={16}
        sx={{
          '@keyframes lrRise': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
          animation: `lrRise 0.55s ${EASE} both`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Text {...kicker} color={colors.text.muted} mb={4}>{t('ledger_kicker')}</Text>
        <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '22px', md: '26px' }} color={colors.text.primary} mb={2}>
          {t('ledger_title')}
        </Text>
        <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary} mb={{ base: 6, md: 8 }}>
          {t('ledger_line')}
        </Text>

        {rows && rows.length < 2 && (
          <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>{t('ledger_empty')}</Text>
        )}

        {rows && rows.length >= 2 && (
          <VStack align="stretch" spacing={4}>
            <Chart
              label={t('ledger_holders_chart')}
              rows={rows}
              pick={(r) => r.holders}
              stroke={colors.accent.signal}
              fill={colors.accent.signalAlpha[8]}
              format={(v) => `${Math.round(v)}`}
            />
            <Chart
              label={t('ledger_price_chart')}
              rows={rows}
              pick={(r) => r.price_usd}
              stroke={TEAL}
              fill="rgba(127, 212, 200, 0.07)"
              format={fmtUsd}
            />
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Stat label={t('ledger_price')} value={fmtUsd(last?.price_usd)}
                aside={change} asideColor={last?.change_24h_pct > 0 ? TEAL : colors.text.muted} />
              <Stat label={t('ledger_holders')} value={lastHolders != null ? lastHolders : '·'}
                aside={weekDelta != null ? `${weekDelta >= 0 ? '+' : ''}${weekDelta} ${t('ledger_week_delta')}` : null}
                asideColor={weekDelta > 0 ? TEAL : colors.text.muted} />
              <Stat label={t('ledger_pool')} value={fmtUsd(last?.liquidity_usd)} />
              <Stat label={t('ledger_volume')} value={fmtUsd(last?.volume_24h_usd)} />
            </SimpleGrid>
            {(last?.buys_24h != null || last?.sells_24h != null) && (
              <SimpleGrid columns={2} spacing={4}>
                <Stat label={t('ledger_buys')} value={last?.buys_24h ?? '·'} />
                <Stat label={t('ledger_sells')} value={last?.sells_24h ?? '·'} />
              </SimpleGrid>
            )}
          </VStack>
        )}

        <HStack mt={{ base: 8, md: 10 }} pt={5} borderTop="1px solid" borderColor={colors.surface.line} justify="space-between">
          <Box as="button" type="button" onClick={() => nav('/room/?r=the-coin')}
            fontFamily="mono" fontSize="11px" color={colors.accent.signal}
            transition={`opacity 200ms ${EASE}`} _hover={{ opacity: 0.8 }}>
            ← {t('room_back')}
          </Box>
          <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>epoch</Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default Ledger;
