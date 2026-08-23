// src/pages/Wallet/index.jsx
// SENTINEL: NB_WALLET_TAB_V1
//
// The wallet tab, first cut of the product's first face. The holder's own
// money, said plainly: the handle, the wallet on a purple chip, NEONBURRO
// held, SOL for the road, what the holding is worth at the minute's price,
// and the last of the tape with the studio's wallets named. The buy desk is
// a marked seat for phase B, jupiter's swap embed, signed by the visitor's
// own wallet, nothing ever leaves it.
//
// ── WHERE THE NUMBERS COME FROM ─────────────────────────────────────────────
// The holder's balances ride holder-check, which reads the chain at request
// time. The price and the tape ride the studio's token-chart feed, one
// upstream cached for everybody. Nothing here is stored twice and nothing
// here moves value. The keys live in phantom or jupiter or wherever the
// holder keeps them, this page only reads.
//
// ── WORTH, SAID QUIETLY ─────────────────────────────────────────────────────
// The marketing rule is that a dollar is a rumour. A wallet is different, it
// is the holder's own money and hiding its value would be theatre. So worth
// is shown, small, mono, muted, arithmetic rather than excitement.
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import { useEffect, useState } from 'react';
import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { short } from '../../lib/wallet';
import { t } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };
const MONO = 'mono';
const FEED = 'https://neonburro.com/.netlify/functions/token-chart?tf=day&limit=30';

const compactUsd = (n) => (n == null ? null : `$${Number(n).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`);
const whole = (n) => (n == null ? '...' : Math.round(n).toLocaleString('en-US'));

const ago = (ts, now) => {
  const s = Math.max(0, now - ts);
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const Wallet = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [feed, setFeed] = useState(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    const pull = () => fetch(FEED).then((r) => r.json()).then((j) => { if (live) { setFeed(j); setNow(Math.floor(Date.now() / 1000)); } }).catch(() => {});
    pull();
    const beat = setInterval(pull, 60_000);
    return () => { live = false; clearInterval(beat); };
  }, []);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily={MONO} fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  const price = feed?.facts?.priceUsd ?? null;
  const change = feed?.facts?.change24 ?? null;
  const worth = price != null && holder.balance != null ? holder.balance * price : null;
  const named = Object.fromEntries((feed?.wallets || []).map((w) => [w.address, w.burro ? `${w.burro} · ${String(w.label || '').toLowerCase()}` : String(w.label || 'origin').toLowerCase()]));
  const tape = (feed?.trades || []).slice(0, 6);

  return (
    <VStack flex="1" align="stretch" px={RAIL} pt={8} pb={28} spacing={7} maxW="760px" overflowY="auto">
      <VStack align="start" spacing={2}>
        <Text {...kicker} color={colors.accent.signal}>{t('wallet_kicker')}</Text>
        <HStack spacing={4} align="baseline" flexWrap="wrap">
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '30px', md: '40px' }} letterSpacing="-0.02em" color={colors.text.primary}>
            {holder.holder?.handle || '...'}
          </Text>
          {holder.wallet && (
            <HStack spacing={2} px={3} py={1} borderRadius="full" border="1px solid" borderColor={colors.accent.chainAlpha[32]} bg={colors.accent.chainAlpha[8]}>
              <Box w="5px" h="5px" borderRadius="full" bg={colors.accent.chain} />
              <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{short(holder.wallet)}</Text>
            </HStack>
          )}
        </HStack>
      </VStack>

      <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={{ base: 4, md: 6 }}>
        <VStack align="start" spacing={1} p={4} borderRadius="16px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_holding')}</Text>
          <Text fontFamily={MONO} fontSize={{ base: '18px', md: '22px' }} fontWeight="600" color={colors.accent.money} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {whole(holder.balance)}
          </Text>
          <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>NEONBURRO{worth != null ? ` · ${t('wallet_worth')} ${compactUsd(worth)}` : ''}</Text>
        </VStack>
        <VStack align="start" spacing={1} p={4} borderRadius="16px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_sol')}</Text>
          <Text fontFamily={MONO} fontSize={{ base: '18px', md: '22px' }} fontWeight="600" color={colors.accent.money} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {holder.sol == null ? '...' : holder.sol.toFixed(3)}
          </Text>
          <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>SOL</Text>
        </VStack>
        <VStack align="start" spacing={1} p={4} borderRadius="16px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line} gridColumn={{ base: 'span 2', md: 'auto' }}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_price')}</Text>
          <HStack align="baseline" spacing={2}>
            <Text fontFamily={MONO} fontSize={{ base: '18px', md: '22px' }} fontWeight="600" color={colors.text.primary} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {price != null ? `$${price.toPrecision(3)}` : '...'}
            </Text>
            {change != null && Math.abs(change) < 100 && (
              <Text fontFamily={MONO} fontSize="11px" color={change >= 0 ? colors.accent.signal : colors.text.muted}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </Text>
            )}
          </HStack>
          <Box as="a" href="https://neonburro.com/token/neonburro/" target="_blank" rel="noopener noreferrer"
            fontFamily={MONO} fontSize="10px" color={colors.text.muted} _hover={{ color: colors.accent.signal }}>
            the full chart →
          </Box>
        </VStack>
      </Grid>

      {/* the buy desk, phase B's marked seat */}
      <Box p={5} borderRadius="16px" border="1px dashed" borderColor={colors.accent.signalAlpha[32]} bg={colors.accent.signalAlpha[8]}>
        <VStack align="start" spacing={1}>
          <Text fontFamily="heading" fontWeight="600" fontSize="16px" color={colors.text.primary}>{t('wallet_buy')}</Text>
          <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{t('wallet_buy_soon')}</Text>
        </VStack>
      </Box>

      {tape.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_tape')}</Text>
          <VStack align="stretch" spacing={0}>
            {tape.map((tr) => (
              <HStack key={tr.tx || tr.t} spacing={3} py={2} borderBottom="1px solid" borderColor="rgba(255,255,255,0.05)">
                <Box w="5px" h="5px" borderRadius="full" flexShrink={0} bg={tr.kind === 'buy' ? colors.accent.signal : colors.text.muted} />
                <Text fontFamily={MONO} fontSize="11px" w="40px" flexShrink={0} color={tr.kind === 'buy' ? colors.accent.signal : colors.text.secondary}>{tr.kind}</Text>
                <Text fontFamily={MONO} fontSize="11px" w="56px" flexShrink={0} color={colors.text.primary}>{compactUsd(tr.usd)}</Text>
                <Text fontFamily={MONO} fontSize="11px" flex="1" minW={0} color={colors.text.muted} isTruncated>{named[tr.wallet] || 'a holder'}</Text>
                <Text fontFamily={MONO} fontSize="11px" flexShrink={0} color={colors.text.muted}>{ago(tr.t, now)}</Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      )}

      <HStack spacing={2} pt={2}>
        <Box w="6px" h="6px" borderRadius="full" bg={colors.accent.signal} sx={{ '@keyframes wApp': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } }, animation: 'wApp 3s infinite' }} />
        <Text fontFamily={MONO} fontSize="11px" color={colors.text.muted}>{t('wallet_app')}</Text>
      </HStack>
    </VStack>
  );
};

export default Wallet;
