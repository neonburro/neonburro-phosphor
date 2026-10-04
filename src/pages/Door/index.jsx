// src/pages/Door/index.jsx
//
// The door. One sentence, one button and one line for the walletless. The
// whole page is the consent moment, so it says exactly what happens and no
// more. An eligible returning holder goes to /burro/. A first entry goes to
// /hello/. A phone may approve a walletless desktop through a narrow handoff.
//
// The handoff keeps two values apart. The QR contains a public nonce that the
// phone approves. A 256-bit claim secret stays only in this desktop tab and is
// sent with each claim poll. It never enters the QR, URL, DOM or web storage.
// One timeout follows the next so slow requests never overlap. Closing this
// page clears the in-memory secret and stops polling.
//
// The remember choice is written immediately before sign in. Purple appears
// once on the wallet address chip because that is the chain talking.
//
// No Oxford commas, no em dashes.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { WALLET_LINK } from '../../data/links';
import { t } from '../../data/copy';
import { check, knownHandle, tokens } from '../../lib/holder';
import { remembered, setRemembered, supabase } from '../../lib/supabase';
import { addressOf, detect, detectAll, seen, short, signIn, signOut } from '../../lib/wallet';
import colors from '../../theme/colors';
import { EASE, MEASURE, RAIL } from '../../theme/layout';

const EPOCH_FACE = '/epoch-avatar.webp';
const HANDOFF_ENDPOINT = '/.netlify/functions/handoff';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLAIM_SECRET = /^[A-Za-z0-9_-]{43}$/;

// This is a visual mixup check, not a credential. The contract test keeps the
// identical derivation on the phone approval screen.
const handoffCode = (nonce) => String(nonce || '').replaceAll('-', '').slice(-4).toUpperCase();

// A signed out phone carries its public approval route through the door in the
// current URL only. Accept one UUID query on the exact local /approve/ route.
// External origins, credentials, fragments and extra parameters are rejected.
const safeApproveReturn = () => {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('return');
  if (!raw) return null;
  try {
    const candidate = new URL(raw, window.location.origin);
    const entries = [...candidate.searchParams.entries()];
    const nonce = candidate.searchParams.get('n');
    if (candidate.origin !== window.location.origin) return null;
    if (candidate.pathname !== '/approve/' || candidate.hash) return null;
    if (candidate.username || candidate.password) return null;
    if (entries.length !== 1 || entries[0][0] !== 'n') return null;
    if (!UUID.test(String(nonce || ''))) return null;
    return `/approve/?n=${encodeURIComponent(nonce.toLowerCase())}`;
  } catch {
    return null;
  }
};

// Deep links are built when tapped rather than when the module loads. A
// single page app can import this screen from another route first.
const here = () => (typeof window !== 'undefined' ? window.location.href : 'https://phosphor.neonburro.com/');

// A phone browser has no extension and cannot scan its own screen. Wallet app
// links are the phone answer. The QR remains a desktop-only mechanic.
const onPhone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 820;
};

const PHANTOM_LINK = () => `https://phantom.app/ul/browse/${encodeURIComponent(here())}?ref=${encodeURIComponent(here())}`;
const SOLFLARE_LINK = () => `https://solflare.com/ul/v1/browse/${encodeURIComponent(here())}?ref=${encodeURIComponent(here())}`;
const TRUST_LINK = () => `https://link.trustwallet.com/open_url?coin_id=501&url=${encodeURIComponent(here())}`;
const COINBASE_LINK = () => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here())}`;

// ── A WALLET THAT NEVER ANSWERS MUST NOT HOLD THE DOOR ──────────────────
//
// Tyler, 2026-10-02. Tapped jupiter, signed, came back to three dots that never
// stopped. `await signIn()` had no ceiling on it, so the button sat on its
// loading text forever, offering no way out and no reason why.
//
// Two separate things go wrong here and each needs its own answer. A wallet can
// simply never settle its promise, which the timeout below ends. And a mobile
// wallet can open phosphor inside ITS OWN browser, take the signature there and
// leave this tab holding a promise that can never resolve, because the session
// landed in a different browser entirely. No timeout fixes that one. The tab
// has to look again when it returns to the front, which is what resumeRef and
// the visibility effect in the component do.
//
// Ninety seconds is long enough to read a signature prompt carefully and short
// enough that nobody sits there wondering whether the page is broken.
const SIGN_TIMEOUT_MS = 90000;

const withTimeout = (promise, ms, message) => {
  let timer = null;
  const ceiling = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, ceiling]).finally(() => { if (timer) clearTimeout(timer); });
};

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Door = () => {
  const nav = useNavigate();
  const [phase, setPhase] = useState('resting');
  const [remember, setRemember] = useState(remembered());
  const [line, setLine] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  const [addr, setAddr] = useState(null);
  const handoff = useRef(null);
  const handoffRun = useRef(0);
  const qrPoll = useRef(null);

  const enter = (result) => {
    const returnPath = safeApproveReturn();
    nav(returnPath || (result.holder?.handle ? '/burro/' : '/hello/'), { replace: Boolean(returnPath) });
  };

  // A session with no web3 identity cannot ever satisfy the gate, so the only
  // honest thing is to end it and say so. Leaving it in place is what put a
  // saved wallet and a permanent "the door is quiet" on the same screen.
  const clearStale = async (detail) => {
    await signOut();
    setAddr(null);
    // Naming the providers the session actually carried turns a dead end into
    // something a person can report. It is provider names only.
    const seen = detail?.providers && detail.providers !== 'none' ? ` seen: ${detail.providers}.` : '';
    setLine(`${t('door_stale')}${seen}`);
    setPhase('resting');
  };

  const stopHandoff = (hide = true) => {
    handoffRun.current += 1;
    if (qrPoll.current) clearTimeout(qrPoll.current);
    qrPoll.current = null;
    handoff.current = null;
    if (hide) setQr(null);
  };

  const finishSession = async (tokenHash) => {
    stopHandoff();
    if (!supabase) {
      setLine(t('door_quiet'));
      setPhase('quiet');
      return;
    }
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
    if (error) {
      setLine(t('door_quiet'));
      setPhase('quiet');
      return;
    }
    setPhase('checking');
    const result = await check();
    if (result.state === 'in') {
      enter(result);
      return;
    }
    if (result.state === 'under') {
      setLine(t('door_under', { balance: tokens(result.balance) || '0', threshold: tokens(result.threshold) || 'enough' }));
      setPhase('under');
      return;
    }
    setLine(result.error ? String(result.error).toLowerCase() : t('door_quiet'));
    setPhase('quiet');
  };

  const pollHandoff = async (run) => {
    const pending = handoff.current;
    if (!pending || pending.run !== run || handoffRun.current !== run) return;
    if (pending.expiresAt <= Date.now()) {
      stopHandoff();
      setLine(t('door_quiet'));
      setPhase('quiet');
      return;
    }
    try {
      const response = await fetch(HANDOFF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', nonce: pending.nonce, claim_secret: pending.claimSecret }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
      const result = await response.json();
      if (handoffRun.current !== run) return;
      if (response.ok && result.token_hash) {
        await finishSession(result.token_hash);
        return;
      }
      if (response.status === 202 && result.waiting) {
        qrPoll.current = setTimeout(() => pollHandoff(run), 3000);
        return;
      }
      if (response.status >= 500 && result.reason !== 'restart') {
        qrPoll.current = setTimeout(() => pollHandoff(run), 5000);
        return;
      }
      stopHandoff();
      setLine(t('door_quiet'));
      setPhase('quiet');
    } catch {
      if (handoffRun.current === run) qrPoll.current = setTimeout(() => pollHandoff(run), 5000);
    }
  };

  const startHandoff = async () => {
    stopHandoff();
    const run = handoffRun.current;
    try {
      const response = await fetch(HANDOFF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
      const result = await response.json();
      if (handoffRun.current !== run) return;
      const valid = response.ok && result.ok && UUID.test(String(result.nonce || '')) && CLAIM_SECRET.test(String(result.claim_secret || ''));
      if (!valid) {
        setLine(t('door_quiet'));
        setPhase('quiet');
        return;
      }
      const approvalUrl = new URL('/approve/', window.location.origin);
      approvalUrl.searchParams.set('n', result.nonce);
      const dataUrl = await QRCode.toDataURL(approvalUrl.toString(), {
        margin: 1,
        width: 220,
        color: { dark: '#F4F3F1', light: '#0B0B0C00' },
      });
      if (handoffRun.current !== run) return;
      const parsedExpiry = Date.parse(result.expires_at);
      const expiresAt = Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 10 * 60 * 1000;
      handoff.current = { run, nonce: result.nonce, claimSecret: result.claim_secret, expiresAt };
      setQr({ img: dataUrl, code: handoffCode(result.nonce) });
      qrPoll.current = setTimeout(() => pollHandoff(run), 1500);
    } catch {
      if (handoffRun.current !== run) return;
      setLine(t('door_quiet'));
      setPhase('quiet');
    }
  };

  useEffect(() => () => {
    handoffRun.current += 1;
    if (qrPoll.current) clearTimeout(qrPoll.current);
    handoff.current = null;
  }, []);

  // A live session skips a new wallet signature. Its chain balance is still
  // checked before the route opens.
  //
  // This runs on mount AND every time the tab comes back to the front. The
  // second path is the whole repair for the jupiter hang. A mobile wallet
  // opens phosphor in its own browser and the session lands in storage rather
  // than in the promise this tab is holding, so the only way this tab ever
  // learns is by looking again when the visitor returns to it. Guarded three
  // ways, because focus fires often. Nothing runs without a session, nothing
  // runs on top of itself, and nothing runs once the door has already settled
  // into a state the visitor is reading.
  const mounted = useRef(true);
  const resuming = useRef(false);
  const resumeRef = useRef(null);

  resumeRef.current = async () => {
    if (!supabase || resuming.current || !mounted.current) return;
    if (phase !== 'resting' && phase !== 'signing' && phase !== 'nowallet') return;
    resuming.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session || !mounted.current) return;
      stopHandoff();
      setAddr(addressOf(data.session.user));
      setPhase('checking');
      const result = await check();
      if (!mounted.current) return;
      if (result.state === 'in') {
        enter(result);
        return;
      }
      if (result.state === 'under') {
        setLine(t('door_under', { balance: tokens(result.balance) || '0', threshold: tokens(result.threshold) || 'enough' }));
        setPhase('under');
        return;
      }
      if (result.state === 'stale') {
        await clearStale(result.detail);
        return;
      }
      if (result.state === 'quiet') {
        setLine(result.error ? String(result.error).toLowerCase() : t('door_quiet'));
        setPhase('quiet');
        return;
      }
      setPhase('resting');
    } finally {
      resuming.current = false;
    }
  };

  useEffect(() => {
    mounted.current = true;
    resumeRef.current?.();
    const look = () => {
      if (document.visibilityState !== 'visible') return;
      resumeRef.current?.();
    };
    document.addEventListener('visibilitychange', look);
    window.addEventListener('focus', look);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', look);
      window.removeEventListener('focus', look);
    };
  }, []);

  const go = async (choice) => {
    setRemembered(remember);
    const { data: existing } = supabase ? await supabase.auth.getSession() : { data: null };
    if (!existing?.session && !choice && !detect()) {
      setLine(t('door_not_found'));
      setPhase('nowallet');
      if (!onPhone()) startHandoff();
      return;
    }
    setPhase('signing');
    try {
      const session = existing?.session
        || await withTimeout(signIn(choice), SIGN_TIMEOUT_MS, 'the wallet did not answer');
      setAddr(addressOf(session?.user));
      setPhase('checking');
      const result = await check();
      if (result.state === 'in') {
        enter(result);
        return;
      }
      if (result.state === 'under') {
        setLine(t('door_under', { balance: tokens(result.balance) || '0', threshold: tokens(result.threshold) || 'enough' }));
        setPhase('under');
        return;
      }
      if (result.state === 'stale') {
        await clearStale(result.detail);
        return;
      }
      setLine(result.error ? String(result.error).toLowerCase() : t('door_quiet'));
      setPhase('quiet');
    } catch (error) {
      if (error.message === 'no wallet') {
        setPhase('nowallet');
        return;
      }
      if (error.message === 'the wallet did not answer') {
        setLine(t('door_timeout'));
        setPhase('resting');
        return;
      }
      setLine(error.message && error.message !== 'the wallet did not sign' ? error.message.toLowerCase() : t('door_quiet'));
      setPhase('quiet');
    }
  };

  return (
    <VStack flex="1" justify="center" align="stretch" px={RAIL} spacing={0} pb={24} position="relative">
      <Box position="absolute" inset={0} pointerEvents="none" aria-hidden="true"
        bgImage="url('/holders-in-glasses.webp')"
        bgSize="cover" bgPosition="center 30%" opacity={0.06}
        filter="grayscale(0.4)" />
      <Box position="absolute" inset={0} pointerEvents="none" aria-hidden="true"
        bgGradient={`linear(to-r, ${colors.surface.base} 0%, rgba(11,11,12,0.55) 55%, rgba(11,11,12,0.2) 100%)`} />
      <VStack align="start" spacing={6} maxW={MEASURE} w="100%" position="relative" zIndex={1}>
        <Text {...kicker} color={colors.accent.signal}>{t('door_kicker')}</Text>
        <HStack spacing={{ base: 4, md: 5 }} align="center">
          <Box position="relative" role="group" flexShrink={0}>
            <Box
              as="img"
              src={EPOCH_FACE}
              alt="epoch, keeper of the record"
              w={{ base: '56px', md: '88px' }}
              h={{ base: '56px', md: '88px' }}
              borderRadius="20px"
              objectFit="cover"
              bg={colors.surface.raised}
              border="1px solid"
              borderColor={colors.surface.line}
              transition={`border-color 300ms ${EASE}`}
              _groupHover={{ borderColor: `${colors.accent.signal}66` }}
            />
            <Text position="absolute" top="calc(100% + 8px)" left={0} whiteSpace="nowrap"
              fontFamily="mono" fontSize="11px" letterSpacing="0.04em" color={colors.accent.signal}
              opacity={0} transform="translateY(4px)" pointerEvents="none" aria-hidden="true"
              transition={`opacity 400ms ${EASE} 100ms, transform 400ms ${EASE} 100ms`}
              sx={{ '@media (hover: hover)': { '[role="group"]:hover &': { opacity: 0.95, transform: 'translateY(0)' } } }}>
              "value moves. history remains."
            </Text>
          </Box>
          <Text fontFamily="heading" fontWeight="600" letterSpacing="-0.02em" fontSize={{ base: '32px', md: '48px' }} lineHeight="1.05" color={colors.text.primary}>
            {t('door_title')}
          </Text>
        </HStack>
        <Text fontFamily="body" fontSize={{ base: '15px', md: '16px' }} lineHeight="1.7" color={colors.text.secondary}>
          {t('door_line')}
        </Text>

        {(phase === 'under' || phase === 'quiet' || phase === 'nowallet') && (
          <Text fontFamily="mono" fontSize="13px" lineHeight="1.7" color={colors.text.primary} borderLeft="2px solid" borderColor={colors.accent.signal} pl={4}>
            {line}
          </Text>
        )}

        {addr && phase !== 'resting' && (
          <HStack spacing={2} px={3} py={1.5} borderRadius="full" border="1px solid" borderColor={colors.accent.chainAlpha[32]} bg={colors.accent.chainAlpha[8]}>
            <Box w="5px" h="5px" borderRadius="full" bg={colors.accent.chain}
              sx={{
                '@media (prefers-reduced-motion: no-preference)': {
                  '@keyframes doorBreath': { '0%, 100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.45)', opacity: 0.75 } },
                  animation: 'doorBreath 3.2s ease-in-out infinite',
                },
              }} />
            <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary}>{short(addr)}</Text>
          </HStack>
        )}

        <VStack align="start" spacing={4} pt={2}>
          {!knownHandle() && detectAll().length > 1 ? (
            <VStack align="start" spacing={3}>
              <Text {...kicker} color={colors.text.muted}>connect with</Text>
              <HStack spacing={3} flexWrap="wrap" rowGap={3}>
                {detectAll().map((choice) => (
                  <Button key={choice.name} size="lg" onClick={() => go(choice)}
                    isLoading={phase === 'signing' || phase === 'checking'}
                    loadingText={phase === 'signing' ? '...' : t('door_signed')}>
                    {choice.name}
                  </Button>
                ))}
              </HStack>
            </VStack>
          ) : (
            <Button size="lg" onClick={() => go()} isLoading={phase === 'signing' || phase === 'checking'} loadingText={phase === 'signing' ? '...' : t('door_signed')}>
              {knownHandle() ? t('door_button_back', { handle: knownHandle() }) : t('door_button')}
            </Button>
          )}
          {!onPhone() && (
            <Box as="button" type="button" onClick={startHandoff}
              fontFamily="mono" fontSize="12px" color={colors.text.muted} textAlign="left"
              _hover={{ color: colors.accent.signal }}>
              {t('door_use_phone')}
            </Box>
          )}
          <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}
            sx={{ '.chakra-checkbox__control': { borderColor: colors.surface.lineStrong, _checked: { bg: colors.accent.signal, borderColor: colors.accent.signal, color: colors.text.inverse } } }}>
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>{t('door_remember')}</Text>
          </Checkbox>
        </VStack>

        <HStack spacing={3} pt={4} borderTop="1px solid" borderColor={colors.surface.line} w="100%" flexWrap="wrap" rowGap={2}>
          <Text fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'}
            color={onPhone() ? colors.text.primary : colors.text.muted} w={onPhone() ? '100%' : 'auto'}>
            {phase === 'nowallet' ? t('door_not_found') : t('door_no_wallet')}
          </Text>
          {phase === 'nowallet' && (
            <>
              <Box as="a" href={PHANTOM_LINK()} fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'} color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full"
                px={onPhone() ? 5 : 3} py={onPhone() ? 2.5 : 1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_phantom')}
              </Box>
              <Box as="a" href={SOLFLARE_LINK()} fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'} color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full"
                px={onPhone() ? 5 : 3} py={onPhone() ? 2.5 : 1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_solflare')}
              </Box>
              <Box as="a" href={TRUST_LINK()} fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'} color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full"
                px={onPhone() ? 5 : 3} py={onPhone() ? 2.5 : 1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_trust')}
              </Box>
              <Box as="a" href={COINBASE_LINK()} fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'} color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full"
                px={onPhone() ? 5 : 3} py={onPhone() ? 2.5 : 1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_coinbase')}
              </Box>
              <Box as="button" type="button"
                onClick={() => { try { navigator.clipboard.writeText('https://phosphor.neonburro.com'); setCopied(true); } catch { /* clipboard denied */ } }}
                fontFamily="mono" fontSize="12px" color={copied ? colors.text.primary : colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full" px={3} py={1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {copied ? t('door_jupiter_done') : t('door_jupiter')}
              </Box>
            </>
          )}
          {WALLET_LINK ? (
            <Box as="a" href={WALLET_LINK} target="_blank" rel="noopener noreferrer"
              fontFamily="mono" fontSize="12px" color={colors.accent.signal}
              borderBottom="1px solid" borderColor="transparent"
              transition={`border-color 220ms ${EASE}`}
              _hover={{ borderColor: colors.accent.signal }}>
              {t('door_get_one')}
            </Box>
          ) : (
            <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>{t('door_get_one_plain')}</Text>
          )}
        </HStack>

        {qr && !onPhone() && (
          <VStack align="start" spacing={3} pt={4} borderTop="1px solid" borderColor={colors.surface.line} w="100%">
            <Text fontFamily="mono" fontSize="12px" color={colors.text.primary}>{t('door_phone')}</Text>
            <Text fontFamily="mono" fontSize="11px" color={colors.text.muted} maxW="360px">{t('door_phone_line')}</Text>
            <Box p={3} bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line} borderRadius="16px">
              <Box as="img" src={qr.img} alt="scan with your signed in phone" w="180px" h="180px" display="block" />
            </Box>
            <HStack spacing={3} aria-label={`match code ${qr.code}`}>
              <Text fontFamily="mono" fontSize="11px" color={colors.text.muted}>match the phone</Text>
              <Text fontFamily="mono" fontSize="14px" fontWeight="600" letterSpacing="0.18em" color={colors.text.primary}
                border="1px solid" borderColor={colors.surface.lineStrong} borderRadius="10px 10px 3px 10px" px={3} py={1.5}>
                {qr.code}
              </Text>
            </HStack>
            <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>
              {t('door_phone_waiting')}<Box as="span" sx={{ '@keyframes dots': { '0%': { opacity: 0.2 }, '50%': { opacity: 1 }, '100%': { opacity: 0.2 } }, animation: 'dots 1.6s infinite' }}> ···</Box>
            </Text>
          </VStack>
        )}

        {(phase === 'nowallet' || phase === 'quiet') && (
          <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>
            wallets seen: {seen().join(' · ') || 'none'}
          </Text>
        )}

        {!supabase && (
          <Text fontFamily="mono" fontSize="11px" color={colors.text.muted}>
            the room is being dug. env is not set on this build.
          </Text>
        )}
      </VStack>
    </VStack>
  );
};

export default Door;
