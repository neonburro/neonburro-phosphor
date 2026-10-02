// src/pages/Services/Loop.jsx
//
// The holder service directory. Every card is the service's real external link
// preview rather than an invented internal tile. The first service accepts an
// opaque holder link. Its three counters stay deliberately separate: opens,
// attached orders and Stripe-verified live purchases.
//
// This page never calls a checkout, claims earnings or offers a payout. The
// paid custom brand kit remains held on the studio until its delivery gate is
// approved. No Oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { Box, Button, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import { FiCopy, FiExternalLink } from 'react-icons/fi';
import colors from '../../theme/colors';
import { EASE, RAIL } from '../../theme/layout';
import { holderHome } from '../../lib/holderHome';
import { SERVICE_DIRECTORY } from '../../data/serviceDirectory';

const CORNER = '20px 20px 5px 20px';
const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const ServiceCard = ({ service, href }) => (
  <Box
    as="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    display="block"
    border="1px solid"
    borderColor={colors.surface.line}
    borderRadius={CORNER}
    overflow="hidden"
    bg={colors.surface.raised}
    transition={`transform 220ms ${EASE}, border-color 220ms ${EASE}`}
    _hover={{ transform: 'translateY(-3px)', borderColor: colors.surface.lineStrong, textDecoration: 'none' }}
    sx={{ '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } }}
  >
    <Box as="img" src={service.image} alt="" loading="lazy" decoding="async" w="100%" aspectRatio="1200 / 630" objectFit="cover" />
    <VStack align="start" spacing={2} p={{ base: 4, md: 5 }}>
      <HStack w="100%" justify="space-between" align="start" spacing={3}>
        <Text {...kicker} color={service.referral ? colors.accent.signal : colors.text.muted}>{service.name}</Text>
        <FiExternalLink size={15} color={colors.text.muted} />
      </HStack>
      <Text fontFamily="heading" fontWeight="600" fontSize="19px" lineHeight="1.25" color={colors.text.primary}>{service.title}</Text>
      <Text fontFamily="mono" fontSize="11px" lineHeight="1.7" color={colors.text.secondary}>{service.description}</Text>
    </VStack>
  </Box>
);

const LoopServices = () => {
  const [home, setHome] = useState(null);
  const [state, setState] = useState('loading');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setState('loading');
    const result = await holderHome('ensure');
    if (!result.ok) {
      setState(result.reason || 'quiet');
      return;
    }
    setHome(result.home);
    setState('ready');
  };

  useEffect(() => { load(); }, []);

  if (state !== 'ready') {
    return (
      <VStack flex="1" justify="center" spacing={4} px={RAIL}>
        <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>{state === 'fitting' ? 'the holder link ledger is waiting for its reviewed migration.' : 'opening the service hall...'}</Text>
        {state !== 'loading' && <Button onClick={load}>Try again</Button>}
      </VStack>
    );
  }

  const link = home?.referral?.link;
  const summary = home?.referral?.summary || {};
  const copy = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* the visible url remains selectable */ }
  };

  return (
    <Box flex="1" overflowY="auto">
      <VStack align="stretch" spacing={{ base: 9, md: 12 }} px={RAIL} pt={{ base: 8, md: 12 }} pb={28} maxW="1240px">
        <VStack align="start" spacing={3} maxW="780px">
          <Text {...kicker} color={colors.accent.signal}>service links</Text>
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '34px', md: '52px' }} lineHeight="1.02" letterSpacing="-0.045em" color={colors.text.primary}>Useful work people can pass along.</Text>
          <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>A free result leads to one of three clear choices. The work remains supervised. Payment proof remains server verified. Every card below is the same link preview somebody sees when you share it.</Text>
        </VStack>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap={3}>
          {[
            ['link opens', summary.traffic_count],
            ['orders attached', summary.attached_order_count],
            ['verified purchases', summary.confirmed_purchase_count],
          ].map(([label, value]) => (
            <VStack key={label} align="start" spacing={1} p={4} border="1px solid" borderColor={colors.surface.line} borderRadius={CORNER} bg={colors.surface.raised}>
              <Text {...kicker} color={colors.text.muted}>{label}</Text>
              <Text fontFamily="mono" fontSize="24px" fontWeight="600" color={colors.text.primary}>{Number(value || 0).toLocaleString('en-US')}</Text>
            </VStack>
          ))}
        </Grid>

        {link?.url && (
          <VStack align="stretch" spacing={3} p={{ base: 4, md: 5 }} border="1px solid" borderColor={colors.accent.signalAlpha[32]} borderRadius={CORNER} bg={colors.accent.signalAlpha[8]}>
            <HStack justify="space-between" align="start" spacing={4}>
              <VStack align="start" spacing={1} minW={0}>
                <Text {...kicker} color={colors.accent.signal}>your custom brand kit link</Text>
                <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary} isTruncated maxW="100%">{link.url}</Text>
              </VStack>
              <Box as="button" type="button" onClick={copy} aria-label="Copy holder service link" w="44px" h="44px" flexShrink={0} display="grid" placeItems="center" borderRadius="14px 14px 4px 14px" border="1px solid" borderColor={colors.surface.lineStrong} color={colors.text.primary} _hover={{ borderColor: colors.accent.signal }}>
                <FiCopy size={17} />
              </Box>
            </HStack>
            <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>{copied ? 'copied' : 'The code names the link, never your wallet or contact details.'}</Text>
          </VStack>
        )}

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }} gap={4}>
          {SERVICE_DIRECTORY.map((service) => (
            <ServiceCard key={service.id} service={service} href={service.referral && link?.url ? link.url : service.href} />
          ))}
        </Grid>

        <Text fontFamily="mono" fontSize="11px" lineHeight="1.7" color={colors.text.muted} maxW="760px" borderLeft="2px solid" borderColor={colors.accent.signal} pl={3}>
          No reward balance is shown because no settlement rule has been approved. Referrals currently prove traffic and live purchases only. Pulse reviews the service work. A human signs any future payout or treasury action.
        </Text>
      </VStack>
    </Box>
  );
};

export default LoopServices;
