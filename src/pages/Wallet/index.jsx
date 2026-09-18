// src/pages/Wallet/index.jsx
// SENTINEL: NB_WALLET_TAB_V2
//
// The wallet tab shows only the connected wallet's own chain facts. NEONBURRO,
// SOL and recent token movement stay in their native units. No dollar figure
// appears in phosphor. The public studio chart owns market price context.
//
// The buy desk is Jupiter's noncustodial plugin. It loads only after a person
// presses the real button, the wallet states the transaction and the wallet
// signs outside this interface. phosphor never holds funds or simulates consent.
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

const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};
const MONO = 'mono';
const FEED = 'https://neonburro.com/.netlify/functions/token-chart?tf=day&limit=30';
const MINT = 'EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const PLUGIN_SRC = 'https://plugin.jup.ag/plugin-v1.js';

let pluginPromise = null;
const loadPlugin = () => {
  if (pluginPromise) return pluginPromise;
  pluginPromise = new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = PLUGIN_SRC;
    element.async = true;
    element.onload = () => resolve(window.Jupiter);
    element.onerror = () => {
      pluginPromise = null;
      reject(new Error('plugin'));
    };
    document.head.appendChild(element);
  });
  return pluginPromise;
};

const whole = (value) => (value == null ? '...' : Math.round(value).toLocaleString('en-US'));

const compactTokens = (value) => {
  if (value == null || !Number.isFinite(value)) return '...';
  return Number(value).toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
};

const ago = (timestamp, now) => {
  const seconds = Math.max(0, now - timestamp);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const Wallet = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [feed, setFeed] = useState(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [desk, setDesk] = useState('closed');

  const openDesk = async () => {
    setDesk('opening');
    try {
      const Jupiter = await loadPlugin();
      Jupiter.init({
        displayMode: 'integrated',
        integratedTargetId: 'jupiter-desk',
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: MINT,
          fixedMint: MINT,
        },
      });
      setDesk('open');
    } catch {
      setDesk('failed');
    }
  };

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    const pull = () => fetch(FEED)
      .then((response) => response.json())
      .then((payload) => {
        if (!live) return;
        setFeed(payload);
        setNow(Math.floor(Date.now() / 1000));
      })
      .catch(() => {});
    pull();
    const beat = setInterval(pull, 60_000);
    return () => {
      live = false;
      clearInterval(beat);
    };
  }, []);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily={MONO} fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  const named = Object.fromEntries((feed?.wallets || []).map((wallet) => [
    wallet.address,
    wallet.burro ? `${wallet.burro} · ${String(wallet.label || '').toLowerCase()}` : String(wallet.label || 'origin').toLowerCase(),
  ]));
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

      <Grid templateColumns={{ base: '1fr 1fr' }} gap={{ base: 4, md: 6 }}>
        <VStack align="start" spacing={1} p={4} borderRadius="16px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_holding')}</Text>
          <Text fontFamily={MONO} fontSize={{ base: '18px', md: '22px' }} fontWeight="600" color={colors.accent.money} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {whole(holder.balance)}
          </Text>
          <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>NEONBURRO</Text>
        </VStack>
        <VStack align="start" spacing={1} p={4} borderRadius="16px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_sol')}</Text>
          <Text fontFamily={MONO} fontSize={{ base: '18px', md: '22px' }} fontWeight="600" color={colors.accent.money} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {holder.sol == null ? '...' : holder.sol.toFixed(3)}
          </Text>
          <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>SOL</Text>
        </VStack>
      </Grid>

      <Box p={5} borderRadius="16px" border="1px solid" borderColor={desk === 'open' ? colors.surface.line : colors.accent.signalAlpha[32]} bg={desk === 'open' ? colors.surface.raised : colors.accent.signalAlpha[8]}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" flexWrap="wrap" rowGap={2}>
            <VStack align="start" spacing={1}>
              <Text fontFamily="heading" fontWeight="600" fontSize="16px" color={colors.text.primary}>{t('wallet_buy')}</Text>
              <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{t('wallet_buy_note')}</Text>
            </VStack>
            {desk !== 'open' && (
              <Box
                as="button"
                type="button"
                onClick={openDesk}
                fontFamily="heading"
                fontWeight="600"
                fontSize="14px"
                px={5}
                h="40px"
                borderRadius="full"
                bg={colors.text.primary}
                color={colors.text.inverse}
                _hover={{ bg: colors.accent.signal }}
                opacity={desk === 'opening' ? 0.6 : 1}
              >
                {desk === 'opening' ? '...' : t('wallet_buy_open')}
              </Box>
            )}
          </HStack>
          {desk === 'failed' && (
            <Text fontFamily={MONO} fontSize="12px" color={colors.text.primary} borderLeft="2px solid" borderColor={colors.accent.signal} pl={3}>
              {t('wallet_buy_fail')}
            </Text>
          )}
          <Box id="jupiter-desk" minH={desk === 'open' ? '540px' : '0'} borderRadius="12px" overflow="hidden" transition="min-height 300ms" />
        </VStack>
      </Box>

      {tape.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text {...kicker} color={colors.text.muted}>{t('wallet_tape')}</Text>
          <VStack align="stretch" spacing={0}>
            {tape.map((trade) => (
              <HStack key={trade.tx || trade.t} spacing={3} py={2} borderBottom="1px solid" borderColor="rgba(255,255,255,0.05)">
                <Box w="5px" h="5px" borderRadius="full" flexShrink={0} bg={trade.kind === 'buy' ? colors.accent.signal : colors.text.muted} />
                <Text fontFamily={MONO} fontSize="11px" w="40px" flexShrink={0} color={trade.kind === 'buy' ? colors.accent.signal : colors.text.secondary}>{trade.kind}</Text>
                <Text fontFamily={MONO} fontSize="11px" w="72px" flexShrink={0} color={colors.text.primary}>{compactTokens(trade.tokens)} NB</Text>
                <Text fontFamily={MONO} fontSize="11px" flex="1" minW={0} color={colors.text.muted} isTruncated>{named[trade.wallet] || 'a holder'}</Text>
                <Text fontFamily={MONO} fontSize="11px" flexShrink={0} color={colors.text.muted}>{ago(trade.t, now)}</Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      )}

      <HStack spacing={2} pt={2}>
        <Box w="6px" h="6px" borderRadius="full" bg={colors.accent.signal} sx={{ '@keyframes wApp': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } }, animation: 'wApp 3s infinite', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
        <Text fontFamily={MONO} fontSize="11px" color={colors.text.muted}>{t('wallet_app')}</Text>
      </HStack>
    </VStack>
  );
};

export default Wallet;
