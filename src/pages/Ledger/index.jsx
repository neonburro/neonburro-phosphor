// src/pages/Ledger/index.jsx
// SENTINEL: NB_BURROW_LEDGER_V2
//
// Epoch's week, stated without a dollar figure. The hourly token_snapshots
// record supplies holder count and pool activity. This room draws the holder
// history and names current buy and sell counts. The public studio chart owns
// market price, liquidity and currency conversion.
//
// The select is descending with a limit then reversed here. Ascending with a
// limit would freeze the window on the oldest rows once the table grows.
//
// Holders only. useHolder is the soft gate and database policy is the hard
// gate. Motion carries meaning and turns off with prefers-reduced-motion.
//
// No oxford commas, no em dashes. No dollar figures.

import { useEffect, useMemo, useState } from 'react';
import { Box, HStack, Text, VStack, SimpleGrid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { EASE } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { supabase } from '../../lib/supabase';
import { t } from '../../data/copy';

const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const Spark = ({ points }) => {
  const shape = useMemo(() => {
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const pad = (max - min) * 0.12 || max * 0.05 || 1;
    const low = min - pad;
    const span = max + pad - low;
    const width = 600;
    const height = 160;
    const coordinates = points.map((value, index) => [
      (index / (points.length - 1)) * width,
      height - ((value - low) / span) * height,
    ]);
    const line = coordinates
      .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ');
    return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
  }, [points]);

  if (!shape) return null;
  return (
    <Box as="svg" viewBox="0 0 600 160" preserveAspectRatio="none" w="100%" h={{ base: '120px', md: '160px' }} display="block">
      <path d={shape.area} fill={colors.accent.signalAlpha[8]} stroke="none" />
      <path d={shape.line} fill="none" stroke={colors.accent.signal} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </Box>
  );
};

const HolderChart = ({ rows }) => {
  const points = rows.map((row) => row.holders).filter((value) => value != null && Number.isFinite(value));
  if (points.length < 2) return null;
  return (
    <Box border="1px solid" borderColor={colors.surface.line} borderRadius="16px" overflow="hidden" bg={colors.surface.raised}>
      <HStack justify="space-between" px={4} pt={3.5} pb={1}>
        <Text {...kicker} color={colors.text.muted}>{t('ledger_holders_chart')}</Text>
        <Text fontFamily="mono" fontSize="12px" color={colors.text.primary}>{Math.round(points[points.length - 1])}</Text>
      </HStack>
      <Spark points={points} />
      <HStack justify="space-between" px={4} pb={3} pt={1.5}>
        <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>{t('ledger_week')} · {Math.round(points[0])}</Text>
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
      .select('taken_at,holders,buys_24h,sells_24h')
      .order('taken_at', { ascending: false })
      .limit(168)
      .then(({ data }) => setRows((data || []).slice().reverse()));
  }, [holder.state]);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  const last = rows?.length ? rows[rows.length - 1] : null;
  const firstHolders = rows?.map((row) => row.holders).find((value) => value != null) ?? null;
  const lastHolders = last?.holders ?? null;
  const weekDelta = firstHolders != null && lastHolders != null ? lastHolders - firstHolders : null;
  const trades = Number(last?.buys_24h || 0) + Number(last?.sells_24h || 0);

  return (
    <Box flex="1" overflowY="auto">
      <Box
        maxW="720px"
        mx="auto"
        px={{ base: 4, md: 6 }}
        pt={{ base: 8, md: 12 }}
        pb={28}
        sx={{
          '@keyframes lrRise': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'none' },
          },
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
            <HolderChart rows={rows} />
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Stat
                label={t('ledger_holders')}
                value={lastHolders != null ? lastHolders : '·'}
                aside={weekDelta != null ? `${weekDelta >= 0 ? '+' : ''}${weekDelta} ${t('ledger_week_delta')}` : null}
                asideColor={weekDelta > 0 ? colors.accent.signal : colors.text.muted}
              />
              <Stat label={t('ledger_buys')} value={last?.buys_24h ?? '·'} />
              <Stat label={t('ledger_sells')} value={last?.sells_24h ?? '·'} />
              <Stat label={t('wallet_tape')} value={trades} aside="24h" />
            </SimpleGrid>
          </VStack>
        )}

        <HStack mt={{ base: 8, md: 10 }} pt={5} borderTop="1px solid" borderColor={colors.surface.line} justify="space-between">
          <Box
            as="button"
            type="button"
            onClick={() => nav('/room/?r=the-coin')}
            fontFamily="mono"
            fontSize="11px"
            color={colors.accent.signal}
            transition={`opacity 200ms ${EASE}`}
            _hover={{ opacity: 0.8 }}
          >
            ← {t('room_back')}
          </Box>
          <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>epoch</Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default Ledger;
