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

import { useState } from 'react';
import { Box, Button, Checkbox, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, MEASURE, EASE } from '../../theme/layout';
import { signIn, detect, addressOf, short } from '../../lib/wallet';
const EPOCH_FACE = 'https://neonburro.com/token/epoch-avatar.webp';
const HERE = typeof window !== 'undefined' ? window.location.href : 'https://burros.neonburro.com/';
const PHANTOM_LINK = `https://phantom.app/ul/browse/${encodeURIComponent(HERE)}?ref=${encodeURIComponent(HERE)}`;
const SOLFLARE_LINK = `https://solflare.com/ul/v1/browse/${encodeURIComponent(HERE)}?ref=${encodeURIComponent(HERE)}`;
import { supabase, remembered, setRemembered } from '../../lib/supabase';
import { check, tokens } from '../../lib/holder';
import { WALLET_LINK } from '../../data/links';
import { t } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Door = () => {
  const nav = useNavigate();
  const [phase, setPhase] = useState('resting');
  const [remember, setRemember] = useState(remembered());
  const [line, setLine] = useState(null);
  const [addr, setAddr] = useState(null);

  const go = async () => {
    setRemembered(remember);
    if (!detect()) { setPhase('nowallet'); return; }
    setPhase('signing');
    try {
      const session = await signIn();
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
      setLine(t('door_quiet'));
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
    <VStack flex="1" justify="center" align="stretch" px={RAIL} spacing={0} pb={24}>
      <VStack align="start" spacing={6} maxW={MEASURE} w="100%">
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

        {(phase === 'under' || phase === 'quiet') && (
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
            {t('door_button')}
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
