// src/pages/Transparency/index.jsx
// SENTINEL: NB_PHOSPHOR_TRANSPARENCY_V1
//
// The holder proof surface. Community wallet privacy stays in Wallet while
// this page shows only addresses the studio deliberately named as operating
// wallets. Chain balances and timestamped USD equivalents are one book.
// Reconciled service earnings are a separate off chain book.
//
// The seven day graph is drawn in this file with a small SVG instead of adding
// a chart dependency to the mobile shell. Missing history remains visible as a
// fitting state. It is never backfilled from invented points. Burro names carry
// their approved chest-up portraits with no copy laid over the image.
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import { useEffect, useMemo, useState } from 'react';
import { Box, Grid, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiExternalLink,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi';
import colors from '../../theme/colors';
import { EASE, RAIL } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { supabase } from '../../lib/supabase';

const ENDPOINT = '/.netlify/functions/transparency-feed';
const MONO = 'mono';

const kicker = {
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const AGENTS = [
  { slug: 'warbleur', job: 'release and direction' },
  { slug: 'cypher', job: 'systems and builds' },
  { slug: 'lyra', job: 'identity and signal' },
  { slug: 'volt', job: 'watch and exceptions' },
  { slug: 'ion', job: 'evidence and research' },
  { slug: 'aster', job: 'proof and growth' },
  { slug: 'skye', job: 'capture and media' },
  { slug: 'pixel', job: 'mobile and interface' },
  { slug: 'echo', job: 'settlement and close' },
  { slug: 'epoch', job: 'token record' },
  { slug: 'tender', job: 'receipts and settlement' },
];

const ROLE_LABELS = {
  origin: 'origin',
  reserve: 'reserve',
  'open-hand': 'open hand',
  lp: 'liquidity',
  'tender-phone': 'settlement phone',
  'tender-desk': 'settlement desk',
  furnace: 'thefurnace',
  build: 'build',
};

const METRICS = [
  { id: 'usd', label: 'USD estimate', color: colors.accent.money },
  { id: 'sol', label: 'SOL', color: colors.accent.chain },
  { id: 'neonburro', label: 'NEONBURRO', color: colors.accent.signal },
];

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compact = (value, digits = 2) => Number(value || 0).toLocaleString('en-US', {
  notation: Math.abs(Number(value || 0)) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: digits,
});

const usd = (value, precise = false) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'not priced';
  const amount = Number(value);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precise && amount < 1 ? 4 : 2,
    maximumFractionDigits: precise && amount < 1 ? 6 : 2,
  });
};

const microUsd = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'not recorded';
  return usd(Number(value) / 1_000_000, true);
};

const short = (address) => (address ? `${address.slice(0, 5)}...${address.slice(-5)}` : '');

const age = (value) => {
  if (!value) return 'not observed';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 90) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const Metric = ({ label, value, note, icon: iconComponent, chain = false }) => (
  <VStack align="start" spacing={1.5} p={{ base: 4, md: 5 }} minH="130px" border="1px solid" borderColor={colors.surface.line} borderRadius="18px" bg={colors.surface.raised}>
    <HStack justify="space-between" w="full">
      <Text {...kicker} color={colors.text.muted}>{label}</Text>
      <Icon as={iconComponent} boxSize="15px" color={chain ? colors.accent.chain : colors.accent.money} />
    </HStack>
    <Text fontFamily={MONO} fontWeight="600" fontSize={{ base: '21px', md: '26px' }} color={chain ? colors.accent.chain : colors.accent.money} sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Text>
    <Text fontFamily={MONO} fontSize="10px" lineHeight="1.5" color={colors.text.muted}>{note}</Text>
  </VStack>
);

const Trend = ({ rows, metric }) => {
  const values = rows
    .map((row) => ({ at: row.at, value: row[metric] === null ? null : number(row[metric]) }))
    .filter((row) => row.value !== null);
  const selected = METRICS.find((item) => item.id === metric) || METRICS[0];

  if (values.length < 2) {
    return (
      <VStack h="210px" justify="center" spacing={2} borderRadius="14px" bg={colors.surface.sunken}>
        <Icon as={FiClock} boxSize="18px" color={colors.text.muted} />
        <Text fontFamily={MONO} fontSize="11px" color={colors.text.muted}>the seven day line begins after two observations</Text>
      </VStack>
    );
  }

  const width = 720;
  const height = 210;
  const padX = 18;
  const padY = 22;
  const lowRaw = Math.min(...values.map((row) => row.value));
  const highRaw = Math.max(...values.map((row) => row.value));
  const spread = highRaw - lowRaw || Math.max(Math.abs(highRaw) * 0.02, 1);
  const low = lowRaw - spread * 0.08;
  const high = highRaw + spread * 0.08;
  const x = (index) => padX + (index / (values.length - 1)) * (width - padX * 2);
  const y = (value) => height - padY - ((value - low) / (high - low)) * (height - padY * 2);
  const points = values.map((row, index) => ({ x: x(index), y: y(row.value) }));
  const line = points.slice(1).reduce((path, point, index) => {
    const prior = points[index];
    const middle = (prior.x + point.x) / 2;
    return `${path} C ${middle} ${prior.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
  const area = `${line} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;
  const latest = values[values.length - 1].value;
  const first = values[0].value;
  const move = first ? ((latest - first) / first) * 100 : 0;
  const display = metric === 'usd' ? usd(latest) : `${compact(latest, metric === 'sol' ? 3 : 1)} ${selected.label}`;

  return (
    <Box position="relative" h="210px" borderRadius="14px" overflow="hidden" bg={colors.surface.sunken}>
      <HStack position="absolute" top={3} left={4} right={4} justify="space-between" zIndex={1} align="baseline">
        <Text fontFamily={MONO} fontSize="15px" fontWeight="600" color={selected.color}>{display}</Text>
        <Text fontFamily={MONO} fontSize="10px" color={move >= 0 ? colors.accent.money : colors.text.secondary}>
          {move >= 0 ? '+' : ''}{move.toFixed(2)}% over observed week
        </Text>
      </HStack>
      <Box as="svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" w="100%" h="100%" aria-label={`${selected.label} seven day line`}>
        <defs>
          <linearGradient id={`trend-${metric}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={selected.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={selected.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.3, 0.55, 0.8].map((part) => (
          <line key={part} x1={padX} x2={width - padX} y1={height * part} y2={height * part} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#trend-${metric})`} />
        <path d={line} fill="none" stroke={selected.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={selected.color} />
      </Box>
    </Box>
  );
};

const WalletCard = ({ wallet }) => (
  <VStack align="stretch" spacing={4} p={{ base: 4, md: 5 }} border="1px solid" borderColor={colors.surface.line} borderRadius="18px" bg={colors.surface.raised}>
    <HStack justify="space-between" align="start" spacing={4}>
      <VStack align="start" spacing={1} minW={0}>
        <Text fontFamily="heading" fontWeight="600" fontSize="17px" color={colors.text.primary}>
          {ROLE_LABELS[wallet.walletRoleSlug] || String(wallet.walletLabel || wallet.walletRoleSlug).toLowerCase()}
        </Text>
        <Box as="a" href={`https://solscan.io/account/${wallet.wallet}`} target="_blank" rel="noopener noreferrer" color={colors.accent.chain} _hover={{ color: colors.text.primary }}>
          <HStack spacing={1.5}>
            <Text fontFamily={MONO} fontSize="10px">{short(wallet.wallet)}</Text>
            <Icon as={FiExternalLink} boxSize="11px" />
          </HStack>
        </Box>
      </VStack>
      <VStack align="end" spacing={0}>
        <Text {...kicker} color={colors.text.muted}>on chain</Text>
        <Text fontFamily={MONO} fontSize="9px" color={colors.text.muted}>{age(wallet.observedAt)}</Text>
      </VStack>
    </HStack>

    <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={2}>
      {[
        ['SOL', compact(wallet.solBalance, 3)],
        ['NEON', compact(wallet.neonburroBalance, 1)],
        ['USDC', compact(wallet.usdcBalance, 2)],
      ].map(([label, value]) => (
        <Box key={label} p={3} borderRadius="12px" bg={colors.surface.sunken} minW={0}>
          <Text {...kicker} fontSize="8px" color={label === 'SOL' ? colors.accent.chain : colors.text.muted}>{label}</Text>
          <Text fontFamily={MONO} fontSize={{ base: '12px', md: '13px' }} fontWeight="600" color={colors.text.primary} mt={1} isTruncated sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Text>
        </Box>
      ))}
    </Grid>

    <HStack justify="space-between" pt={3} borderTop="1px solid" borderColor={colors.surface.line}>
      <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>current USD equivalent</Text>
      <Text fontFamily={MONO} fontSize="14px" fontWeight="600" color={colors.accent.money}>{usd(wallet.totalUsd)}</Text>
    </HStack>
  </VStack>
);

const EarningCard = ({ agent, earning, accountingReady }) => {
  const active = Boolean(earning?.active);
  const money = (value) => (accountingReady ? microUsd(value) : 'not recorded');
  return (
    <HStack align="stretch" spacing={0} minH="150px" border="1px solid" borderColor={colors.surface.line} borderRadius="18px" bg={colors.surface.raised} overflow="hidden">
      <Box w={{ base: '92px', sm: '112px' }} flexShrink={0} bg={colors.surface.sunken}>
        <Box as="img" src={`/burros/${agent.slug}.webp`} alt={`${agent.slug} portrait`} loading="lazy" decoding="async" w="100%" h="100%" minH="150px" objectFit="cover" objectPosition="center 20%" display="block" />
      </Box>
      <VStack align="stretch" spacing={3} p={{ base: 3.5, md: 4 }} flex="1" minW={0}>
        <HStack justify="space-between" align="start" spacing={3}>
          <Box minW={0}>
            <Text fontFamily="heading" fontSize="17px" fontWeight="600" color={colors.text.primary}>{agent.slug}.</Text>
            <Text fontFamily={MONO} fontSize="9px" color={colors.text.muted}>{agent.job}</Text>
          </Box>
          <VStack align="end" spacing={0}>
            <Text {...kicker} fontSize="8px" color={active ? colors.accent.signal : colors.text.muted}>{active ? 'rule live' : 'rule pending'}</Text>
            {active && <Text fontFamily={MONO} fontSize="9px" color={colors.text.muted}>{(number(earning.share_bps) / 100).toFixed(2)}% over {earning.accrual_hours}h</Text>}
          </VStack>
        </HStack>

        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
          <Box>
            <Text {...kicker} fontSize="8px" color={colors.text.muted}>confirmed work</Text>
            <Text fontFamily={MONO} fontSize="12px" color={colors.text.secondary}>{money(earning?.confirmed_revenue_usd_micros)}</Text>
          </Box>
          <Box>
            <Text {...kicker} fontSize="8px" color={colors.text.muted}>accrued</Text>
            <Text fontFamily={MONO} fontSize="12px" color={colors.accent.money}>{money(earning?.accrued_usd_micros)}</Text>
          </Box>
          <Box>
            <Text {...kicker} fontSize="8px" color={colors.text.muted}>proposed</Text>
            <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{money(earning?.proposed_usd_micros)}</Text>
          </Box>
          <Box>
            <Text {...kicker} fontSize="8px" color={colors.text.muted}>settled</Text>
            <Text fontFamily={MONO} fontSize="11px" color={colors.text.primary}>{money(earning?.settled_usd_micros)}</Text>
          </Box>
        </Grid>
      </VStack>
    </HStack>
  );
};

const Transparency = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState('usd');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: '{}',
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'the books did not answer');
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || 'the books did not answer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (holder.state === 'in') load();
  }, [holder.state]);

  const totals = useMemo(() => (data?.wallets || []).reduce((sum, wallet) => ({
    sol: sum.sol + number(wallet.solBalance),
    neonburro: sum.neonburro + number(wallet.neonburroBalance),
    usdc: sum.usdc + number(wallet.usdcBalance),
    usd: sum.usd + (wallet.totalUsd === null ? 0 : number(wallet.totalUsd)),
    priced: sum.priced && wallet.totalUsd !== null,
  }), {
    sol: 0, neonburro: 0, usdc: 0, usd: 0, priced: true,
  }), [data]);

  const earningsByAgent = useMemo(() => Object.fromEntries((data?.earnings || []).map((row) => [row.burro_slug, row])), [data]);
  const earned = (data?.earnings || []).reduce((sum, row) => sum + number(row.accrued_usd_micros), 0);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily={MONO} fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  return (
    <Box flex="1" overflowY="auto">
      <VStack align="stretch" spacing={{ base: 8, md: 11 }} w="full" maxW="1240px" px={{ base: 3, md: RAIL.md }} pt={{ base: 7, md: 12 }} pb={28}>
        <HStack justify="space-between" align="end" spacing={4}>
          <VStack align="start" spacing={2} maxW="720px">
            <HStack spacing={2}>
              <Box w="6px" h="6px" borderRadius="full" bg={colors.accent.signal} sx={{ '@keyframes proofPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.35 } }, animation: 'proofPulse 3s infinite', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
              <Text {...kicker} color={colors.accent.signal}>the public books</Text>
            </HStack>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '32px', md: '48px' }} lineHeight="1.02" letterSpacing="-0.04em" color={colors.text.primary}>
              what the wallets hold. what the work earned.
            </Text>
            <Text fontFamily={MONO} fontSize={{ base: '11px', md: '12px' }} lineHeight="1.75" color={colors.text.secondary}>
              studio wallets are public chain facts. service earnings are a reconciled USD ledger. one is not disguised as the other.
            </Text>
          </VStack>
          <Box as="button" type="button" onClick={load} disabled={loading} aria-label="refresh transparency" w="42px" h="42px" flexShrink={0} display="grid" placeItems="center" borderRadius="14px" border="1px solid" borderColor={colors.surface.lineStrong} color={colors.text.secondary} _hover={{ color: colors.accent.signal, borderColor: colors.accent.signalAlpha[32] }}>
            <Icon as={FiRefreshCw} boxSize="17px" sx={loading ? { animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } } : undefined} />
          </Box>
        </HStack>

        {error && (
          <Box px={4} py={3} borderLeft="2px solid" borderColor={colors.accent.signal} bg={colors.accent.signalAlpha[8]}>
            <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{error}</Text>
          </Box>
        )}

        {loading && !data ? (
          <HStack py={20} justify="center"><Spinner size="sm" color={colors.accent.signal} /></HStack>
        ) : (
          <>
            <Grid templateColumns={{ base: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' }} gap={3}>
              <Metric label="wallet value" value={totals.priced ? usd(totals.usd) : 'not priced'} note="timestamped estimate across named wallets" icon={FiActivity} />
              <Metric label="SOL held" value={compact(totals.sol, 3)} note="native balance on chain" icon={FiLayers} chain />
              <Metric label="NEONBURRO held" value={compact(totals.neonburro, 1)} note="named operating wallets only" icon={FiDatabase} chain />
              <Metric label="service share" value={data?.accountingReady ? microUsd(earned) : 'not recorded'} note="off chain accrued USD ledger" icon={FiCheckCircle} />
            </Grid>

            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align="end" flexWrap="wrap" rowGap={3}>
                <Box>
                  <Text {...kicker} color={colors.text.muted}>seven day observer</Text>
                  <Text fontFamily="heading" fontWeight="600" fontSize="22px" color={colors.text.primary} mt={1}>the operating field</Text>
                </Box>
                <HStack spacing={1.5} p={1} borderRadius="14px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line} overflowX="auto">
                  {METRICS.map((item) => (
                    <Box key={item.id} as="button" type="button" onClick={() => setMetric(item.id)} px={3} h="32px" borderRadius="10px" bg={metric === item.id ? colors.surface.lineStrong : 'transparent'} color={metric === item.id ? item.color : colors.text.muted} fontFamily={MONO} fontSize="9px" whiteSpace="nowrap" transition={`all 180ms ${EASE}`}>
                      {item.label}
                    </Box>
                  ))}
                </HStack>
              </HStack>
              <Trend rows={data?.history || []} metric={metric} />
              {!data?.historyReady && <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>{data?.notes?.history}</Text>}
            </VStack>

            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align="end">
                <Box>
                  <Text {...kicker} color={colors.accent.chain}>on chain</Text>
                  <Text fontFamily="heading" fontWeight="600" fontSize="22px" color={colors.text.primary} mt={1}>named operating wallets</Text>
                </Box>
                <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>{age(data?.observedAt)}</Text>
              </HStack>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={3}>
                {(data?.wallets || []).map((wallet) => <WalletCard key={wallet.wallet} wallet={wallet} />)}
              </Grid>
              {data?.notes?.chain && <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>{data.notes.chain}</Text>}
            </VStack>

            <VStack align="stretch" spacing={4}>
              <Box maxW="760px">
                <Text {...kicker} color={colors.accent.money}>USD ledger</Text>
                <Text fontFamily="heading" fontWeight="600" fontSize="22px" color={colors.text.primary} mt={1}>what each burro has earned</Text>
                <Text fontFamily={MONO} fontSize="11px" lineHeight="1.7" color={colors.text.secondary} mt={2}>
                  only confirmed service revenue enters. the ruled share accrues by the hour. proposed is not paid. settled means an external signature was confirmed.
                </Text>
              </Box>
              {!data?.accountingReady && (
                <Box px={4} py={3} borderRadius="14px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
                  <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>{data?.notes?.accounting}</Text>
                </Box>
              )}
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={3}>
                {AGENTS.map((agent) => <EarningCard key={agent.slug} agent={agent} earning={earningsByAgent[agent.slug]} accountingReady={Boolean(data?.accountingReady)} />)}
              </Grid>
            </VStack>

            <VStack align="stretch" spacing={3} p={{ base: 4, md: 5 }} borderRadius="18px" bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}>
              <HStack spacing={2}>
                <Icon as={FiClock} boxSize="15px" color={colors.accent.signal} />
                <Text {...kicker} color={colors.accent.signal}>the close</Text>
              </HStack>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(5, minmax(0, 1fr))' }} gap={2}>
                {[
                  ['1', 'service settles'],
                  ['2', 'share locks'],
                  ['3', 'hours accrue'],
                  ['4', 'payout proposed'],
                  ['5', 'hue•man signs'],
                ].map(([step, label]) => (
                  <HStack key={step} p={3} borderRadius="12px" bg={colors.surface.sunken} spacing={2.5}>
                    <Box w="22px" h="22px" borderRadius="8px" display="grid" placeItems="center" bg={colors.accent.signalAlpha[16]} color={colors.accent.signal} fontFamily={MONO} fontSize="10px" flexShrink={0}>{step}</Box>
                    <Text fontFamily={MONO} fontSize="10px" color={colors.text.secondary}>{label}</Text>
                  </HStack>
                ))}
              </Grid>
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default Transparency;
