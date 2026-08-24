// src/components/TokenChip.jsx
//
// The little live price on the door, bottom left, opposite Kneeon's corner.
// One number, one dot, one destination. Clicking it opens the NEONBURRO page
// on the studio where the full chart lives, because the door is not the place
// to read candles, it is the place to notice the coin has a pulse.
//
// WHERE THE NUMBER COMES FROM. The studio's token-chart function is the one
// source of chart truth for every property, pull from one is the house law.
// The fetch is cross origin and only works because token-chart sends cors
// headers. If that ever changes this chip does not error, it renders nothing,
// a chip with no number should not exist.
//
// THE COLOUR. The dot is teal when the day is up because teal has exactly one
// job in phosphor, money. It goes muted when the day is down, never red, the
// door is nobody's trading terminal. The dot re-runs its settle animation when
// a refetch changes the price, that is the pulse.
//
// Mounted only on the Door. The rooms and the saddlebag have their own ways
// of showing the coin.
//
// No oxford commas, no em dashes.

import { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import colors from '../theme/colors';
import { EASE } from '../theme/layout';

const FEED = 'https://neonburro.com/.netlify/functions/token-chart?tf=hour&limit=25';
const PAGE = 'https://neonburro.com/token/neonburro/';

const money = (p) => {
  if (!Number.isFinite(p)) return null;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
};

const TokenChip = () => {
  const [price, setPrice] = useState(null);
  const [up, setUp] = useState(true);
  const [tick, setTick] = useState(0);
  const last = useRef(null);

  useEffect(() => {
    let dead = false;
    const pull = async () => {
      try {
        const r = await fetch(FEED);
        const j = await r.json();
        const c = j?.candles;
        if (dead || !Array.isArray(c) || c.length < 2) return;
        const now = c[c.length - 1].c;
        setUp(now >= c[0].c);
        setPrice(now);
        if (last.current !== null && now !== last.current) setTick((n) => n + 1);
        last.current = now;
      } catch {
        // quiet on purpose, see the helper block
      }
    };
    pull();
    const t = setInterval(pull, 60000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  if (price === null) return null;

  return (
    <Box
      as="a"
      href={PAGE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="NEONBURRO on solana, the full chart"
      position="fixed"
      bottom="14px"
      left="14px"
      zIndex={800}
      display="flex"
      alignItems="center"
      gap="8px"
      px={3}
      py={2}
      borderRadius="12px"
      bg="rgba(11,11,12,0.55)"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor={colors.surface.line}
      transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`}
      _hover={{ transform: 'translateY(-2px)', borderColor: colors.accent.money, textDecoration: 'none' }}
    >
      <Box
        key={tick}
        w="6px"
        h="6px"
        borderRadius="full"
        bg={up ? colors.accent.money : colors.text.muted}
        sx={{
          '@keyframes chipTick': {
            from: { transform: 'scale(1.9)', opacity: 1 },
            to: { transform: 'scale(1)', opacity: 0.85 },
          },
          animation: `chipTick 700ms ${EASE}`,
        }}
      />
      <Text fontFamily="mono" fontSize="11px" letterSpacing="0.06em" color={colors.text.primary}>
        NEONBURRO {money(price)}
      </Text>
    </Box>
  );
};

export default TokenChip;
