// src/pages/Services/index.jsx
// SENTINEL: NB_PHOSPHOR_SERVICE_HALL_V1
//
// The holder service hall. The shelf is local and honest, so it renders before
// the shared service migration exists. The connected wallet's runs and receipt
// events come from Supabase when those tables are present. A missing table is a
// quiet fitting state, never an invented empty success.
//
// The browser filters by the wallet returned from holder-check and RLS must
// repeat that isolation in the database. This page never asks for a signature,
// moves an asset or displays another payer's row.
//
// No oxford commas, no em dashes. No dollar figures.

import { useEffect, useMemo, useState } from 'react';
import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';
import { EASE, RAIL } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { supabase } from '../../lib/supabase';
import { currentLang } from '../../data/copy';
import { SERVICES, serviceText, words } from '../../data/services';

const kicker = {
  fontFamily: 'mono',
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const shortSignature = (value) => (value ? `${value.slice(0, 6)}...${value.slice(-6)}` : '');

const date = (value, lang) => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return null;
  }
};

const ServiceCard = ({ service, lang, copy, onOpen }) => (
  <VStack
    align="stretch"
    spacing={4}
    p={{ base: 5, md: 6 }}
    minH="300px"
    border="1px solid"
    borderColor={colors.surface.line}
    borderRadius="18px"
    bg={colors.surface.raised}
    transition={`border-color 220ms ${EASE}, transform 220ms ${EASE}`}
    _hover={{ borderColor: colors.surface.lineStrong, transform: 'translateY(-2px)' }}
    sx={{ '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } }}
  >
    <HStack justify="space-between" align="start" spacing={4}>
      <Text {...kicker} color={colors.accent.signal}>{service.owner}</Text>
      <Text fontFamily="mono" fontSize="9px" letterSpacing="0.12em" textTransform="uppercase" color={colors.text.muted}>
        {copy[service.stage]}
      </Text>
    </HStack>

    <VStack align="start" spacing={2} flex="1">
      <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '20px', md: '22px' }} color={colors.text.primary}>
        {serviceText(service.title, lang)}
      </Text>
      <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>
        {serviceText(service.line, lang)}
      </Text>
    </VStack>

    <VStack align="stretch" spacing={2.5}>
      <Box>
        <Text {...kicker} color={colors.text.muted} mb={1}>{copy.proof}</Text>
        <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary}>{serviceText(service.proof, lang)}</Text>
      </Box>
      <Box>
        <Text {...kicker} color={colors.text.muted} mb={1}>{copy.rails}</Text>
        <Text fontFamily="mono" fontSize="11px" color={colors.accent.money}>{service.rails.join(' • ')}</Text>
      </Box>
    </VStack>

    <Box
      as="button"
      type="button"
      onClick={() => onOpen(service)}
      alignSelf="flex-start"
      px={5}
      h="40px"
      borderRadius="full"
      bg={colors.text.primary}
      color={colors.text.inverse}
      fontFamily="heading"
      fontWeight="600"
      fontSize="14px"
      transition={`background 220ms ${EASE}, transform 220ms ${EASE}`}
      _hover={{ bg: colors.accent.signal, transform: 'translateY(-1px)' }}
    >
      {service.slug === 'phosphor-day' ? copy.open : copy.ask}
    </Box>
  </VStack>
);

const ReceiptLine = ({ event }) => (
  <HStack py={2.5} spacing={3} borderTop="1px solid" borderColor={colors.surface.line} align="start">
    <Box w="6px" h="6px" borderRadius="full" bg={event.signature ? colors.accent.chain : colors.text.muted} mt={1.5} flexShrink={0} />
    <VStack align="start" spacing={0.5} flex="1" minW={0}>
      <Text fontFamily="mono" fontSize="11px" color={colors.text.secondary}>{event.public_note || event.category}</Text>
      {event.signature && (
        <Box as="a" href={`https://solscan.io/tx/${event.signature}`} target="_blank" rel="noopener noreferrer" fontFamily="mono" fontSize="10px" color={colors.accent.chain} _hover={{ color: colors.text.primary }}>
          {shortSignature(event.signature)}
        </Box>
      )}
    </VStack>
    {event.asset && event.amount != null && (
      <Text fontFamily="mono" fontSize="11px" color={colors.accent.money} flexShrink={0}>
        {Number(event.amount).toLocaleString()} {event.asset}
      </Text>
    )}
  </HStack>
);

const RunCard = ({ run, events, lang, copy }) => {
  const service = SERVICES.find((item) => item.slug === run.service_slug);
  const title = service ? serviceText(service.title, lang) : run.service_slug;
  return (
    <Box border="1px solid" borderColor={colors.surface.line} borderRadius="16px" bg={colors.surface.raised} px={{ base: 4, md: 5 }} py={4}>
      <HStack justify="space-between" align="start" spacing={4}>
        <VStack align="start" spacing={1}>
          <Text fontFamily="heading" fontWeight="600" fontSize="16px" color={colors.text.primary}>{title}</Text>
          <Text fontFamily="mono" fontSize="10px" color={colors.text.muted}>
            {date(run.created_at, lang)}{run.owner_slug ? ` • ${run.owner_slug}` : ''}
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Box w="6px" h="6px" borderRadius="full" bg={run.status === 'completed' ? colors.accent.signal : colors.accent.money} />
          <Text fontFamily="mono" fontSize="10px" color={colors.text.secondary}>{run.status || copy.waiting}</Text>
        </HStack>
      </HStack>

      {run.rail && (
        <Text fontFamily="mono" fontSize="11px" color={colors.accent.money} mt={3}>
          {run.amount_token != null ? `${Number(run.amount_token).toLocaleString()} ` : ''}{run.rail}
        </Text>
      )}

      {(events || []).map((event) => <ReceiptLine key={event.id} event={event} />)}

      {run.artifact_url && (
        <Box as="a" href={run.artifact_url} target="_blank" rel="noopener noreferrer" display="inline-block" mt={3} fontFamily="mono" fontSize="11px" color={colors.accent.signal} _hover={{ color: colors.text.primary }}>
          {copy.receipt} →
        </Box>
      )}
    </Box>
  );
};

const Services = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const lang = currentLang();
  const copy = words(lang);
  const [runs, setRuns] = useState(null);
  const [events, setEvents] = useState([]);
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (holder.state !== 'in' || !holder.wallet || !supabase) return;
    let live = true;

    const pull = async () => {
      const result = await supabase
        .from('service_runs')
        .select('id,service_slug,owner_slug,rail,amount_token,payer_wallet,status,due_at,artifact_url,proof,created_at')
        .eq('payer_wallet', holder.wallet)
        .order('created_at', { ascending: false });

      if (!live) return;
      if (result.error) {
        setQuiet(true);
        setRuns([]);
        return;
      }

      const nextRuns = result.data || [];
      setRuns(nextRuns);
      if (!nextRuns.length) return;

      const eventResult = await supabase
        .from('service_events')
        .select('id,run_id,category,amount,asset,signature,public_note,reconciled_at,created_at')
        .in('run_id', nextRuns.map((run) => run.id))
        .order('created_at', { ascending: true });

      if (!live) return;
      if (!eventResult.error) setEvents(eventResult.data || []);
    };

    pull();
    return () => { live = false; };
  }, [holder.state, holder.wallet]);

  const byRun = useMemo(() => events.reduce((grouped, event) => {
    if (!grouped[event.run_id]) grouped[event.run_id] = [];
    grouped[event.run_id].push(event);
    return grouped;
  }, {}), [events]);

  const open = (service) => {
    if (service.href.startsWith('/')) nav(service.href);
    else window.location.assign(service.href);
  };

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  return (
    <Box flex="1" overflowY="auto">
      <VStack align="stretch" spacing={{ base: 9, md: 12 }} px={RAIL} pt={{ base: 8, md: 12 }} pb={28} maxW="1180px">
        <VStack align="start" spacing={3} maxW="680px">
          <Text {...kicker} color={colors.accent.signal}>{copy.kicker}</Text>
          <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '30px', md: '42px' }} letterSpacing="-0.035em" color={colors.text.primary}>
            {copy.title}
          </Text>
          <Text fontFamily="mono" fontSize="12px" lineHeight="1.75" color={colors.text.secondary}>{copy.line}</Text>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Text {...kicker} color={colors.text.muted}>{copy.shelf}</Text>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap={4}>
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} lang={lang} copy={copy} onOpen={open} />
            ))}
          </Grid>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Text {...kicker} color={colors.text.muted}>{copy.mine}</Text>
          {quiet && (
            <Text fontFamily="mono" fontSize="12px" color={colors.text.muted} borderLeft="2px solid" borderColor={colors.accent.signal} pl={3}>
              {copy.quiet}
            </Text>
          )}
          {runs === null && !quiet && <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>...</Text>}
          {runs?.length === 0 && !quiet && <Text fontFamily="mono" fontSize="12px" color={colors.text.muted}>{copy.none}</Text>}
          {runs?.map((run) => <RunCard key={run.id} run={run} events={byRun[run.id]} lang={lang} copy={copy} />)}
        </VStack>
      </VStack>
    </Box>
  );
};

export default Services;
