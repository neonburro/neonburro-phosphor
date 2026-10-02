// src/pages/Hello/CharacterHello.jsx
//
// The first reveal after wallet verification. The server allocates one durable
// assignment from the reviewed pool. The visitor cannot reroll identity and a
// missing approved portrait becomes a recorded pending state rather than a
// fabricated character.
//
// No Oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL } from '../../theme/layout';
import { LANGS, currentLang, setLang } from '../../data/copy';
import { holderHome } from '../../lib/holderHome';
import { useHolder } from '../../lib/holder';

const asset = (path) => path && (/^https?:\/\//i.test(path) ? path : `https://neonburro.com${path.startsWith('/') ? path : `/${path}`}`);

const CharacterHello = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [lang, setPick] = useState(currentLang());
  const [state, setState] = useState('loading');
  const [home, setHome] = useState(null);

  useEffect(() => {
    holderHome('ensure').then((result) => {
      if (!result.ok) {
        setState(result.reason || 'quiet');
        return;
      }
      setHome(result.home);
      setState('ready');
      if (result.home.character?.approved_name && !holder.holder?.handle) holder.refresh();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enter = async () => {
    setLang(lang);
    await holder.refresh({ lang });
    nav('/burro/');
  };

  if (state !== 'ready') {
    return (
      <VStack flex="1" justify="center" spacing={4} px={RAIL} textAlign="center">
        <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>{state === 'fitting' ? 'the permanent character record is waiting for its reviewed migration.' : 'opening your place...'}</Text>
        {state !== 'loading' && <Button onClick={() => nav('/')}>Back to the door</Button>}
      </VStack>
    );
  }

  const character = home.character;
  return (
    <VStack flex="1" align="stretch" px={RAIL} pt={{ base: 8, md: 12 }} pb={24} spacing={6} maxW="900px">
      <Text fontFamily="mono" fontSize="10px" fontWeight="500" letterSpacing="0.2em" textTransform="uppercase" color={colors.accent.signal}>wallet verified</Text>
      <Box border="1px solid" borderColor={colors.surface.line} borderRadius="22px 22px 6px 22px" overflow="hidden" bg={colors.surface.raised}>
        {character ? (
          <Box as="img" src={asset(character.portrait_path)} alt={`${character.approved_name}, your Neon Burro`} w="100%" h={{ base: '420px', md: '560px' }} objectFit="cover" objectPosition="center top" />
        ) : (
          <Box h={{ base: '360px', md: '480px' }} display="grid" placeItems="center" bg="radial-gradient(circle at 50% 40%, rgba(197,217,87,0.14), transparent 32%), #101012">
            <Text fontFamily="mono" fontSize="12px" color={colors.text.secondary}>approved portrait pending</Text>
          </Box>
        )}
        <VStack align="start" spacing={2} p={{ base: 5, md: 7 }}>
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '30px', md: '42px' }} letterSpacing="-0.04em" color={colors.text.primary}>{character?.approved_name || 'Your place is held.'}</Text>
          <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>{character?.purpose_archetype || 'Ion and Lyra are preparing the reviewed holder set. Your wallet already has a permanent assignment record and it will not be recycled.'}</Text>
        </VStack>
      </Box>
      <VStack align="start" spacing={3}>
        <Text fontFamily="mono" fontSize="10px" letterSpacing="0.2em" textTransform="uppercase" color={colors.text.muted}>language</Text>
        <HStack spacing={2} flexWrap="wrap">
          {LANGS.map((option) => <Button key={option.id} variant={lang === option.id ? 'solid' : 'outline'} size="sm" onClick={() => setPick(option.id)}>{option.label}</Button>)}
        </HStack>
      </VStack>
      <Button size="lg" alignSelf="flex-start" onClick={enter}>Open my Burro</Button>
    </VStack>
  );
};

export default CharacterHello;
