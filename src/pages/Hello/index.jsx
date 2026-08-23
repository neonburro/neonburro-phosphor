// src/pages/Hello/index.jsx
//
// The three steps, once, after the first signature. A name, the wallet, the
// check. Tyler's spec: three questions, click through, nothing to type. The
// name is ASSIGNED, a word and two digits from data/handles.js, reroll until
// one fits, never changes after. The language picked here follows the holder
// everywhere. The avatar comes later from Tyler's directory of thousands, the
// row stores a slot for it today.
//
// The handle is claimed server side by holder-check.js with a patch body, and
// a collision answers with taken:true so this page rerolls quietly. Two people
// rolling marmot-07 in the same minute both leave with a name and neither sees
// an error, which is the whole ambition of this page.
//
// No oxford commas, no em dashes.

import { useEffect, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { RAIL, MEASURE } from '../../theme/layout';
import { propose } from '../../data/handles';
import { LANGS, currentLang, setLang, t } from '../../data/copy';
import { useHolder } from '../../lib/holder';
import { addressOf, short } from '../../lib/wallet';
import { supabase } from '../../lib/supabase';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };

const Hello = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(propose());
  const [lang, setPick] = useState(currentLang());
  const [addr, setAddr] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setAddr(addressOf(data?.user)));
  }, []);

  useEffect(() => {
    if (holder.state === 'out') nav('/');
    if (holder.state === 'in' && holder.holder?.handle) nav('/room/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const claim = async () => {
    setClaiming(true);
    setLang(lang);
    const r = await holder.refresh({ handle, lang });
    setClaiming(false);
    if (r.holder?.taken) { setHandle(propose()); return; }
    if (r.state === 'in') nav('/room/');
    if (r.state === 'under') nav('/');
  };

  const steps = [
    {
      title: t('hello_name'),
      line: t('hello_name_line'),
      body: (
        <HStack spacing={4}>
          <Text fontFamily="mono" fontSize={{ base: '28px', md: '36px' }} fontWeight="600" color={colors.accent.signal}>{handle}</Text>
          <Button variant="outline" size="sm" onClick={() => setHandle(propose())}>{t('hello_reroll')}</Button>
        </HStack>
      ),
    },
    {
      title: t('hello_lang'),
      line: '',
      body: (
        <HStack spacing={3} flexWrap="wrap">
          {LANGS.map((l) => (
            <Button key={l.id} variant={lang === l.id ? 'solid' : 'outline'} size="sm" onClick={() => setPick(l.id)}>{l.label}</Button>
          ))}
        </HStack>
      ),
    },
    {
      title: t('hello_wallet'),
      line: t('hello_wallet_line'),
      body: addr ? (
        <HStack spacing={2} px={3} py={2} borderRadius="full" border="1px solid" borderColor={colors.accent.chainAlpha[32]} bg={colors.accent.chainAlpha[8]} w="fit-content">
          <Box w="5px" h="5px" borderRadius="full" bg={colors.accent.chain} />
          <Text fontFamily="mono" fontSize="13px" color={colors.text.primary}>{short(addr)}</Text>
        </HStack>
      ) : <Text fontFamily="mono" fontSize="13px" color={colors.text.muted}>...</Text>,
    },
  ];

  const last = step === steps.length - 1;
  const s = steps[step];

  return (
    <VStack flex="1" justify="center" align="stretch" px={RAIL} pb={24}>
      <VStack align="start" spacing={6} maxW={MEASURE} w="100%">
        <Text {...kicker} color={colors.accent.signal}>{t('hello_kicker')} · {step + 1}/3</Text>
        <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '28px', md: '38px' }} letterSpacing="-0.02em" color={colors.text.primary}>{s.title}</Text>
        {s.line && <Text fontSize="15px" lineHeight="1.7" color={colors.text.secondary}>{s.line}</Text>}
        <Box py={2}>{s.body}</Box>
        <Button size="lg" isLoading={claiming} onClick={() => (last ? claim() : setStep(step + 1))}>
          {last ? t('hello_enter') : t('hello_next')}
        </Button>
      </VStack>
    </VStack>
  );
};

export default Hello;
