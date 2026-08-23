// src/lib/rooms.js
//
// The talk. Fetch the rooms, fetch a room's last hundred messages, send one,
// and hear new ones as they land. Everything rides the visitor's own session,
// so row level security does the gating and this file does none.
//
// ── REALTIME ────────────────────────────────────────────────────────────────
// One channel per open room, postgres_changes on insert, filtered to the
// room. supabase-js carries the session token onto the socket on its own, and
// the publication was joined in migration 0002. Postgres changes respect RLS,
// a wallet under the line hears nothing.
//
// ── OPTIMISM, GENTLY ────────────────────────────────────────────────────────
// send() resolves with the inserted row, and the realtime echo of your own
// message is dropped by id, so a sender sees their line once and instantly.
//
// No oxford commas, no em dashes.

import { supabase } from './supabase';

export const fetchRooms = async () => {
  if (!supabase) return [];
  const { data } = await supabase.from('burrow_rooms').select('slug, name, line, position').order('position');
  return data || [];
};

export const fetchMessages = async (room, limit = 100) => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('burrow_messages')
    .select('id, room, user_id, handle, body, created_at')
    .eq('room', room)
    .order('id', { ascending: false })
    .limit(limit);
  return (data || []).reverse();
};

export const sendMessage = async (room, body) => {
  if (!supabase) return null;
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('burrow_messages')
    .insert({ room, user_id: uid, body })
    .select('id, room, user_id, handle, body, created_at')
    .maybeSingle();
  if (error) {
    console.error('[rooms] send', error.message);
    return null;
  }
  return data;
};

export const onMessage = (room, cb) => {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room-${room}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'burrow_messages', filter: `room=eq.${room}` }, (payload) => cb(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// Taps Epoch's desk after a message lands in the coin room. Fire and forget,
// his reply arrives through realtime like anybody's. The function enforces
// the room, the eligibility and the daily caps, this is just the knock.
export const wakeEpoch = async (room) => {
  if (!supabase || room !== 'the-coin') return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    fetch('/.netlify/functions/epoch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ room }),
    }).catch(() => {});
  } catch { /* the desk stays quiet */ }
};
