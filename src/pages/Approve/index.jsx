// src/pages/Approve/index.jsx
//
// The phone's half of the desktop handoff. The QR contains only a public
// request nonce. It never contains the desktop's claim secret, an auth token
// or a wallet address. A signed in holder sees one explicit consent question,
// checks the same short public code shown on the desktop and approves.
//
// A signed out phone carries one canonical local /approve/ return path through
// the door. The path is generated from a validated UUID and never enters web
// storage. The door validates it again before navigating. A quiet holder check
// fails closed with an explicit retry screen. Only a verified in state can
// render the approval action.
//
// No Oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, MEASURE } from '../../theme/layout';
import { supabase } from '../../lib/supabase';
import { useHolder } from '../../lib/holder';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

// This is a visual mixup check, not a credential. The contract test keeps the
// identical derivation on the desktop door.
const handoffCode = (nonce) => String(nonce || '').replaceAll('-', '').slice(-4).toUpperCase();

const approvePath = (nonce) => {
  const value = String(nonce || '');
  if (!UUID.test(value)) return null;
  return `/approve/?n=${encodeURIComponent(value.toLowerCase())}`;
};

const Approve = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const nonce = params.get('n');
  const returnPath = approvePath(nonce);
  const doorPath = returnPath ? `/?return=${encodeURIComponent(returnPath)}` : '/';
  const validNonce = Boolean(returnPath);
  const code = validNonce ? handoffCode(nonce) : null;
  const holder = useHolder();
  const [state, setState] = useState(validNonce ? 'asking' : 'failed');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (holder.state !== 'out' && holder.state !== 'under') return;
    nav(doorPath, { replace: true });
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const retryHolderCheck = async () => {
    setRetrying(true);
    try {
      await holder.refresh();
    } finally {
      setRetrying(false);
    }
  };

  const approve = async () => {
    if (!supabase || !validNonce || holder.state !== 'in') {
      setState('failed');
      return;
    }
    setState('working');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      setState('failed');
      return;
    }
    try {
      const response = await fetch('/.netlify/functions/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'approve', nonce }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
      const result = await response.json();
      if (response.ok && result.ok && result.approved) {
        setState('done');
        window.history.replaceState(window.history.state, '', '/approve/');
        return;
      }
      setState('failed');
    } catch {
      setState('failed');
    }
  };

  const holderUnavailable = holder.state === 'quiet'
    || !['loading', 'out', 'under', 'in'].includes(holder.state);

  if (holderUnavailable) {
    return (
      <VStack flex="1" justify="center" align="stretch" px={RAIL} pb={24}>
        <VStack align="start" spacing={6} maxW={MEASURE} w="100%">
          <Text {...kicker} color={colors.accent.signal}>verification paused</Text>
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '28px', md: '38px' }} letterSpacing="-0.02em" color={colors.text.primary}>
            this phone could not verify the door.
          </Text>
          <Text fontSize="15px" lineHeight="1.7" color={colors.text.secondary}>
            nothing was approved. keep the other screen open, then try the holder check again or return through the door.
          </Text>
          <Button size="lg" onClick={retryHolderCheck} isLoading={retrying} loadingText="checking...">
            try verification again
          </Button>
          <Box as="button" type="button" onClick={() => nav(doorPath, { replace: true })} style={{ background: 'none' }}>
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>back to the door</Text>
          </Box>
        </VStack>
      </VStack>
    );
  }

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
            {code && (
              <HStack spacing={3} aria-label={`match code ${code}`}>
                <Text fontFamily="mono" fontSize="11px" color={colors.text.muted}>match the desktop</Text>
                <Text fontFamily="mono" fontSize="14px" fontWeight="600" letterSpacing="0.18em" color={colors.text.primary}
                  border="1px solid" borderColor={colors.surface.lineStrong} borderRadius="10px 10px 3px 10px" px={3} py={1.5}>
                  {code}
                </Text>
              </HStack>
            )}
            {state === 'failed' && (
              <Text fontFamily="mono" fontSize="13px" color={colors.text.primary} borderLeft="2px solid" borderColor={colors.accent.signal} pl={4}>
                that did not take. the request may have expired, start again on the other screen.
              </Text>
            )}
            <Button size="lg" onClick={approve} isLoading={state === 'working'} isDisabled={!validNonce}>
              yes, let it in
            </Button>
            <Box as="button" type="button" onClick={() => nav('/burro/')} style={{ background: 'none' }}>
              <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>no, take me to my burro</Text>
            </Box>
          </>
        )}
      </VStack>
    </VStack>
  );
};

export default Approve;
