// src/components/HolderGate.jsx
//
// One protected-route boundary for every holder surface. Individual pages no
// longer need to invent their own loading, signed-out, under-line or quiet
// behavior. The browser redirect is only the courtesy gate. Database row level
// security remains the authority underneath it.
//
// No Oxford commas, no em dashes.

import { Button, Text, VStack } from '@chakra-ui/react';
import { Navigate, Outlet } from 'react-router-dom';
import { useHolder } from '../lib/holder';
import colors from '../theme/colors';

const HolderGate = () => {
  const holder = useHolder();
  if (holder.state === 'loading') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>checking the chain...</Text></VStack>;
  }
  if (holder.state === 'out' || holder.state === 'under' || holder.state === 'stale') return <Navigate to="/" replace />;
  if (holder.state === 'quiet') {
    return (
      <VStack flex="1" justify="center" spacing={4} px={5} textAlign="center">
        <Text fontFamily="heading" fontWeight="600" fontSize="22px" color={colors.text.primary}>The door could not finish the check.</Text>
        <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>Nothing changed. Try the chain again.</Text>
        <Button onClick={() => holder.refresh()}>Try again</Button>
      </VStack>
    );
  }
  return <Outlet />;
};

export default HolderGate;
