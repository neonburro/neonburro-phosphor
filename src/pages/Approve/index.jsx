// src/pages/Approve/index.jsx
//
// The phone's half of the handoff. A signed in holder lands here from the QR
// on somebody's walletless screen, usually their own laptop, sees one plain
// question and one button, and taps. The other screen is polling and walks
// itself in. Nothing here shows a wallet, moves a token or asks a question a
// person cannot answer in one second.
//
// A visitor who is not signed in or not eligible is sent to the door first,
// the handoff never becomes a side entrance.
//
// No oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, MEASURE } from '../../theme/layout';
import { supabase } from '../../lib/supabase';
import { useHolder } from '../../lib/holder';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Approve = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const nonce = params.get('n');
  const holder = useHolder();
  const [state, setState] = useState('asking');

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async () => {
    if (!supabase || !nonce) return;
    setState('working');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    try {
      const res = await fetch('/.netlify/functions/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'approve', nonce }),
      });
      const j = await res.json();
      setState(j.ok && j.approved ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  return (
    <VStack flex="1" justify="center" align="stretch" px={RAIL} pb={24}>
      <VStack align="start" spacing={6} maxW={MEASURE} w="100%">
        <Text {...kicker} color={colors.accent.signal}>the other screen</Text>
        {state === 'done' ? (
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '28px', md: '38px' }} letterSpacing="-0.02em" color={colors.text.primary}>
            it is in. you can close this.
          </Text>
        ) : (
          <>
            <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '28px', md: '38px' }} letterSpacing="-0.02em" color={colors.text.primary}>
              let your other screen in?
            </Text>
            <Text fontSize="15px" lineHeight="1.7" color={colors.text.secondary}>
              a screen with no wallet is asking to be you in the stacks. only say yes if that screen is yours.
            </Text>
            {state === 'failed' && (
              <Text fontFamily="mono" fontSize="13px" color={colors.text.primary} borderLeft="2px solid" borderColor={colors.accent.signal} pl={4}>
                that did not take. the code may have expired, start again on the other screen.
              </Text>
            )}
            <Button size="lg" onClick={approve} isLoading={state === 'working'} isDisabled={!nonce}>
              yes, let it in
            </Button>
            <Box as="button" type="button" onClick={() => nav('/room/')} style={{ background: 'none' }}>
              <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>no, take me to the room</Text>
            </Box>
          </>
        )}
      </VStack>
    </VStack>
  );
};

export default Approve;
