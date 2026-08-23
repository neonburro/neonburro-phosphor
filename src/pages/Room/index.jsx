// src/pages/Room/index.jsx
//
// The room, first cut. Empty walls said plainly, the holder's handle on the
// title, epoch at the desk with one line. The threads, the sigils and epoch's
// actual voice arrive in their own commits, this page is the proof that the
// door, the steps and the gate hold hands.
//
// The gate here is soft, useHolder sends anybody who is out or under back to
// the door. The hard gate is row level security on every table the room will
// read, which does not exist to be argued with.
//
// No oxford commas, no em dashes.

import { useEffect } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, TILE } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { signOut } from '../../lib/wallet';
import { t } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Room = () => {
  const nav = useNavigate();
  const holder = useHolder();

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (holder.state !== 'in') {
    return (
      <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>
    );
  }

  const leave = async () => { await signOut(); nav('/'); };

  return (
    <VStack flex="1" align="stretch" px={RAIL} pt={10} pb={16} spacing={8} maxW="900px">
      <VStack align="start" spacing={3}>
        <Text {...kicker} color={colors.accent.signal}>{t('room_kicker')}</Text>
        <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '30px', md: '40px' }} letterSpacing="-0.02em" color={colors.text.primary}>
          {t('room_title', { handle: holder.holder?.handle || '' })}
        </Text>
        <Text fontSize="15px" color={colors.text.secondary}>{t('room_empty')}</Text>
      </VStack>

      <Box bg={TILE.bg} backdropFilter={TILE.blur} boxShadow={TILE.shadow} borderRadius="20px" p={6} border="1px solid" borderColor={TILE.border} maxW="560px">
        <VStack align="start" spacing={2}>
          <HStack spacing={2.5}>
            <Box w="8px" h="8px" borderRadius="full" bg={colors.accent.signal} boxShadow={`0 0 8px ${colors.accent.signalAlpha[32]}`} />
            <Text {...kicker} color={colors.text.muted}>{t('room_epoch')}</Text>
          </HStack>
          <Text fontSize="15px" lineHeight="1.7" color={colors.text.secondary}>{t('room_epoch_line')}</Text>
        </VStack>
      </Box>

      <Box>
        <Button variant="ghost" size="sm" onClick={leave}>{t('room_leave')}</Button>
      </Box>
    </VStack>
  );
};

export default Room;
