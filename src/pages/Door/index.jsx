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
import { signIn, detect, addressOf, short, seen } from '../../lib/wallet';
const EPOCH_FACE = 'https://neonburro.com/token/epoch-avatar.webp';
const HERE = typeof window !== 'undefined' ? window.location.href : 'https://burros.neonburro.com/';
const PHANTOM_LINK = `https://phantom.app/ul/browse/${encodeURIComponent(HERE)}?ref=${encodeURIComponent(HERE)}`;
const SOLFLARE_LINK = `https://solflare.com/ul/v1/browse/${encodeURIComponent(HERE)}?ref=${encodeURIComponent(HERE)}`;
import { supabase, remembered, setRemembered } from '../../lib/supabase';
import { useEffect } from 'react';
import { check, tokens, knownHandle } from '../../lib/holder';
import QRCode from 'qrcode';
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
      const url = `https://burros.neonburro.com/approve/?n=${j.nonce}`;
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

  const go = async () => {
    setRemembered(remember);
    // A living session skips the wallet entirely, the signature already
    // happened. Only a signed out visitor is sent to the wallet sheet.
    const { data: existing } = supabase ? await supabase.auth.getSession() : { data: null };
    if (!existing?.session) {
      if (!detect()) { setLine(t('door_not_found')); setPhase('nowallet'); startHandoff(); return; }
    }
    setPhase('signing');
    try {
      const session = existing?.session || await signIn();
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
            flexShrink={0}
          />
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
            <Box w="5px" h="5px" borderRadius="full" bg={colors.accent.chain} />
            <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary}>{short(addr)}</Text>
          </HStack>
        )}

        <VStack align="start" spacing={4} pt={2}>
          <Button size="lg" onClick={go} isLoading={phase === 'signing' || phase === 'checking'} loadingText={phase === 'signing' ? '...' : t('door_signed')}>
            {knownHandle() ? t('door_button_back', { handle: knownHandle() }) : t('door_button')}
          </Button>
          <Checkbox isChecked={remember} onChange={(e) => setRemember(e.target.checked)}
            sx={{ '.chakra-checkbox__control': { borderColor: colors.surface.lineStrong, _checked: { bg: colors.accent.signal, borderColor: colors.accent.signal, color: colors.text.inverse } } }}>
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>{t('door_remember')}</Text>
          </Checkbox>
        </VStack>

        <HStack spacing={3} pt={4} borderTop="1px solid" borderColor={colors.surface.line} w="100%" flexWrap="wrap" rowGap={2}>
          <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>
            {phase === 'nowallet' ? t('door_not_found') : t('door_no_wallet')}
          </Text>
          {phase === 'nowallet' && (
            <>
              {/* A phone has no extension to inject a wallet, so the page
                  walks itself into the wallet's own browser. Universal links,
                  phantom and solflare both reopen this exact url inside their
                  app where window.solana exists and the button works. */}
              <Box as="a" href={PHANTOM_LINK} fontFamily="mono" fontSize="12px" color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full" px={3} py={1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_phantom')}
              </Box>
              <Box as="a" href={SOLFLARE_LINK} fontFamily="mono" fontSize="12px" color={colors.accent.signal}
                border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius="full" px={3} py={1}
                _hover={{ bg: colors.accent.signalAlpha[8] }}>
                {t('door_open_solflare')}
              </Box>
              {/* Jupiter mobile has a real dapp browser and no public deep
                  link scheme worth guessing at, so this pill hands the reader
                  the address and tells them where to paste it. Tyler's own
                  coins live in jupiter mobile, this pill is for him first. */}
              <Box as="button" type="button"
                onClick={() => { try { navigator.clipboard.writeText('https://burros.neonburro.com'); setCopied(true); } catch { /* clipboard denied */ } }}
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

        {phase === 'nowallet' && qr && (
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
    </VStack>
  );
};

export default Door;
