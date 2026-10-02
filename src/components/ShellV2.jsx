// src/components/ShellV2.jsx
//
// The Phosphor chrome for the holder loop. Six touch targets connect the
// permanent Burro record, connected token wallet, service links, public books,
// tools and rooms. The rail uses forty-four pixel targets on phones and never
// asks a profile page to compete with an Epoch shortcut.
//
// The sidekick remains a provenance drawer at the public door. It is not a
// chatbot and it stores no conversation. No Oxford commas, no em dashes.

import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiBarChart2,
  FiGrid,
  FiMessageSquare,
  FiPocket,
  FiTool,
  FiUser,
} from 'react-icons/fi';
import { useState } from 'react';
import BubbleMark from './BubbleMark';
import colors from '../theme/colors';
import { RAIL, EASE } from '../theme/layout';
import { LANGS, currentLang, setLang } from '../data/copy';

const MuskChip = () => {
  const [open, setOpen] = useState(false);
  return (
    <Box position="fixed" bottom="14px" right="14px" zIndex={800}>
      {open && (
        <Box position="absolute" bottom="58px" right="0" w="260px" p={4} bg={colors.surface.raised} border="1px solid" borderColor={colors.surface.line} borderRadius="17px 17px 5px 17px" boxShadow="0 12px 36px rgba(0,0,0,0.5)">
          <Text fontFamily="mono" fontSize="10px" fontWeight="500" letterSpacing="0.2em" textTransform="uppercase" color={colors.accent.signal}>kneeon musk</Text>
          <Text fontSize="13px" lineHeight="1.6" color={colors.text.secondary} mt={2}>Keeps the signal between the town, the holder record and the service doors.</Text>
          <VStack align="start" spacing={1.5} mt={3}>
            {[
              ['the studio', 'https://neonburro.com/'],
              ['NEONBURRO on Solana', 'https://neonburro.com/token/neonburro/'],
              ['the coin on pump.fun', 'https://pump.fun/coin/EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump'],
            ].map(([label, href]) => (
              <Box key={href} as="a" href={href} target="_blank" rel="noopener noreferrer" fontFamily="mono" fontSize="12px" color={colors.text.primary} _hover={{ color: colors.accent.signal }}>{label} →</Box>
            ))}
          </VStack>
        </Box>
      )}
      <Box as="button" type="button" onClick={() => setOpen((value) => !value)} aria-label="Open Kneeon Musk's link drawer" w="48px" h="48px" borderRadius="16px 16px 5px 16px" overflow="hidden" border="1px solid" borderColor={open ? colors.accent.signal : colors.surface.lineStrong} transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`} _hover={{ transform: 'translateY(-2px)', borderColor: colors.accent.signal }}>
        <Box as="img" src="/kneeon-musk-face.webp" alt="" w="100%" h="100%" objectFit="cover" display="block" />
      </Box>
    </Box>
  );
};

const TABS = [
  { id: 'burro', to: '/burro/', label: 'my Burro', icon: FiUser },
  { id: 'wallet', to: '/wallet/', label: 'wallet', icon: FiPocket },
  { id: 'services', to: '/services/', label: 'service links', icon: FiGrid },
  { id: 'transparency', to: '/transparency/', label: 'public books', icon: FiBarChart2 },
  { id: 'tools', to: '/tools/', label: 'tools', icon: FiTool },
  { id: 'rooms', to: '/room/', label: 'rooms', icon: FiMessageSquare },
];

const AppNav = ({ pathname }) => (
  <HStack
    display={{ base: pathname.startsWith('/room') ? 'none' : 'flex', md: 'flex' }}
    position="fixed"
    bottom={{ base: '10px', md: 'auto' }}
    top={{ base: 'auto', md: '14px' }}
    left="50%"
    transform="translateX(-50%)"
    zIndex={850}
    spacing={1}
    px={2}
    py={2}
    borderRadius="20px 20px 6px 20px"
    bg="rgba(11,11,12,0.54)"
    border="1px solid"
    borderColor={colors.surface.line}
    backdropFilter="blur(14px) saturate(140%)"
    boxShadow="0 10px 30px rgba(0,0,0,0.35)"
  >
    {TABS.map((tab) => {
      const active = pathname.startsWith(tab.to.slice(0, -1));
      const Icon = tab.icon;
      return (
        <Box key={tab.id} as={Link} to={tab.to} aria-label={tab.label} title={tab.label} w="44px" h="44px" display="grid" placeItems="center" borderRadius="14px 14px 4px 14px" bg={active ? colors.accent.signalAlpha[16] : 'transparent'} border="1px solid" borderColor={active ? colors.accent.signalAlpha[32] : 'transparent'} transition={`background 200ms ${EASE}, border-color 200ms ${EASE}`} _hover={{ textDecoration: 'none', bg: 'rgba(255,255,255,0.06)' }}>
          <Icon size={18} color={active ? colors.accent.signal : colors.text.secondary} />
        </Box>
      );
    })}
  </HStack>
);

const ShellV2 = ({ children }) => {
  const { pathname } = useLocation();
  const locked = pathname.startsWith('/room');
  const inside = ['/hello', '/burro', '/wallet', '/transparency', '/services', '/tools', '/room', '/ledger']
    .some((path) => pathname.startsWith(path));
  const [language, setLanguage] = useState(currentLang());
  const pick = (id) => {
    setLang(id);
    setLanguage(id);
    window.location.reload();
  };

  return (
    <Box minH="100dvh" h={locked ? '100dvh' : undefined} overflow={locked ? 'hidden' : undefined} bg={colors.surface.base} display="flex" flexDirection="column">
      <HStack as="header" justify="space-between" px={RAIL} pt={5} pb={2}>
        <HStack as={Link} to={inside ? '/burro/' : '/'} spacing={2.5} _hover={{ textDecoration: 'none' }}>
          <BubbleMark size={13} color={colors.accent.signal} glow={colors.accent.signalAlpha[32]} />
          <Text fontFamily="heading" fontWeight="600" letterSpacing="-0.035em" color={colors.text.primary} fontSize="17px">phosphor<Box as="span" color={colors.accent.signal}>.</Box></Text>
        </HStack>
        <HStack spacing={{ base: 2, md: 3 }}>
          {LANGS.map((option) => (
            <Box key={option.id} as="button" type="button" onClick={() => pick(option.id)} fontFamily="mono" fontSize={{ base: '10px', md: '11px' }} letterSpacing="0.08em" color={language === option.id ? colors.text.primary : colors.text.muted} borderBottom="1px solid" borderColor={language === option.id ? colors.accent.signal : 'transparent'} pb="1px" transition={`color 220ms ${EASE}`} _hover={{ color: colors.text.primary }}>{option.label}</Box>
          ))}
        </HStack>
      </HStack>
      <Box as="main" flex="1" minH={0} display="flex" flexDirection="column" key={pathname}>{children}</Box>
      {!inside && <MuskChip />}
      {inside && !pathname.startsWith('/hello') && <AppNav pathname={pathname} />}
    </Box>
  );
};

export default ShellV2;
