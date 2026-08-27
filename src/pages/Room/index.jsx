// src/pages/Room/index.jsx
// SENTINEL: NB_BURROW_ROOM_V2
//
// The room, second cut. A messenger. Rooms down the left rail, the talk on
// the right, a composer that would rather be spoken into than typed into.
// The reference Tyler gave is Telegram, and the reading of it here is: a
// rail of rooms, one canvas with grouped bubbles, a wallpaper that is ours
// (the woodblock clouds, ghosted to almost nothing), and not one element
// more.
//
// ── THE LAYOUT ──────────────────────────────────────────────────────────────
// Desktop: rail 300px fixed, chat fills the rest. Phone: two screens, the
// rail first, tap a room and the chat slides in, back returns. State, not
// routes, the burrow has one address and the rooms are furniture.
//
// ── THE TALK ────────────────────────────────────────────────────────────────
// lib/rooms.js fetches the last hundred and subscribes for inserts. Your own
// insert comes back from send() and its realtime echo is dropped by id.
// Messages from the same hand within five minutes group into one block, the
// handle printed once, the way a person talks in bursts.
//
// ── HOLD TO TALK ────────────────────────────────────────────────────────────
// Press and hold the dot, speak, let go, the words are in the input. The Web
// Speech API, on device, free, in the visitor's own language from their
// profile. Where the API is missing (some in app wallet browsers) the dot
// simply is not there and typing still works. Tyler is against typing, the
// dot is the point, the keyboard is the fallback. The studio's hallway at
// neonburro/src/pages/Token/index.jsx carries the same hold to talk mechanic,
// duplicated on purpose, change it thoughtfully in both.
//
// ── EPOCH ───────────────────────────────────────────────────────────────────
// In the coin room, one pinned line under the header says whose desk it is,
// and the desk answers. After a send in the-coin the client knocks on
// netlify/functions/epoch.js, fire and forget, and his reply arrives through
// realtime like anybody's. His handle renders teal, the room's one accent,
// because he is the room's one burro. The deep soul files are still their
// own build, epoch.js carries his v1 and the rules that could not wait.
//
// No oxford commas, no em dashes. hue•man with the interpunct.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, HStack, Text, VStack, Input, useBreakpointValue } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import colors from '../../theme/colors';
import { EASE } from '../../theme/layout';
import { useHolder } from '../../lib/holder';
import { signOut } from '../../lib/wallet';
import { fetchRooms, fetchMessages, sendMessage, onMessage, wakeEpoch } from '../../lib/rooms';
import { t, currentLang } from '../../data/copy';

const kicker = { fontFamily: 'mono', fontSize: '10px', fontWeight: '500', letterSpacing: '0.2em', textTransform: 'uppercase' };
const MONO = 'mono';
const GROUP_S = 300;

// The wallpaper. One drawn swirl, tiled, at five percent. Ours, not a doodle.
const CLOUD =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">' +
    '<g fill="none" stroke="#F4F3F1" stroke-opacity="0.05" stroke-width="1.4">' +
    '<path d="M30 60 q22 -26 44 0 q22 26 44 0 q22 -26 44 0"/>' +
    '<path d="M20 150 a18 18 0 1 1 26 16 a13 13 0 1 0 18 12"/>' +
    '<path d="M140 170 a15 15 0 1 0 22 -14 a11 11 0 1 1 16 -10"/>' +
    '<circle cx="185" cy="45" r="2" fill="#F4F3F1" fill-opacity="0.06" stroke="none"/>' +
    '</g></svg>'
  );

// A handle gets one of five quiet hues, stable forever, never red, never lime.
const HUES = ['#7FD4C8', '#B9A7E8', '#D9C08A', '#9BC0E8', '#C8A79B'];
const hueOf = (h) => HUES[(h || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

const ago = (iso, now) => {
  const s = Math.max(0, now - Math.floor(new Date(iso).getTime() / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const Room = () => {
  const nav = useNavigate();
  const holder = useHolder();
  const [params] = useSearchParams();
  const wanted = params.get('r');
  const desktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [talking, setTalking] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const feed = useRef(null);
  const recog = useRef(null);
  const me = holder.holder?.handle || null;

  useEffect(() => {
    if (holder.state === 'out' || holder.state === 'under') nav('/');
  }, [holder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (holder.state !== 'in') return;
    fetchRooms().then((r) => {
      setRooms(r);
      // ?r walks straight into a named room, the epoch tab uses it for the
      // coin. Otherwise desktop opens the first room and a phone shows the
      // rail.
      if (wanted && r.some((x) => x.slug === wanted)) setOpen(wanted);
      else if (r.length && desktop) setOpen((o) => o || r[0].slug);
    });
  }, [holder.state, desktop]);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    fetchMessages(open).then((m) => { if (live) setMsgs(m); });
    const off = onMessage(open, (row) => {
      setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
    });
    return () => { live = false; off(); };
  }, [open]);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, open]);

  const canTalk = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);

  const holdStart = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    const lang = currentLang();
    r.lang = lang === 'ja' ? 'ja-JP' : lang === 'es' ? 'es-MX' : 'en-US';
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      const said = [...e.results].map((x) => x[0]?.transcript || '').join(' ').trim();
      if (said) setDraft((d) => (d ? `${d} ${said}` : said));
    };
    r.onend = () => setTalking(false);
    recog.current = r;
    setTalking(true);
    r.start();
  };
  const holdEnd = () => { recog.current?.stop(); };

  const send = async () => {
    const body = draft.trim();
    if (!body || !open) return;
    setDraft('');
    const row = await sendMessage(open, body);
    if (row) setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
    if (row) wakeEpoch(open);
  };

  if (holder.state !== 'in') {
    return <VStack flex="1" justify="center"><Text fontFamily={MONO} fontSize="12px" color={colors.text.muted}>...</Text></VStack>;
  }

  const room = rooms.find((r) => r.slug === open) || null;
  const showRail = desktop || !open;
  const showChat = desktop || Boolean(open);

  // Group consecutive messages from one hand inside five minutes.
  const grouped = msgs.reduce((acc, m) => {
    const last = acc[acc.length - 1];
    const ts = Math.floor(new Date(m.created_at).getTime() / 1000);
    if (last && last.handle === m.handle && ts - last.ts < GROUP_S) {
      last.items.push(m);
      last.ts = ts;
    } else {
      acc.push({ handle: m.handle, mine: m.handle === me, ts, items: [m] });
    }
    return acc;
  }, []);

  const leave = async () => { await signOut(); nav('/'); };

  return (
    <HStack flex="1" align="stretch" spacing={0} minH={0}>
      {/* the rail */}
      {showRail && (
        <VStack
          w={{ base: '100%', md: '300px' }}
          flexShrink={0}
          align="stretch"
          spacing={0}
          borderRight={{ md: '1px solid' }}
          borderColor={{ md: colors.surface.line }}
        >
          <HStack justify="space-between" px={5} py={4} borderBottom="1px solid" borderColor={colors.surface.line}>
            <Text {...kicker} color={colors.text.muted}>{t('room_rooms')}</Text>
            {me && <Text fontFamily={MONO} fontSize="12px" color={colors.accent.signal}>{me}</Text>}
          </HStack>
          <VStack align="stretch" spacing={0} overflowY="auto" flex="1">
            {rooms.map((r) => (
              <Box
                key={r.slug}
                as="button"
                type="button"
                textAlign="left"
                onClick={() => setOpen(r.slug)}
                px={5}
                py={4}
                borderLeft="2px solid"
                borderLeftColor={open === r.slug ? colors.accent.signal : 'transparent'}
                bg={open === r.slug ? 'rgba(255,255,255,0.03)' : 'transparent'}
                transition={`background 200ms ${EASE}`}
                _hover={{ bg: 'rgba(255,255,255,0.03)' }}
              >
                <Text fontFamily="heading" fontWeight="600" fontSize="15px" color={colors.text.primary}>{r.name}</Text>
                <Text fontFamily={MONO} fontSize="11px" color={colors.text.muted} mt={1} noOfLines={1}>{r.line}</Text>
              </Box>
            ))}
          </VStack>
          <HStack px={5} py={3} borderTop="1px solid" borderColor={colors.surface.line} justify="space-between">
            <HStack spacing={4}>
              <Box as="button" type="button" onClick={() => nav('/wallet/')} fontFamily={MONO} fontSize="11px" color={colors.accent.signal}>
                {t('nav_wallet')} →
              </Box>
              <Box as="button" type="button" onClick={() => nav('/ledger/')} fontFamily={MONO} fontSize="11px" color={colors.text.muted} _hover={{ color: colors.text.primary }}>
                {t('room_ledger')} →
              </Box>
            </HStack>
            <Box as="button" type="button" onClick={leave} fontFamily={MONO} fontSize="11px" color={colors.text.muted} _hover={{ color: colors.text.primary }}>
              {t('room_leave')}
            </Box>
          </HStack>
        </VStack>
      )}

      {/* the talk */}
      {showChat && (
        <VStack flex="1" align="stretch" spacing={0} minW={0} minH={0}>
          <HStack px={5} py={4} spacing={4} borderBottom="1px solid" borderColor={colors.surface.line}>
            {!desktop && (
              <Box as="button" type="button" onClick={() => setOpen(null)} fontFamily={MONO} fontSize="11px" color={colors.accent.signal}>
                ← {t('room_back')}
              </Box>
            )}
            <VStack align="start" spacing={0}>
              <Text fontFamily="heading" fontWeight="600" fontSize="16px" color={colors.text.primary}>{room?.name || '...'}</Text>
              {room?.line && <Text fontFamily={MONO} fontSize="10px" color={colors.text.muted}>{room.line}</Text>}
            </VStack>
          </HStack>

          {open === 'the-coin' && (
            <HStack px={5} py={2.5} spacing={2.5} bg={colors.accent.signalAlpha[8]} borderBottom="1px solid" borderColor={colors.surface.line}>
              <Box w="6px" h="6px" borderRadius="full" bg={colors.accent.signal} flexShrink={0} />
              <Text fontFamily={MONO} fontSize="11px" color={colors.text.secondary}>{t('room_epoch_pin')}</Text>
            </HStack>
          )}

          <Box ref={feed} flex="1" overflowY="auto" px={{ base: 4, md: 6 }} py={5} bgImage={`url("${CLOUD}")`} bgRepeat="repeat">
            {grouped.length === 0 && (
              <VStack h="100%" justify="center">
                <Text fontFamily={MONO} fontSize="12px" color={colors.text.muted} textAlign="center" px={8}>{t('room_nothing')}</Text>
              </VStack>
            )}
            <VStack align="stretch" spacing={4}>
              {grouped.map((g) => (
                <VStack key={`${g.handle}-${g.items[0].id}`} align={g.mine ? 'end' : 'start'} spacing={1}>
                  {!g.mine && (
                    <Text fontFamily={MONO} fontSize="11px" fontWeight="500" color={g.handle === 'epoch' ? colors.accent.signal : hueOf(g.handle)} px={1}>
                      {g.handle || '·'}
                    </Text>
                  )}
                  {g.items.map((m, i) => (
                    <Box
                      key={m.id}
                      maxW="min(78%, 560px)"
                      px={4}
                      py={2.5}
                      bg={g.mine ? colors.accent.signalAlpha[16] : colors.surface.raised}
                      border="1px solid"
                      borderColor={g.mine ? colors.accent.signalAlpha[32] : colors.surface.line}
                      borderRadius="18px"
                      borderTopLeftRadius={!g.mine && i > 0 ? '8px' : '18px'}
                      borderTopRightRadius={g.mine && i > 0 ? '8px' : '18px'}
                    >
                      <Text fontSize="14px" lineHeight="1.55" color={colors.text.primary} whiteSpace="pre-wrap">{m.body}</Text>
                      {i === g.items.length - 1 && (
                        <Text fontFamily={MONO} fontSize="9px" color={colors.text.muted} textAlign="right" mt={1}>{ago(m.created_at, now)}</Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              ))}
            </VStack>
          </Box>

          <HStack px={{ base: 3, md: 5 }} py={3} spacing={2.5} borderTop="1px solid" borderColor={colors.surface.line}>
            {canTalk && (
              <Box
                as="button"
                type="button"
                onPointerDown={holdStart}
                onPointerUp={holdEnd}
                onPointerLeave={() => talking && holdEnd()}
                aria-label={t('room_hold')}
                title={t('room_hold')}
                w="44px"
                h="44px"
                flexShrink={0}
                borderRadius="full"
                border="1px solid"
                borderColor={talking ? colors.accent.signal : colors.surface.lineStrong}
                bg={talking ? colors.accent.signalAlpha[16] : 'transparent'}
                display="grid"
                placeItems="center"
                transition={`border-color 200ms ${EASE}, background 200ms ${EASE}`}
              >
                <Box w="10px" h="10px" borderRadius="full" bg={talking ? colors.accent.signal : colors.text.muted}
                  boxShadow={talking ? `0 0 12px ${colors.accent.signal}` : 'none'}
                  sx={talking ? { '@keyframes bwPulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.5)' } }, animation: 'bwPulse 1.2s ease-in-out infinite' } : undefined}
                />
              </Box>
            )}
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t('room_say')}
              h="44px"
              borderRadius="full"
            />
            <Box
              as="button"
              type="button"
              onClick={send}
              fontFamily="heading"
              fontWeight="600"
              fontSize="14px"
              px={5}
              h="44px"
              borderRadius="full"
              bg={draft.trim() ? colors.text.primary : colors.surface.raised}
              color={draft.trim() ? colors.text.inverse : colors.text.muted}
              transition={`background 200ms ${EASE}, color 200ms ${EASE}`}
              _hover={draft.trim() ? { bg: colors.accent.signal } : undefined}
            >
              {t('room_send')}
            </Box>
          </HStack>
        </VStack>
      )}
    </HStack>
  );
};

export default Room;
