// src/pages/Burro/index.jsx
//
// The holder's permanent Burro record. The portrait is never covered by copy.
// Identity, public profile, service link and receipt counts live in separate
// surfaces so a person can see what is theirs and what is only activity.
// Losing access never sends the character back to a queue.
//
// Community wallets expose only the NEONBURRO balance and only when the owner
// chooses short or full wallet visibility. SOL, stablecoins, contact channels
// and private conversation stay out of the directory.
//
// No Oxford commas, no em dashes.

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  HStack,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { FiCopy, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import colors from '../../theme/colors';
import { RAIL } from '../../theme/layout';
import { holderHome } from '../../lib/holderHome';
import { useHolder } from '../../lib/holder';

const CORNER = '20px 20px 5px 20px';
const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const asset = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `https://neonburro.com${path.startsWith('/') ? path : `/${path}`}`;
};

const count = (value) => Number(value || 0).toLocaleString('en-US');
const holding = (value) => Math.round(Number(value || 0)).toLocaleString('en-US');

const Stat = ({ label, value, tone = 'plain' }) => (
  <VStack align="start" spacing={1} p={4} border="1px solid" borderColor={colors.surface.line} borderRadius={CORNER} bg={colors.surface.raised} minW={0}>
    <Text {...kicker} color={colors.text.muted}>{label}</Text>
    <Text fontFamily="mono" fontSize={{ base: '19px', md: '22px' }} fontWeight="600" color={tone === 'money' ? colors.accent.money : colors.text.primary} sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Text>
  </VStack>
);

const PendingPortrait = () => (
  <Box minH={{ base: '340px', md: '520px' }} display="grid" placeItems="center" bg="radial-gradient(circle at 52% 36%, rgba(197,217,87,0.12), transparent 34%), #111113" borderRadius={CORNER} border="1px solid" borderColor={colors.surface.line}>
    <VStack spacing={4} maxW="300px" textAlign="center" px={6}>
      <Box w="86px" h="86px" borderRadius="26px 26px 7px 26px" border="1px solid" borderColor={colors.accent.signalAlpha[32]} bg={colors.accent.signalAlpha[8]} position="relative">
        <Box position="absolute" inset="24px" borderRadius="full" bg={colors.accent.signal} opacity={0.75} />
      </Box>
      <Text fontFamily="heading" fontWeight="600" fontSize="22px" color={colors.text.primary}>Your place is recorded.</Text>
      <Text fontFamily="mono" fontSize="12px" lineHeight="1.7" color={colors.text.secondary}>An approved name and portrait will land here when the next holder set clears review.</Text>
    </VStack>
  </Box>
);

const DirectoryCard = ({ member }) => (
  <VStack align="stretch" spacing={0} border="1px solid" borderColor={colors.surface.line} borderRadius={CORNER} overflow="hidden" bg={colors.surface.raised}>
    <Box aspectRatio="1 / 1" overflow="hidden" bg={colors.surface.sunken}>
      <Box as="img" src={asset(member.avatarPath)} alt={`${member.name}, a holder Burro`} loading="lazy" decoding="async" w="100%" h="100%" objectFit="cover" objectPosition="center top" />
    </Box>
    <VStack align="start" spacing={2} p={4}>
      <Text fontFamily="heading" fontWeight="600" fontSize="18px" color={colors.text.primary}>{member.name}</Text>
      <Text fontFamily="mono" fontSize="11px" lineHeight="1.65" color={colors.text.secondary}>{member.purpose}</Text>
      {member.wallet && (
        <Text fontFamily="mono" fontSize="10px" color={colors.accent.chain}>{member.wallet}</Text>
      )}
      {member.neonburroBalance != null && (
        <Text fontFamily="mono" fontSize="10px" color={colors.accent.money}>{holding(member.neonburroBalance)} NEONBURRO</Text>
      )}
    </VStack>
  </VStack>
);

const Burro = () => {
  const holder = useHolder();
  const [home, setHome] = useState(null);
  const [state, setState] = useState('loading');
  const [copyState, setCopyState] = useState('copy');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    biography: '',
    purpose: '',
    published: false,
    walletVisibility: 'hidden',
    referralActivityVisible: false,
  });

  const load = async () => {
    setState('loading');
    const result = await holderHome('ensure');
    if (!result.ok) {
      setState(result.reason || 'quiet');
      return;
    }
    setHome(result.home);
    const profile = result.home.profile || {};
    setForm({
      biography: profile.biography || '',
      purpose: profile.purpose || '',
      published: Boolean(profile.published),
      walletVisibility: profile.wallet_visibility || 'hidden',
      referralActivityVisible: Boolean(profile.referral_activity_visible),
    });
    setState('ready');
    if (!holder.holder?.handle && result.home.character?.approved_name) holder.refresh();
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    const result = await holderHome('profile', { profile: form });
    setSaving(false);
    if (!result.ok) {
      setState(result.reason || 'quiet');
      return;
    }
    setHome(result.home);
    setState('ready');
  };

  const shareUrl = home?.referral?.link?.url || null;
  const share = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('copy'), 1800);
    } catch {
      setCopyState('select the link');
    }
  };

  const summary = home?.referral?.summary || {};
  const character = home?.character;
  const profilePreview = useMemo(() => ({
    biography: form.biography || character?.biography_seed || 'Your biography can begin here.',
    purpose: form.purpose || character?.purpose_archetype || 'Your Burro is waiting for its first approved purpose.',
  }), [form.biography, form.purpose, character]);

  if (state !== 'ready') {
    return (
      <VStack flex="1" justify="center" spacing={4} px={RAIL} textAlign="center">
        <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>
          {state === 'fitting' ? 'the permanent character tables are ready for review but not applied yet.' : state === 'loading' ? 'opening your record...' : 'your record could not be read. nothing changed.'}
        </Text>
        {state !== 'loading' && <Button leftIcon={<FiRefreshCw />} onClick={load}>Try again</Button>}
      </VStack>
    );
  }

  return (
    <Box flex="1" overflowY="auto">
      <VStack align="stretch" spacing={{ base: 9, md: 12 }} px={RAIL} pt={{ base: 8, md: 12 }} pb={28} maxW="1240px">
        <VStack align="start" spacing={3} maxW="760px">
          <Text {...kicker} color={colors.accent.signal}>your burro</Text>
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '34px', md: '52px' }} lineHeight="1" letterSpacing="-0.045em" color={colors.text.primary}>
            {character?.approved_name || 'portrait pending'}
          </Text>
          <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>
            One wallet. One permanent identity. Access can sleep if the holding falls below the line. This history is never handed to somebody else.
          </Text>
        </VStack>

        <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1.08fr) minmax(340px, 0.92fr)' }} gap={5} alignItems="start">
          {character ? (
            <Box minH={{ base: '420px', md: '620px' }} borderRadius={CORNER} overflow="hidden" border="1px solid" borderColor={colors.surface.line} bg={colors.surface.sunken}>
              <Box as="img" src={asset(character.portrait_path)} alt={`${character.approved_name}, your Neon Burro`} w="100%" h="100%" minH={{ base: '420px', md: '620px' }} objectFit="cover" objectPosition="center top" />
            </Box>
          ) : <PendingPortrait />}

          <VStack align="stretch" spacing={4}>
            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
              <Stat label="NEONBURRO" value={holding(home.holder.balance)} tone="money" />
              <Stat label="verified referrals" value={count(summary.confirmed_purchase_count)} />
              <Stat label="link opens" value={count(summary.traffic_count)} />
              <Stat label="orders attached" value={count(summary.attached_order_count)} />
            </Grid>

            <VStack align="stretch" spacing={4} p={{ base: 4, md: 5 }} border="1px solid" borderColor={colors.surface.line} borderRadius={CORNER} bg={colors.surface.raised}>
              <VStack align="start" spacing={1}>
                <Text {...kicker} color={colors.text.muted}>public profile</Text>
                <Text fontFamily="heading" fontWeight="600" fontSize="20px" color={colors.text.primary}>{profilePreview.purpose}</Text>
                <Text fontFamily="mono" fontSize="11px" lineHeight="1.7" color={colors.text.secondary}>{profilePreview.biography}</Text>
              </VStack>
              <Box>
                <Text {...kicker} color={colors.text.muted} mb={2}>purpose</Text>
                <Textarea value={form.purpose} onChange={(event) => setForm((value) => ({ ...value, purpose: event.target.value }))} maxLength={600} resize="vertical" minH="84px" placeholder="What should this Burro learn to help with?" />
              </Box>
              <Box>
                <Text {...kicker} color={colors.text.muted} mb={2}>short biography</Text>
                <Textarea value={form.biography} onChange={(event) => setForm((value) => ({ ...value, biography: event.target.value }))} maxLength={1200} resize="vertical" minH="110px" placeholder="A useful, public description." />
              </Box>
              <HStack justify="space-between" spacing={4}>
                <VStack align="start" spacing={0}>
                  <Text fontFamily="heading" fontWeight="600" fontSize="14px" color={colors.text.primary}>Join the holder directory</Text>
                  <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>Off by default. Contact details never publish.</Text>
                </VStack>
                <Switch isChecked={form.published} onChange={(event) => setForm((value) => ({ ...value, published: event.target.checked }))} colorScheme="lime" />
              </HStack>
              <HStack justify="space-between" spacing={4}>
                <VStack align="start" spacing={0}>
                  <Text fontFamily="heading" fontWeight="600" fontSize="14px" color={colors.text.primary}>Show referral activity</Text>
                  <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>Counts only. Buyer identity and amounts stay private.</Text>
                </VStack>
                <Switch isChecked={form.referralActivityVisible} onChange={(event) => setForm((value) => ({ ...value, referralActivityVisible: event.target.checked }))} colorScheme="lime" />
              </HStack>
              <HStack spacing={2} flexWrap="wrap">
                {['hidden', 'short', 'full'].map((choice) => (
                  <Box key={choice} as="button" type="button" onClick={() => setForm((value) => ({ ...value, walletVisibility: choice }))} px={3} h="34px" borderRadius="11px 11px 3px 11px" border="1px solid" borderColor={form.walletVisibility === choice ? colors.accent.chainAlpha[32] : colors.surface.line} bg={form.walletVisibility === choice ? colors.accent.chainAlpha[8] : 'transparent'} fontFamily="mono" fontSize="10px" color={form.walletVisibility === choice ? colors.accent.chain : colors.text.secondary}>
                    wallet {choice}
                  </Box>
                ))}
              </HStack>
              <Button onClick={save} isLoading={saving} alignSelf="flex-start">Save profile</Button>
            </VStack>
          </VStack>
        </Grid>

        <VStack align="stretch" spacing={4}>
          <VStack align="start" spacing={2} maxW="720px">
            <Text {...kicker} color={colors.accent.signal}>your first working link</Text>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '26px', md: '34px' }} letterSpacing="-0.03em" color={colors.text.primary}>Share useful work. Keep the proof separate.</Text>
            <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>A page open is interest. An attached order is intent. Only a live payment verified by Stripe becomes a confirmed purchase. None of these counts is money owed to you yet.</Text>
          </VStack>
          {shareUrl && (
            <HStack p={4} border="1px solid" borderColor={colors.surface.line} borderRadius={CORNER} bg={colors.surface.raised} spacing={3} align="center">
              <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary} flex="1" minW={0} isTruncated>{shareUrl}</Text>
              <Box as="button" type="button" onClick={share} aria-label="Copy service link" w="44px" h="44px" display="grid" placeItems="center" borderRadius="14px 14px 4px 14px" border="1px solid" borderColor={colors.surface.lineStrong} color={colors.text.primary} _hover={{ borderColor: colors.accent.signal }}>
                <FiCopy size={17} />
              </Box>
              <Box as="a" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Open service link" w="44px" h="44px" display="grid" placeItems="center" borderRadius="14px 14px 4px 14px" bg={colors.text.primary} color={colors.text.inverse} _hover={{ bg: colors.accent.signal }}>
                <FiExternalLink size={17} />
              </Box>
              <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>{copyState}</Text>
            </HStack>
          )}
        </VStack>

        <VStack align="stretch" spacing={4}>
          <VStack align="start" spacing={2} maxW="700px">
            <Text {...kicker} color={colors.text.muted}>holder directory</Text>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '26px', md: '34px' }} letterSpacing="-0.03em" color={colors.text.primary}>Burros who chose to be seen.</Text>
          </VStack>
          {home.directory?.length ? (
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }} gap={4}>
              {home.directory.map((member) => <DirectoryCard key={member.assignmentId} member={member} />)}
            </Grid>
          ) : (
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted} borderLeft="2px solid" borderColor={colors.accent.signal} pl={3}>Nobody has published a holder Burro yet. The first one should feel like opening a door.</Text>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default Burro;
