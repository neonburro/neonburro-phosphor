// src/components/Shell.jsx
//
// The chrome. A mark at the top left, the language at the top right, the page
// between. Once a holder is inside, one icon rail connects the wallet, service
// hall, tools, rooms and Epoch's desk. The mark links home to the door.
//
// No oxford commas, no em dashes.

import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiPocket, FiMessageSquare, FiTool } from 'react-icons/fi';
import { useState } from 'react';
import colors from '../theme/colors';
import { RAIL, EASE } from '../theme/layout';
import { LANGS, currentLang, setLang, t } from '../data/copy';
import { words } from '../data/services';

// Kneeon Musk keeps the lower corner. The old hosting badge is gone. This
// card says where the product comes from without crowding the app rail.
const MuskChip = () => {
  const [open, setOpen] = useState(false);
  const [ping, setPing] = useState(0);
  const job = () => { setPing((n) => n + 1); setOpen((value) => !value); };

  return (
    <Box position="fixed" bottom="14px" right="14px" zIndex={800}>
      {open && (
        <Box
          position="absolute"
          bottom="56px"
          right="0"
          w="248px"
          p={4}
          bg={colors.surface.raised}
          border="1px solid"
          borderColor={colors.surface.line}
          borderRadius="16px"
          boxShadow="0 12px 36px rgba(0,0,0,0.5)"
        >
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
              ['the coin on pump.fun', 'https://pump.fun/coin/EdBEwPyso39z2ow59frpuLUVz5axm61dnqAeAuxYpump'],
              ['neonburro on x', 'https://x.com/neonburro'],
            ].map(([label, href]) => (
              <Box
                key={href}
                as="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                fontFamily="mono"
                fontSize="12px"
                color={colors.text.primary}
                _hover={{ color: colors.accent.signal }}
              >
                {label} →
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      <Box
        as="button"
        type="button"
        onClick={job}
        aria-label="kneeon musk keeps the signal"
        position="relative"
        w="44px"
        h="44px"
        borderRadius="14px"
        overflow="visible"
        border="1px solid"
        borderColor={open ? colors.accent.signal : colors.surface.lineStrong}
        transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`}
        _hover={{ transform: 'translateY(-2px)', borderColor: colors.accent.signal }}
      >
        {ping > 0 && [0, 1, 2].map((index) => (
          <Box
            key={`${ping}-${index}`}
            position="absolute"
            inset="-2px"
            borderRadius="14px"
            border="1px solid"
            borderColor={colors.accent.signal}
            pointerEvents="none"
            sx={{
              '@keyframes muskPing': {
                from: { transform: 'scale(1)', opacity: 0.7 },
                to: { transform: 'scale(2.1)', opacity: 0 },
              },
              animation: `muskPing 900ms ${EASE} ${index * 140}ms forwards`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        ))}
        <Box as="img" src="/kneeon-musk-face.webp" alt="" w="100%" h="100%" objectFit="cover" borderRadius="13px" display="block" />
      </Box>
    </Box>
  );
};

// Icons only. The words live in aria labels where assistive technology finds
// them and the small screen stays clean.
const TABS = [
  { id: 'wallet', to: '/wallet/', key: 'nav_wallet', icon: 'pocket' },
  { id: 'services', to: '/services/', key: 'nav_services', icon: 'services' },
  { id: 'tools', to: '/tools/', key: 'tools', icon: 'tools' },
  { id: 'rooms', to: '/room/', key: 'nav_rooms', icon: 'talk' },
  { id: 'epoch', to: '/room/?r=the-coin', key: 'nav_epoch', icon: 'epoch' },
];

const AppNav = ({ pathname, search }) => {
  const active = (tab) => {
    if (tab.id === 'wallet') return pathname.startsWith('/wallet');
    if (tab.id === 'services') return pathname.startsWith('/services');
    if (tab.id === 'tools') return pathname.startsWith('/tools');
    if (tab.id === 'epoch') return pathname.startsWith('/room') && search.includes('r=the-coin');
    return pathname.startsWith('/room') && !search.includes('r=the-coin');
  };

  const label = (tab) => {
    if (tab.id === 'services') return words(currentLang()).kicker;
    if (tab.id === 'tools') return 'tools';
    return t(tab.key);
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
      spacing={1.5}
      px={2}
      py={2}
      borderRadius="20px"
      bg="rgba(11,11,12,0.35)"
      border="1px solid"
      borderColor={colors.surface.line}
      backdropFilter="blur(14px) saturate(140%)"
      boxShadow="0 10px 30px rgba(0,0,0,0.35)"
    >
      {TABS.map((tab) => (
        <Box
          key={tab.id}
          as={Link}
          to={tab.to}
          aria-label={label(tab)}
          title={label(tab)}
          w="42px"
          h="42px"
          display="grid"
          placeItems="center"
          borderRadius="14px"
          bg={active(tab) ? colors.accent.signalAlpha[16] : 'transparent'}
          border="1px solid"
          borderColor={active(tab) ? colors.accent.signalAlpha[32] : 'transparent'}
          transition={`background 200ms ${EASE}, border-color 200ms ${EASE}`}
          _hover={{ textDecoration: 'none', bg: 'rgba(255,255,255,0.06)' }}
        >
          {tab.icon === 'pocket' && <FiPocket size={18} color={active(tab) ? colors.accent.signal : colors.text.secondary} />}
          {tab.icon === 'services' && <FiGrid size={18} color={active(tab) ? colors.accent.signal : colors.text.secondary} />}
          {tab.icon === 'tools' && <FiTool size={18} color={active(tab) ? colors.accent.signal : colors.text.secondary} />}
          {tab.icon === 'talk' && <FiMessageSquare size={18} color={active(tab) ? colors.accent.signal : colors.text.secondary} />}
          {tab.icon === 'epoch' && (
            <Box
              as="img"
              src="/epoch-avatar.webp"
              alt=""
              w="24px"
              h="24px"
              borderRadius="8px"
              objectFit="cover"
              border="1px solid"
              borderColor={active(tab) ? colors.accent.signalAlpha[32] : 'transparent'}
            />
          )}
        </Box>
      ))}
    </HStack>
  );
};

const Shell = ({ children }) => {
  const { pathname } = useLocation();
  const locked = pathname.startsWith('/room');
  const inside = pathname.startsWith('/wallet')
    || pathname.startsWith('/services')
    || pathname.startsWith('/tools')
    || pathname.startsWith('/room');
  const [lang, setLangState] = useState(currentLang());
  const pick = (id) => {
    setLang(id);
    setLangState(id);
    window.location.reload();
  };

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
          {LANGS.map((language) => (
            <Box
              key={language.id}
              as="button"
              type="button"
              onClick={() => pick(language.id)}
              fontFamily="mono"
              fontSize={{ base: '10px', md: '11px' }}
              letterSpacing="0.08em"
              color={lang === language.id ? colors.text.primary : colors.text.muted}
              borderBottom="1px solid"
              borderColor={lang === language.id ? colors.accent.signal : 'transparent'}
              pb="1px"
              transition={`color 220ms ${EASE}`}
              _hover={{ color: colors.text.primary }}
            >
              {language.label}
            </Box>
          ))}
        </HStack>
      </HStack>

      <Box as="main" flex="1" minH={0} display="flex" flexDirection="column" key={pathname}>
        {children}
      </Box>

      {!inside && <MuskChip />}
      {inside && <AppNav pathname={pathname} search={typeof window !== 'undefined' ? window.location.search : ''} />}
    </Box>
  );
};

export default Shell;
