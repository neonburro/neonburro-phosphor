// src/pages/Tools/index.jsx
// SENTINEL: NB_PHOSPHOR_TOOLS_PAGE_V1
//
// The operating map for a holder. Tools shows what Phosphor can observe, what
// it may prepare and where a human signature remains mandatory. Wallet roles
// sit below the systems so market activity always has a named purpose and a
// public address.
//
// This first version is read-only. It reads two health signals and local public
// catalog data. It never opens a transaction, changes a setting or handles a
// secret. Wire it into App and Shell only after the current service navigation
// work is reconciled.
//
// No oxford commas, no em dashes. No dollar figures.

import { useEffect, useState } from 'react';
import { Box, Grid, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiDatabase,
  FiEdit3,
  FiEye,
  FiLayers,
  FiLink,
  FiPocket,
  FiRadio,
  FiTool,
} from 'react-icons/fi';
import colors from '../../theme/colors';
import { EASE, RAIL } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { PROPOSAL_STATES, TOOLS, WALLET_ROLES } from '../../data/tools';

const HEALTH_ENDPOINT = '/.netlify/functions/tools-health';

const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const ICONS = {
  activity: FiActivity,
  database: FiDatabase,
  eye: FiEye,
  layers: FiLayers,
  link: FiLink,
  pocket: FiPocket,
  prepare: FiEdit3,
  radio: FiRadio,
  service: FiActivity,
  tool: FiTool,
};

const short = (address) => `${address.slice(0, 5)}...${address.slice(-5)}`;

const healthColor = (state) => {
  if (state === 'healthy') return colors.accent.signal;
  if (state === 'degraded') return colors.accent.money;
  return colors.text.muted;
};

const ToolCard = ({ tool, health }) => {
  const state = tool.healthKey ? health?.checks?.[tool.healthKey] || 'checking' : 'manual';
  return (
    <VStack
      align="stretch"
      spacing={4}
      p={5}
      minH="216px"
      border="1px solid"
      borderColor={colors.surface.line}
      borderRadius="18px"
      bg={colors.surface.raised}
      transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`}
      _hover={{ borderColor: colors.surface.lineStrong, transform: 'translateY(-2px)' }}
      sx={{ '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } }}
    >
      <HStack justify="space-between" align="start">
        <Box
          w="38px"
          h="38px"
          display="grid"
          placeItems="center"
          borderRadius="12px"
          bg={colors.accent.signalAlpha[8]}
          color={colors.accent.signal}
        >
          <Icon as={ICONS[tool.icon] || FiTool} boxSize="17px" />
        </Box>
        <HStack spacing={2}>
          <Box w="6px" h="6px" borderRadius="full" bg={healthColor(state)} />
          <Text fontFamily="mono" fontSize="9px" color={colors.text.muted}>{state}</Text>
        </HStack>
      </HStack>

      <VStack align="start" spacing={2} flex="1">
        <Text fontFamily="heading" fontWeight="600" fontSize="18px" color={colors.text.primary}>
          {tool.name}
        </Text>
        <Text fontFamily="mono" fontSize="11px" lineHeight="1.75" color={colors.text.secondary}>
          {tool.line}
        </Text>
      </VStack>

      <Text {...kicker} color={tool.access === 'human sign' ? colors.accent.chain : colors.text.muted}>
        {tool.access}
      </Text>
    </VStack>
  );
};

const WalletRole = ({ wallet }) => (
  <VStack
    align="stretch"
    spacing={3}
    px={{ base: 4, md: 5 }}
    py={4}
    borderTop="1px solid"
    borderColor={colors.surface.line}
  >
    <HStack justify="space-between" align="start" spacing={4}>
      <Box>
        <Text fontFamily="heading" fontWeight="600" fontSize="16px" color={colors.text.primary}>
          {wallet.name}
        </Text>
        <Box
          as="a"
          href={`https://solscan.io/account/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          fontFamily="mono"
          fontSize="10px"
          color={colors.accent.chain}
          _hover={{ color: colors.text.primary }}
        >
          {short(wallet.address)}
        </Box>
      </Box>
      <Text {...kicker} color={colors.text.muted} textAlign="right">public role</Text>
    </HStack>

    <Text fontFamily="mono" fontSize="11px" lineHeight="1.7" color={colors.text.secondary}>
      {wallet.purpose}
    </Text>

    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
      <Box p={3} borderRadius="12px" bg={colors.surface.sunken}>
        <Text {...kicker} color={colors.accent.signal} mb={1}>automatic</Text>
        <Text fontFamily="mono" fontSize="10px" color={colors.text.secondary}>{wallet.automatic}</Text>
      </Box>
      <Box p={3} borderRadius="12px" bg={colors.surface.sunken}>
        <Text {...kicker} color={colors.accent.chain} mb={1}>human only</Text>
        <Text fontFamily="mono" fontSize="10px" color={colors.text.secondary}>{wallet.human}</Text>
      </Box>
    </Grid>
  </VStack>
);

const Tools = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (holder.state !== 'in') return;
    let live = true;
    fetch(HEALTH_ENDPOINT)
      .then((response) => response.json())
      .then((payload) => { if (live && payload?.ok) setHealth(payload); })
      .catch(() => {});
    return () => { live = false; };
  }, [holder.state]);

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  return (
    <Box flex="1" overflowY="auto">
      <VStack
        align="stretch"
        spacing={{ base: 9, md: 12 }}
        px={RAIL}
        pt={{ base: 8, md: 12 }}
        pb={28}
        maxW="1180px"
      >
        <VStack align="start" spacing={3} maxW="700px">
          <Text {...kicker} color={colors.accent.signal}>tools</Text>
          <Text
            fontFamily="heading"
            fontWeight="600"
            fontSize={{ base: '30px', md: '42px' }}
            letterSpacing="-0.035em"
            color={colors.text.primary}
          >
            machines observe. people move value.
          </Text>
          <Text fontFamily="mono" fontSize="12px" lineHeight="1.8" color={colors.text.secondary}>
            the systems, wallets and limits behind phosphor. a green light means a tool answered. it is never permission to spend.
          </Text>
          {health?.checkedAt && (
            <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>
              checked {new Date(health.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </VStack>

        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }} gap={4}>
          {TOOLS.map((tool) => <ToolCard key={tool.slug} tool={tool} health={health} />)}
        </Grid>

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text {...kicker} color={colors.text.muted} mb={2}>the handoff</Text>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '22px', md: '28px' }} color={colors.text.primary}>
              every movement leaves a state.
            </Text>
          </Box>
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(7, 1fr)' }} gap={2}>
            {PROPOSAL_STATES.map((state, index) => (
              <Box
                key={state}
                p={3}
                minH="70px"
                borderRadius="12px"
                bg={index < 2 ? colors.accent.signalAlpha[8] : colors.surface.raised}
                border="1px solid"
                borderColor={index < 2 ? colors.accent.signalAlpha[32] : colors.surface.line}
              >
                <Text fontFamily="mono" fontSize="9px" color={colors.text.muted}>{String(index + 1).padStart(2, '0')}</Text>
                <Text fontFamily="mono" fontSize="10px" color={colors.text.primary} mt={1}>{state}</Text>
              </Box>
            ))}
          </Grid>
          <Text fontFamily="mono" fontSize="11px" color={colors.text.muted}>
            automation stops after proposed. approval and signature belong to a person.
          </Text>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text {...kicker} color={colors.text.muted} mb={2}>wallet roles</Text>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '22px', md: '28px' }} color={colors.text.primary}>
              one address. one job.
            </Text>
          </Box>
          <Box border="1px solid" borderColor={colors.surface.line} borderRadius="18px" bg={colors.surface.raised} overflow="hidden">
            {WALLET_ROLES.map((wallet) => <WalletRole key={wallet.slug} wallet={wallet} />)}
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};

export default Tools;
