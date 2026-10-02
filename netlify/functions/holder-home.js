// netlify/functions/holder-home.js
//
// THE HOLDER HOME BOUNDARY. A verified Web3 session and an eligible holder row
// are required before this function allocates a permanent character, changes a
// public profile or creates a service link. The browser never writes identity
// tables directly and never supplies the wallet being changed.
//
// A character assignment survives access changes. If the reviewed image pool
// is empty the assignment remains pending and the holder keeps the same place
// in the record. Referral traffic and verified purchases are counts only. No
// reward, commission, settlement, payout or signing power is created here.
//
// The three-word idea is intentionally absent. If it returns it must be a
// ceremonial keepsake only, never authentication, recovery or payout proof.
// No Oxford commas, no em dashes.

import { randomBytes } from 'node:crypto';
import {
  adminClient,
  corsHeaders,
  json,
  verifiedWalletOf,
} from './_shared.js';

const SERVICE_KEY = 'custom-brand-kit';
const SERVICE_URL = 'https://neonburro.com/services/email-signatures/';
const VISIBILITY = new Set(['hidden', 'short', 'full']);

const tokenOf = (event) => (event.headers.authorization || event.headers.Authorization || '')
  .replace(/^Bearer\s+/i, '');

const bodyOf = (event) => {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
};

const trim = (value, limit) => String(value || '').trim().slice(0, limit);
const shortWallet = (wallet) => `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
const publicCode = () => `r_${randomBytes(24).toString('base64url')}`;

const ownerContext = async (db, token) => {
  if (!token) return { reason: 'no session' };
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { reason: 'no session' };
  const wallet = verifiedWalletOf(user);
  if (!wallet) return { reason: 'identity' };
  const { data: holder, error: holderError } = await db
    .from('burrow_holders')
    .select('wallet,user_id,handle,lang,balance,eligible,first_seen,last_seen,checked_at')
    .eq('wallet', wallet)
    .eq('user_id', user.id)
    .maybeSingle();
  if (holderError) throw new Error(`holder read ${holderError.message}`);
  if (!holder) return { reason: 'identity' };
  if (!holder.eligible) return { reason: 'under' };
  return { user, wallet, holder };
};

const ensureAssignment = async (db, owner) => {
  const { error } = await db.rpc('assign_burrow_character', { p_holder_wallet: owner.wallet });
  if (error) throw new Error(`assignment ${error.message}`);
  const { data: assignment, error: assignmentError } = await db
    .from('burrow_character_assignments')
    .select('id,holder_wallet,character_id,state,assigned_at,created_at,updated_at')
    .eq('holder_wallet', owner.wallet)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error(`assignment read ${assignmentError?.message || 'missing'}`);

  const { error: profileError } = await db.from('burrow_holder_profiles').upsert({
    assignment_id: assignment.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'assignment_id', ignoreDuplicates: true });
  if (profileError) throw new Error(`profile seed ${profileError.message}`);

  const { data: account, error: accountError } = await db.from('referral_accounts').upsert({
    assignment_id: assignment.id,
    state: 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'assignment_id', ignoreDuplicates: true }).select('id,assignment_id,state').maybeSingle();
  if (accountError) throw new Error(`referral account ${accountError.message}`);

  let referralAccount = account;
  if (!referralAccount) {
    const result = await db.from('referral_accounts')
      .select('id,assignment_id,state')
      .eq('assignment_id', assignment.id)
      .maybeSingle();
    if (result.error || !result.data) throw new Error(`referral account read ${result.error?.message || 'missing'}`);
    referralAccount = result.data;
  }

  const currentLink = await db.from('referral_links')
    .select('id,account_id,service_key,public_code,state,created_at')
    .eq('account_id', referralAccount.id)
    .eq('service_key', SERVICE_KEY)
    .eq('state', 'active')
    .maybeSingle();
  if (currentLink.error) throw new Error(`referral link read ${currentLink.error.message}`);
  if (!currentLink.data) {
    const created = await db.from('referral_links').insert({
      account_id: referralAccount.id,
      service_key: SERVICE_KEY,
      public_code: publicCode(),
      state: 'active',
    }).select('id,account_id,service_key,public_code,state,created_at').maybeSingle();
    if (created.error) {
      if (!/duplicate|23505/i.test(created.error.message || '')) throw new Error(`referral link ${created.error.message}`);
    } else if (created.data) {
      await db.from('burrow_character_events').insert({
        assignment_id: assignment.id,
        event_kind: 'service_link_created',
        source_table: 'referral_links',
        source_record_id: created.data.id,
        actor_kind: 'system',
        actor_user_id: owner.user.id,
        visibility: 'owner',
        rule_version: 'referral-v1',
        public_note: 'Your custom brand kit link is ready.',
      });
    }
  }

  if (assignment.character_id && !owner.holder.handle) {
    const character = await db.from('burrow_characters')
      .select('approved_name')
      .eq('id', assignment.character_id)
      .maybeSingle();
    if (character.data?.approved_name) {
      await db.from('burrow_holders')
        .update({ handle: character.data.approved_name })
        .eq('wallet', owner.wallet)
        .is('handle', null);
    }
  }
  return assignment;
};

const directoryFor = async (db) => {
  const profiles = await db.from('burrow_holder_profiles')
    .select('assignment_id,biography,purpose,wallet_visibility,referral_activity_visible,published_at,updated_at')
    .eq('published', true)
    .order('published_at', { ascending: true });
  if (profiles.error || !profiles.data?.length) return [];
  const assignmentIds = profiles.data.map((profile) => profile.assignment_id);
  const assignments = await db.from('burrow_character_assignments')
    .select('id,holder_wallet,character_id,state')
    .in('id', assignmentIds)
    .eq('state', 'assigned');
  if (assignments.error || !assignments.data?.length) return [];
  const characterIds = assignments.data.map((assignment) => assignment.character_id).filter(Boolean);
  const wallets = assignments.data.map((assignment) => assignment.holder_wallet);
  const [characters, holders] = await Promise.all([
    db.from('burrow_characters')
      .select('id,approved_name,avatar_path,portrait_path,biography_seed,purpose_archetype')
      .in('id', characterIds),
    db.from('burrow_holders').select('wallet,balance').in('wallet', wallets),
  ]);
  const characterById = Object.fromEntries((characters.data || []).map((row) => [row.id, row]));
  const balanceByWallet = Object.fromEntries((holders.data || []).map((row) => [row.wallet, Number(row.balance) || 0]));
  const assignmentById = Object.fromEntries(assignments.data.map((row) => [row.id, row]));
  return profiles.data.map((profile) => {
    const assignment = assignmentById[profile.assignment_id];
    const character = characterById[assignment?.character_id];
    if (!assignment || !character) return null;
    const showWallet = profile.wallet_visibility !== 'hidden';
    return {
      assignmentId: assignment.id,
      name: character.approved_name,
      avatarPath: character.avatar_path,
      portraitPath: character.portrait_path,
      biography: profile.biography || character.biography_seed,
      purpose: profile.purpose || character.purpose_archetype,
      wallet: !showWallet ? null : profile.wallet_visibility === 'full'
        ? assignment.holder_wallet
        : shortWallet(assignment.holder_wallet),
      neonburroBalance: showWallet ? balanceByWallet[assignment.holder_wallet] : null,
      referralActivityVisible: profile.referral_activity_visible,
      publishedAt: profile.published_at,
    };
  }).filter(Boolean);
};

const snapshot = async (db, owner) => {
  const assignmentResult = await db.from('burrow_character_assignments')
    .select('id,character_id,state,assigned_at,created_at,updated_at')
    .eq('holder_wallet', owner.wallet)
    .maybeSingle();
  if (assignmentResult.error) throw new Error(`assignment snapshot ${assignmentResult.error.message}`);
  const assignment = assignmentResult.data;
  if (!assignment) return { holder: owner.holder, assignment: null, directory: [] };

  const [profileResult, eventResult, accountResult, characterResult, directory] = await Promise.all([
    db.from('burrow_holder_profiles').select('*').eq('assignment_id', assignment.id).maybeSingle(),
    db.from('burrow_character_events')
      .select('id,event_kind,visibility,public_note,created_at')
      .eq('assignment_id', assignment.id)
      .in('visibility', ['owner', 'public'])
      .order('created_at', { ascending: false })
      .limit(24),
    db.from('referral_accounts').select('id,state,created_at,updated_at').eq('assignment_id', assignment.id).maybeSingle(),
    assignment.character_id
      ? db.from('burrow_characters')
        .select('id,approved_name,avatar_path,portrait_path,biography_seed,purpose_archetype,state')
        .eq('id', assignment.character_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    directoryFor(db),
  ]);
  if (profileResult.error) throw new Error(`profile snapshot ${profileResult.error.message}`);
  if (eventResult.error) throw new Error(`event snapshot ${eventResult.error.message}`);
  if (accountResult.error) throw new Error(`account snapshot ${accountResult.error.message}`);
  if (characterResult.error) throw new Error(`character snapshot ${characterResult.error.message}`);

  let referral = null;
  if (accountResult.data) {
    const [linkResult, summaryResult] = await Promise.all([
      db.from('referral_links')
        .select('id,service_key,public_code,state,created_at')
        .eq('account_id', accountResult.data.id)
        .eq('service_key', SERVICE_KEY)
        .eq('state', 'active')
        .maybeSingle(),
      db.from('referral_owner_summary')
        .select('*')
        .eq('referral_account_id', accountResult.data.id)
        .maybeSingle(),
    ]);
    if (linkResult.error) throw new Error(`link snapshot ${linkResult.error.message}`);
    if (summaryResult.error) throw new Error(`summary snapshot ${summaryResult.error.message}`);
    referral = {
      account: accountResult.data,
      link: linkResult.data ? {
        ...linkResult.data,
        url: `${SERVICE_URL}?nb_ref=${encodeURIComponent(linkResult.data.public_code)}`,
      } : null,
      summary: summaryResult.data || {
        traffic_count: 0,
        attached_order_count: 0,
        confirmed_purchase_count: 0,
        adjusted_purchase_count: 0,
        reversed_purchase_count: 0,
        on_hold_purchase_count: 0,
        last_activity_at: null,
      },
    };
  }

  return {
    holder: {
      handle: owner.holder.handle,
      lang: owner.holder.lang,
      balance: Number(owner.holder.balance) || 0,
      wallet: owner.wallet,
      checkedAt: owner.holder.checked_at,
    },
    assignment,
    character: characterResult.data,
    profile: profileResult.data,
    events: eventResult.data || [],
    referral,
    directory,
  };
};

const updateProfile = async (db, owner, assignment, input) => {
  const current = await db.from('burrow_holder_profiles')
    .select('published')
    .eq('assignment_id', assignment.id)
    .maybeSingle();
  if (current.error) throw new Error(`profile current ${current.error.message}`);
  const published = input.published === true;
  const walletVisibility = VISIBILITY.has(input.walletVisibility) ? input.walletVisibility : 'hidden';
  const now = new Date().toISOString();
  const result = await db.from('burrow_holder_profiles').upsert({
    assignment_id: assignment.id,
    biography: trim(input.biography, 1200),
    purpose: trim(input.purpose, 600),
    wallet_visibility: walletVisibility,
    referral_activity_visible: input.referralActivityVisible === true,
    published,
    published_at: published ? now : null,
    updated_at: now,
  }, { onConflict: 'assignment_id' });
  if (result.error) throw new Error(`profile update ${result.error.message}`);
  if (Boolean(current.data?.published) !== published) {
    const eventResult = await db.from('burrow_character_events').insert({
      assignment_id: assignment.id,
      event_kind: published ? 'profile_published' : 'profile_hidden',
      actor_kind: 'holder',
      actor_user_id: owner.user.id,
      visibility: 'owner',
      rule_version: 'profile-v1',
      public_note: published ? 'Your character joined the holder directory.' : 'Your character left the holder directory.',
    });
    if (eventResult.error) throw new Error(`profile event ${eventResult.error.message}`);
  }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { ok: false, reason: 'method' });
  const db = adminClient();
  if (!db) return json(200, { ok: false, reason: 'quiet' });
  try {
    const owner = await ownerContext(db, tokenOf(event));
    if (!owner.wallet) return json(200, { ok: false, reason: owner.reason });
    const input = bodyOf(event);
    const action = String(input.action || 'ensure');
    const assignment = await ensureAssignment(db, owner);
    if (action === 'profile') await updateProfile(db, owner, assignment, input.profile || {});
    if (!['ensure', 'profile', 'refresh'].includes(action)) return json(400, { ok: false, reason: 'action' });
    const home = await snapshot(db, owner);
    return json(200, { ok: true, home });
  } catch (error) {
    console.error('[holder-home]', error.message);
    const fitting = /relation .* does not exist|function .* does not exist|schema cache/i.test(error.message || '');
    return json(200, { ok: false, reason: fitting ? 'fitting' : 'quiet' });
  }
};

export const config = {
  path: '/.netlify/functions/holder-home',
  rateLimit: {
    windowLimit: 45,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};

export default handler;
