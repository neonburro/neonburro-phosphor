// src/components/Shell.jsx
//
// The chrome. A mark at the top left, the language at the top right, the page
// between. No nav bar, the burrow has three places and each one knows where
// the others are. The mark is the teal disc, the same disc that ends the
// wordmark, and it links home to the door.
//
// No oxford commas, no em dashes.

import { Box, HStack, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import colors from '../theme/colors';
import { RAIL, EASE } from '../theme/layout';
import { LANGS, currentLang, setLang, t } from '../data/copy';

// ── KNEEON MUSK, THE CORNER ─────────────────────────────────────────────────
// The Powered by Netlify badge is retired and this is what stands where it
// stood: the studio's skunk, tail up, keeping the signal. Click him and he
// does his job, three rings go out and the card opens with where everything
// is. Bottom right on every page except the room, whose composer owns that
// corner on a phone.
const MuskChip = () => {
  const [open, setOpen] = useState(false);
  const [ping, setPing] = useState(0);
  const job = () => { setPing((n) => n + 1); setOpen((o) => !o); };
  return (
    <Box position="fixed" bottom="14px" right="14px" zIndex={800}>
      {open && (
        <Box position="absolute" bottom="56px" right="0" w="248px" p={4}
          bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line}
          borderRadius="16px" boxShadow="0 12px 36px rgba(0,0,0,0.5)">
          <Text fontFamily="mono" fontSize="10px" fontWeight="500" letterSpacing="0.2em" textTransform="uppercase" color={colors.accent.signal}>
            kneeon musk
          </Text>
          <Text fontSize="13px" lineHeight="1.6" color={colors.text.secondary} mt={2}>
            keeps the signal between the towns and the stacks. built by neonburro. runs on real rails.
          </Text>
          <VStack align="start" spacing={1.5} mt={3}>
            {[
              ['the studio', 'https://neonburro.com'],
              ['NEONBURRO on solana', 'https://neonburro.com/token/neonburro/'],
              ['the telegram', 'https://t.me/burroship'],
            ].map(([label, href]) => (
              <Box key={href} as="a" href={href} target="_blank" rel="noopener noreferrer"
                fontFamily="mono" fontSize="12px" color={colors.text.primary}
                _hover={{ color: colors.accent.signal }}>
                {label} →
              </Box>
            ))}
          </VStack>
        </Box>
      )}
      <Box as="button" type="button" onClick={job} aria-label="kneeon musk keeps the signal"
        position="relative" w="44px" h="44px" borderRadius="14px" overflow="visible"
        border="1px solid" borderColor={open ? colors.accent.signal : colors.surface.lineStrong}
        transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`}
        _hover={{ transform: 'translateY(-2px)', borderColor: colors.accent.signal }}>
        {ping > 0 && [0, 1, 2].map((i) => (
          <Box key={`${ping}-${i}`} position="absolute" inset="-2px" borderRadius="14px"
            border="1px solid" borderColor={colors.accent.signal} pointerEvents="none"
            sx={{ '@keyframes muskPing': { from: { transform: 'scale(1)', opacity: 0.7 }, to: { transform: 'scale(2.1)', opacity: 0 } }, animation: `muskPing 900ms ${EASE} ${i * 140}ms forwards` }} />
        ))}
        <Box as="img" src="/kneeon-musk.webp" alt="" w="100%" h="100%" objectFit="cover" borderRadius="13px" display="block" />
      </Box>
    </Box>
  );
};

// ── THE APP NAV ─────────────────────────────────────────────────────────────
// The product's frame, shown once a holder is inside: wallet, rooms and
// epoch, who is a place as much as a burro. A floating pill on a phone, the
// same three words in the header on a desktop. The epoch tab walks straight
// to his desk in the coin room. This is the shape the future app downloads
// with, the site is the beta and dresses like it.
const TABS = [
  { id: 'wallet', to: '/wallet/', key: 'nav_wallet' },
  { id: 'rooms', to: '/room/', key: 'nav_rooms' },
  { id: 'epoch', to: '/room/?r=the-coin', key: 'nav_epoch' },
];

const AppNav = ({ pathname, search }) => {
  const active = (tab) => {
    if (tab.id === 'wallet') return pathname.startsWith('/wallet');
    if (tab.id === 'epoch') return pathname.startsWith('/room') && search.includes('r=the-coin');
    return pathname.startsWith('/room') && !search.includes('r=the-coin');
  };
  return (
    <HStack
      display={{ base: pathname.startsWith('/room') ? 'none' : 'flex', md: 'flex' }}
      position="fixed"
      bottom={{ base: '12px', md: 'auto' }}
      top={{ base: 'auto', md: '14px' }}
      left="50%"
      transform="translateX(-50%)"
      zIndex={850}
      spacing={1}
      px={1.5}
      py={1.5}
      borderRadius="full"
      bg="rgba(20,20,22,0.92)"
      border="1px solid"
      borderColor={colors.surface.line}
      backdropFilter="blur(12px)"
      boxShadow="0 10px 30px rgba(0,0,0,0.45)"
    >
      {TABS.map((tab) => (
        <Box key={tab.id} as={Link} to={tab.to}
          px={4} py={1.5} borderRadius="full"
          bg={active(tab) ? colors.accent.signalAlpha[16] : 'transparent'}
          border="1px solid" borderColor={active(tab) ? colors.accent.signalAlpha[32] : 'transparent'}
          transition={`background 200ms ${EASE}, border-color 200ms ${EASE}`}
          _hover={{ textDecoration: 'none', bg: 'rgba(255,255,255,0.05)' }}>
          <HStack spacing={2}>
            {tab.id === 'epoch' && (
              <Box as="img" src="https://neonburro.com/token/epoch-avatar.webp" alt="" w="16px" h="16px" borderRadius="6px" objectFit="cover" />
            )}
            <Text fontFamily="mono" fontSize="12px" fontWeight="500"
              color={active(tab) ? colors.accent.signal : colors.text.secondary}>
              {t(tab.key)}
            </Text>
          </HStack>
        </Box>
      ))}
    </HStack>
  );
};

const Shell = ({ children }) => {
  const { pathname } = useLocation();
  // The room is a messenger and a messenger owns its scroll. On /room/ the
  // shell locks to the viewport and the feed scrolls inside its pane. Every
  // other page scrolls like a page.
  const locked = pathname.startsWith('/room');
  const [lang, setLangState] = useState(currentLang());
  const pick = (id) => { setLang(id); setLangState(id); window.location.reload(); };

  return (
    <Box minH="100dvh" h={locked ? '100dvh' : undefined} overflow={locked ? 'hidden' : undefined} bg={colors.surface.base} display="flex" flexDirection="column">
      <HStack as="header" justify="space-between" px={RAIL} pt={5} pb={2}>
        <HStack as={Link} to="/" spacing={2.5} _hover={{ textDecoration: 'none' }}>
          <Box w="12px" h="12px" borderRadius="full" bg={colors.accent.signal} boxShadow={`0 0 10px ${colors.accent.signalAlpha[32]}`} />
          <Text fontFamily="heading" fontWeight="600" letterSpacing="-0.035em" color={colors.text.primary} fontSize="17px">
            burros<Box as="span" color={colors.accent.signal}>.</Box>
          </Text>
        </HStack>
        <HStack spacing={{ base: 2, md: 3 }}>
          {LANGS.map((l) => (
            <Box key={l.id} as="button" type="button" onClick={() => pick(l.id)}
              fontFamily="mono" fontSize={{ base: '10px', md: '11px' }} letterSpacing="0.08em"
              color={lang === l.id ? colors.text.primary : colors.text.muted}
              borderBottom="1px solid" borderColor={lang === l.id ? colors.accent.signal : 'transparent'}
              pb="1px" transition={`color 220ms ${EASE}`}
              _hover={{ color: colors.text.primary }}>
              {l.label}
            </Box>
          ))}
        </HStack>
      </HStack>
      <Box as="main" flex="1" minH={0} display="flex" flexDirection="column" key={pathname}>
        {children}
      </Box>
      {!pathname.startsWith('/room') && !pathname.startsWith('/wallet') && <MuskChip />}
      {(pathname.startsWith('/wallet') || pathname.startsWith('/room')) && (
        <AppNav pathname={pathname} search={typeof window !== 'undefined' ? window.location.search : ''} />
      )}
    </Box>
  );
};

export default Shell;
