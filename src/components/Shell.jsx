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
import { LANGS, currentLang, setLang } from '../data/copy';

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
      {!pathname.startsWith('/room') && <MuskChip />}
    </Box>
  );
};

export default Shell;
