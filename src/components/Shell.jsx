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

const Shell = ({ children }) => {
  const { pathname } = useLocation();
  const [lang, setLangState] = useState(currentLang());
  const pick = (id) => { setLang(id); setLangState(id); window.location.reload(); };

  return (
    <Box minH="100dvh" bg={colors.surface.base} display="flex" flexDirection="column">
      <HStack as="header" justify="space-between" px={RAIL} pt={5} pb={2}>
        <HStack as={Link} to="/" spacing={2.5} _hover={{ textDecoration: 'none' }}>
          <Box w="12px" h="12px" borderRadius="full" bg={colors.accent.signal} boxShadow={`0 0 10px ${colors.accent.signalAlpha[32]}`} />
          <Text fontFamily="heading" fontWeight="600" letterSpacing="-0.035em" color={colors.text.primary} fontSize="17px">
            burros<Box as="span" color={colors.accent.signal}>.</Box>
          </Text>
        </HStack>
        <HStack spacing={3}>
          {LANGS.map((l) => (
            <Box key={l.id} as="button" type="button" onClick={() => pick(l.id)}
              fontFamily="mono" fontSize="11px" letterSpacing="0.08em"
              color={lang === l.id ? colors.text.primary : colors.text.muted}
              borderBottom="1px solid" borderColor={lang === l.id ? colors.accent.signal : 'transparent'}
              pb="1px" transition={`color 220ms ${EASE}`}
              _hover={{ color: colors.text.primary }}>
              {l.label}
            </Box>
          ))}
        </HStack>
      </HStack>
      <Box as="main" flex="1" display="flex" flexDirection="column" key={pathname}>
        {children}
      </Box>
    </Box>
  );
};

export default Shell;
