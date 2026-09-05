// src/pages/Door/index.jsx
//
// The door. One sentence, one button, one line for the walletless. The whole
// page is the consent moment, so it says exactly what happens and no more.
//
// States, in the order a visitor meets them:
//   resting    the sentence and the button
//   signing    the wallet sheet is up, the button waits
//   checking   signed, the balance is being read
//   under      a real wallet under the line. the sentence says the two numbers
//   in         straight to /hello/ the first time, /room/ after
//   nowallet   no provider answered. the one link, or the plain sentence when
//              the link is not filled in yet
//   quiet      the function could not be reached. nobody is blamed
//
// The remember me tick is read by lib/supabase.js at the NEXT load, so it is
// written before signing begins. Purple appears exactly once on this page, on
// the wallet address chip after signing, because that is the chain talking.
//
// No oxford commas, no em dashes.

import { useState, useRef } from 'react';
import { Box, Button, Checkbox, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, MEASURE, EASE } from '../../theme/layout';
import TokenChip from '../../components/TokenChip';
import { signIn, detect, detectAll, addressOf, short, seen } from '../../lib/wallet';
const EPOCH_FACE = 'https://neonburro.com/token/epoch-avatar.webp';
// ── THE DEEP LINK TARGET IS READ WHEN YOU TAP, NOT WHEN THE MODULE LOADS ────
//
// HERE used to be a module level const. In a single page app that is evaluated
// once, on whichever url happened to import this module first, so a visitor who
// landed anywhere else and then walked to the door handed the wallet a stale
// address. The wallet dutifully opened THAT page in its browser, the door was
// not on screen, and the whole thing looked like being signed up fresh.
//
// It is a function now. Every link is built from window.location.href at the
// moment it is rendered, so the wallet always reopens the door the visitor is
// actually standing at.
const here = () => (typeof window !== 'undefined' ? window.location.href : 'https://phosphor.neonburro.com/');

// ── A PHONE IS NOT A SMALL DESKTOP ──────────────────────────────────────────
//
// A phone browser has no extension, so nothing injects window.solana and
// detect() correctly finds nothing. The old code then showed the QR handoff,
// which is a DESKTOP mechanic. Its own alt text says scan with your signed in
// phone. Showing it to somebody holding the phone asks them to scan a code with
// the device displaying it.
//
// So the door has to know which it is talking to. Coarse pointer and a narrow
// viewport, checked at render rather than cached, because a tablet can change
// its mind on rotate. On a phone the wallet links become the answer and the QR
// is hidden. On a desktop nothing changes.
const onPhone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 820;
};

const PHANTOM_LINK = () => `https://phantom.app/ul/browse/${encodeURIComponent(here())}?ref=${encodeURIComponent(here())}`;
const SOLFLARE_LINK = () => `https://solflare.com/ul/v1/browse/${encodeURIComponent(here())}?ref=${encodeURIComponent(here())}`;
// Documented deep links only. Trust publishes link.trustwallet.com open_url
// with coin 501 for solana and coinbase publishes go.cb-w.com dapp. Okx and
// backpack publish nothing reliable, their in app browsers arrive through the
// wallet standard on their own.
const TRUST_LINK = () => `https://link.trustwallet.com/open_url?coin_id=501&url=${encodeURIComponent(here())}`;
const COINBASE_LINK = () => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here())}`;
import { supabase, remembered, setRemembered } from '../../lib/supabase';
import { useEffect } from 'react';
import { check, tokens, knownHandle } from '../../lib/holder';
import QRCode from 'qrcode';

// ── THE SIGNALS, 2026-08-27 ─────────────────────────────────────────────────
// The door states the room's vitals before anyone signs, price and day move
// from the studio's token-price function (one source of price truth for
// every property, pull from one), holders from the hourly token_snapshots,
// and the open spot count from the send a burro wall, which is the same
// project this room lives in. Every stat renders only when its number
// arrived, a dash is a lie and a spinner is a promise, the row simply grows
// as the answers land. Tack, not dashboarding. Mobile first, it wraps.
const useDoorSignals = () => {
  const [sig, setSig] = useState({});
  useEffect(() => {
    let dead = false;
    fetch('https://neonburro.com/.netlify/functions/token-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const tk = j?.tokens?.neonburro;
        if (dead || !tk) return;
        setSig((s) => ({ ...s, price: tk.usdPrice, change: tk.change24h, pool: tk.reserves?.poolUsd }));
      })
      .catch(() => {});
    if (supabase) {
      supabase.from('token_snapshots').select('holders').order('taken_at', { ascending: false }).limit(1)
        .then(({ data }) => { if (!dead && data?.[0]) setSig((s) => ({ ...s, holders: data[0].holders })); });
      supabase.from('send_a_burro_public').select('spot').eq('status', 'ramp')
        .then(({ data }) => { if (!dead && Array.isArray(data)) setSig((s) => ({ ...s, spots: Math.max(0, 100 - data.length) })); });
    }
    return () => { dead = true; };
  }, []);
  return sig;
};

const sigMoney = (p) => (Number.isFinite(p) ? (p >= 0.01 ? `$${p.toFixed(4)}` : `$${p.toPrecision(3)}`) : null);

const DoorSignals = () => {
  const sig = useDoorSignals();
  const bits = [];
  if (sigMoney(sig.price)) {
    bits.push(
      <Text as="span" key="price" color={colors.text.primary}>
        {sigMoney(sig.price)}{' '}
        {Number.isFinite(sig.change) && (
          <Text as="span" color={sig.change >= 0 ? colors.accent.signal : colors.text.muted}>
            {sig.change >= 0 ? '+' : ''}{sig.change.toFixed(1)}%
          </Text>
        )}
      </Text>
    );
  }
  if (Number.isFinite(sig.holders)) {
    bits.push(<Text as="span" key="holders"><Text as="span" color={colors.text.primary}>{sig.holders}</Text> holders</Text>);
  }
  if (Number.isFinite(sig.spots)) {
    bits.push(
      <Text as="span" key="spots">
        <Box as="a" href="https://neonburro.com/send-a-burro/" target="_blank" rel="noopener noreferrer"
          color={colors.text.muted} borderBottom="1px solid" borderColor="transparent"
          transition={`color 200ms ${EASE}, border-color 200ms`}
          _hover={{ color: colors.accent.signal, borderColor: colors.accent.signal }}>
          <Text as="span" color={colors.text.primary}>{sig.spots}</Text> spots stand open on the wall
        </Box>
      </Text>
    );
  }
  if (!bits.length) return null;
  return (
    <HStack spacing={0} flexWrap="wrap" rowGap={1.5} fontFamily="mono" fontSize="12px"
      color={colors.text.muted} letterSpacing="0.02em"
      sx={{
        animation: 'nbSigIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        '@keyframes nbSigIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>
      {bits.map((b, i) => (
        <HStack as="span" key={i} spacing={0} display="inline-flex" align="baseline">
          {i > 0 && <Text as="span" mx={2.5} color={colors.surface.lineStrong}>·</Text>}
          {b}
        </HStack>
      ))}
    </HStack>
  );
};
import { WALLET_LINK } from '../../data/links';
import { t } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Door = () => {
  const nav = useNavigate();
  const [phase, setPhase] = useState('resting');
  const [remember, setRemember] = useState(remembered());
  const [line, setLine] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  const qrPoll = useRef(null);

  // The phone signs for this screen. Ask the function for a nonce, draw it as
  // a QR pointing at /approve/, and poll claim until the phone says yes. The
  // claim answers once with a one time token that verifyOtp turns into a real
  // session for the same holder, then the normal check walks this screen in.
  const startHandoff = async () => {
    try {
      const res = await fetch('/.netlify/functions/handoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const j = await res.json();
      if (!j.ok || !j.nonce) return;
      const url = `https://phosphor.neonburro.com/approve/?n=${j.nonce}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#F4F3F1', light: '#0B0B0C00' } });
      setQr({ img: dataUrl, nonce: j.nonce });
      qrPoll.current && clearInterval(qrPoll.current);
      qrPoll.current = setInterval(async () => {
        try {
          const r2 = await fetch('/.netlify/functions/handoff', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'claim', nonce: j.nonce }),
          });
          const c = await r2.json();
          if (c.token_hash && supabase) {
            clearInterval(qrPoll.current);
            const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: c.token_hash });
            if (!error) {
              setPhase('checking');
              const r3 = await check();
              if (r3.state === 'in') nav(r3.holder?.handle ? '/room/' : '/hello/');
              else if (r3.state === 'under') { setLine(t('door_under', { balance: tokens(r3.balance) || '0', threshold: tokens(r3.threshold) || 'enough' })); setPhase('under'); }
              else { setLine(r3.error ? String(r3.error).toLowerCase() : t('door_quiet')); setPhase('quiet'); }
            }
          }
          if (c.reason === 'expired') { clearInterval(qrPoll.current); setQr(null); }
        } catch { /* next poll */ }
      }, 3000);
    } catch { /* the pills remain */ }
  };
  useEffect(() => () => { qrPoll.current && clearInterval(qrPoll.current); }, []);

  // A session that already exists is used, not re signed. The first cut asked
  // the wallet for a fresh signature on every tap, so a person whose sign in
  // SUCCEEDED but whose balance check stumbled was sent around the loop
  // again, signing forever. On load: session present, run the check straight
  // away and either walk in, say under, or say exactly what failed.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data?.session || !live) return;
      setAddr(addressOf(data.session.user));
      setPhase('checking');
      const r = await check();
      if (!live) return;
      if (r.state === 'in') { nav(r.holder?.handle ? '/room/' : '/hello/'); return; }
      if (r.state === 'under') {
        setLine(t('door_under', { balance: tokens(r.balance) || '0', threshold: tokens(r.threshold) || 'enough' }));
        setPhase('under');
        return;
      }
      if (r.state === 'quiet') {
        setLine(r.error ? String(r.error).toLowerCase() : t('door_quiet'));
        setPhase('quiet');
        return;
      }
      setPhase('resting');
    })();
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [addr, setAddr] = useState(null);

  // choice is a picker entry from detectAll, absent for the auto pick and
  // for a returning session, which never touches the wallet at all.
  const go = async (choice) => {
    setRemembered(remember);
    // A living session skips the wallet entirely, the signature already
    // happened. Only a signed out visitor is sent to the wallet sheet.
    const { data: existing } = supabase ? await supabase.auth.getSession() : { data: null };
    if (!existing?.session) {
      if (!choice && !detect()) { setLine(t('door_not_found')); setPhase('nowallet'); startHandoff(); return; }
    }
    setPhase('signing');
    try {
      const session = existing?.session || await signIn(choice);
      setAddr(addressOf(session?.user));
      setPhase('checking');
      const r = await check();
      if (r.state === 'in') {
        nav(r.holder?.handle ? '/room/' : '/hello/');
        return;
      }
      if (r.state === 'under') {
        setLine(t('door_under', { balance: tokens(r.balance) || '0', threshold: tokens(r.threshold) || 'enough' }));
        setPhase('under');
        return;
      }
      setLine(r.error ? String(r.error).toLowerCase() : t('door_quiet'));
      setPhase('quiet');
    } catch (err) {
      if (err.message === 'no wallet') { setPhase('nowallet'); return; }
      // The real sentence, not a shrug. The first cut showed the quiet line
      // for every failure and made a config error look like weather.
      setLine(err.message && err.message !== 'the wallet did not sign' ? err.message.toLowerCase() : t('door_quiet'));
      setPhase('quiet');
    }
  };

  return (
    <VStack flex="1" justify="center" align="stretch" px={RAIL} spacing={0} pb={24} position="relative">
      {/* The audience. The theater of burros in lime glasses, ghosted to six
          percent behind the door, all of them watching whoever arrives. Same
          plate as the share card, served from the studio, pull from one. A
          gradient keeps the reading column dark and the words in front. */}
      <Box position="absolute" inset={0} pointerEvents="none" aria-hidden="true"
        bgImage="url('https://neonburro.com/token/holders-in-glasses.webp')"
        bgSize="cover" bgPosition="center 30%" opacity={0.06}
        filter="grayscale(0.4)" />
      <Box position="absolute" inset={0} pointerEvents="none" aria-hidden="true"
        bgGradient={`linear(to-r, ${colors.surface.base} 0%, rgba(11,11,12,0.55) 55%, rgba(11,11,12,0.2) 100%)`} />
      <VStack align="start" spacing={6} maxW={MEASURE} w="100%" position="relative" zIndex={1}>
        <Text {...kicker} color={colors.accent.signal}>{t('door_kicker')}</Text>
        <HStack spacing={{ base: 4, md: 5 }} align="center">
          {/* Rest a cursor on the steward and he says his line, the same one
              the coin page and the pump.fun bio carry. Voice two, one aside,
              hover only, a phone tap has a door to open. */}
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

        {/* The vitals, stated before anyone signs. See useDoorSignals above. */}
        <DoorSignals />

        {(phase === 'under' || phase === 'quiet' || phase === 'nowallet') && (
          <Text fontFamily="mono" fontSize="13px" lineHeight="1.7" color={colors.text.primary} borderLeft="2px solid" borderColor={colors.accent.signal} pl={4}>
            {line}
          </Text>
        )}

        {addr && phase !== 'resting' && (
          <HStack spacing={2} px={3} py={1.5} borderRadius="full" border="1px solid" borderColor={colors.accent.chainAlpha[32]} bg={colors.accent.chainAlpha[8]}>
            {/* the one breath on the door. the chain dot swells like a slow
                heartbeat, the same tack the studio hero disc carries, and
                reduced motion holds it still. */}
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
          {/* The picker, synced with the studio's send a burro gate
              2026-08-27, Tyler's law that every wallet door in the family
              behaves the same. A browser holding several wallets chooses,
              a returning holder keeps the one welcome back button, the
              session skips the sheet either way. */}
          {!knownHandle() && detectAll().length > 1 ? (
            <VStack align="start" spacing={3}>
              <Text {...kicker} color={colors.text.muted}>connect with</Text>
              <HStack spacing={3} flexWrap="wrap" rowGap={3}>
                {detectAll().map((c) => (
                  <Button key={c.name} size="lg" onClick={() => go(c)}
                    isLoading={phase === 'signing' || phase === 'checking'}
                    loadingText={phase === 'signing' ? '...' : t('door_signed')}>
                    {c.name}
                  </Button>
                ))}
              </HStack>
            </VStack>
          ) : (
            <Button size="lg" onClick={() => go()} isLoading={phase === 'signing' || phase === 'checking'} loadingText={phase === 'signing' ? '...' : t('door_signed')}>
              {knownHandle() ? t('door_button_back', { handle: knownHandle() }) : t('door_button')}
            </Button>
          )}
          <Box as="button" type="button" onClick={() => { setPhase((ph) => ph); startHandoff(); }}
            fontFamily="mono" fontSize="12px" color={colors.text.muted} textAlign="left"
            _hover={{ color: colors.accent.signal }}>
            {t('door_use_phone')}
          </Box>
          <Checkbox isChecked={remember} onChange={(e) => setRemember(e.target.checked)}
            sx={{ '.chakra-checkbox__control': { borderColor: colors.surface.lineStrong, _checked: { bg: colors.accent.signal, borderColor: colors.accent.signal, color: colors.text.inverse } } }}>
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>{t('door_remember')}</Text>
          </Checkbox>
        </VStack>

        <HStack spacing={3} pt={4} borderTop="1px solid" borderColor={colors.surface.line} w="100%" flexWrap="wrap" rowGap={2}>
          {/* On a phone this line is the instruction rather than an aside, so it
              reads at the same weight as the buttons under it and in the primary
              ink. On a desktop it stays the quiet footnote it always was. */}
          <Text fontFamily="mono" fontSize={onPhone() ? '13px' : '12px'}
            color={onPhone() ? colors.text.primary : colors.text.muted} w={onPhone() ? '100%' : 'auto'}>
            {phase === 'nowallet' ? t('door_not_found') : t('door_no_wallet')}
          </Text>
          {phase === 'nowallet' && (
            <>
              {/* A phone has no extension to inject a wallet, so the page
                  walks itself into the wallet's own browser. Universal links,
                  phantom and solflare both reopen this exact url inside their
                  app where window.solana exists and the button works. */}
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
              {/* Jupiter mobile has a real dapp browser and no public deep
                  link scheme worth guessing at, so this pill hands the reader
                  the address and tells them where to paste it. Tyler's own
                  coins live in jupiter mobile, this pill is for him first. */}
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

        {/* Desktop only. This is the scan it with your other device handoff,
            and its own alt text says as much, so showing it on a phone asks
            somebody to scan a code with the screen they are holding. The wallet
            links above are the phone's answer. */}
        {qr && !onPhone() && (
          <VStack align="start" spacing={3} pt={4} borderTop="1px solid" borderColor={colors.surface.line} w="100%">
            <Text fontFamily="mono" fontSize="12px" color={colors.text.primary}>{t('door_phone')}</Text>
            <Text fontFamily="mono" fontSize="11px" color={colors.text.muted} maxW="360px">{t('door_phone_line')}</Text>
            <Box p={3} bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line} borderRadius="16px">
              <Box as="img" src={qr.img} alt="scan with your signed in phone" w="180px" h="180px" display="block" />
            </Box>
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
      <TokenChip />
    </VStack>
  );
};

export default Door;
