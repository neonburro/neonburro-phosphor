-- supabase/migrations/20260927103443_secure_handoff_claims.sql
--
-- The QR handoff has two credentials with separate jobs. nonce is a public
-- approval locator. claim_secret_hash is the SHA-256 digest of a 256-bit
-- secret that stays in the desktop browser's memory. A photographed QR can
-- approve a named request, but it cannot claim the resulting session.
--
-- Both transitions take a row lock. Approval verifies current holder access
-- inside the same transaction that names the user. Claim verifies the secret,
-- rechecks current access and consumes the row inside one transaction. The
-- functions are security definer only because they are an internal service
-- role boundary. PUBLIC, anon and authenticated receive no execute grant.
--
-- Existing v1 handoffs cannot have a claim secret retrofitted. They are marked
-- expired during migration and given an unusable digest so no legacy nonce can
-- cross the new boundary. This migration does not create a session or apply
-- itself. No Oxford commas, no em dashes.

alter table public.burrow_handoffs
  add column if not exists claim_secret_hash text,
  add column if not exists expires_at timestamptz;

update public.burrow_handoffs
set claim_secret_hash = repeat('0', 64),
    expires_at = coalesce(expires_at, created_at + interval '10 minutes'),
    status = 'expired'
where claim_secret_hash is null;

update public.burrow_handoffs
set expires_at = created_at + interval '10 minutes'
where expires_at is null;

alter table public.burrow_handoffs
  alter column claim_secret_hash set not null,
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '10 minutes');

alter table public.burrow_handoffs
  drop constraint if exists burrow_handoffs_claim_secret_hash_check,
  add constraint burrow_handoffs_claim_secret_hash_check
    check (claim_secret_hash ~ '^[0-9a-f]{64}$');

alter table public.burrow_handoffs
  drop constraint if exists burrow_handoffs_status_check,
  add constraint burrow_handoffs_status_check
    check (status in ('pending', 'approved', 'used', 'expired'));

create index if not exists burrow_handoffs_open_idx
  on public.burrow_handoffs (status, expires_at)
  where status in ('pending', 'approved');

alter table public.burrow_handoffs enable row level security;

revoke all privileges on table public.burrow_handoffs from public, anon, authenticated;
grant all privileges on table public.burrow_handoffs to service_role;

create or replace function public.approve_burrow_handoff(
  p_nonce uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handoff public.burrow_handoffs%rowtype;
  v_eligible boolean;
begin
  select *
  into v_handoff
  from public.burrow_handoffs
  where nonce = p_nonce
  for update;

  if not found then
    return jsonb_build_object('state', 'unknown');
  end if;

  if v_handoff.expires_at <= clock_timestamp() then
    update public.burrow_handoffs
    set status = 'expired'
    where nonce = p_nonce
      and status in ('pending', 'approved');
    return jsonb_build_object('state', 'expired');
  end if;

  if v_handoff.status = 'used' then
    return jsonb_build_object('state', 'used');
  end if;

  if v_handoff.status = 'expired' then
    return jsonb_build_object('state', 'expired');
  end if;

  select eligible
  into v_eligible
  from public.burrow_holders
  where user_id = p_user_id
  limit 1;

  if coalesce(v_eligible, false) is not true then
    return jsonb_build_object('state', 'under');
  end if;

  if v_handoff.status = 'approved' then
    if v_handoff.user_id = p_user_id then
      return jsonb_build_object('state', 'approved');
    end if;
    return jsonb_build_object('state', 'conflict');
  end if;

  if v_handoff.status <> 'pending' then
    return jsonb_build_object('state', 'conflict');
  end if;

  update public.burrow_handoffs
  set status = 'approved',
      user_id = p_user_id,
      approved_at = clock_timestamp()
  where nonce = p_nonce;

  return jsonb_build_object('state', 'approved');
end;
$$;

create or replace function public.claim_burrow_handoff(
  p_nonce uuid,
  p_claim_secret_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handoff public.burrow_handoffs%rowtype;
  v_eligible boolean;
begin
  select *
  into v_handoff
  from public.burrow_handoffs
  where nonce = p_nonce
  for update;

  if not found then
    return jsonb_build_object('state', 'unknown');
  end if;

  if p_claim_secret_hash is null or v_handoff.claim_secret_hash <> p_claim_secret_hash then
    return jsonb_build_object('state', 'denied');
  end if;

  if v_handoff.expires_at <= clock_timestamp() then
    update public.burrow_handoffs
    set status = 'expired'
    where nonce = p_nonce
      and status in ('pending', 'approved');
    return jsonb_build_object('state', 'expired');
  end if;

  if v_handoff.status = 'pending' then
    return jsonb_build_object('state', 'waiting');
  end if;

  if v_handoff.status = 'used' then
    return jsonb_build_object('state', 'used');
  end if;

  if v_handoff.status = 'expired' then
    return jsonb_build_object('state', 'expired');
  end if;

  if v_handoff.status <> 'approved' or v_handoff.user_id is null then
    return jsonb_build_object('state', 'conflict');
  end if;

  select eligible
  into v_eligible
  from public.burrow_holders
  where user_id = v_handoff.user_id
  limit 1;

  if coalesce(v_eligible, false) is not true then
    update public.burrow_handoffs
    set status = 'expired'
    where nonce = p_nonce;
    return jsonb_build_object('state', 'under');
  end if;

  update public.burrow_handoffs
  set status = 'used',
      used_at = clock_timestamp()
  where nonce = p_nonce;

  return jsonb_build_object(
    'state', 'claimed',
    'user_id', v_handoff.user_id
  );
end;
$$;

comment on function public.approve_burrow_handoff(uuid, uuid) is
  'Service-only atomic approval of a public handoff nonce by a currently eligible holder.';

comment on function public.claim_burrow_handoff(uuid, text) is
  'Service-only atomic claim using the SHA-256 digest of the desktop-only handoff secret.';

revoke all on function public.approve_burrow_handoff(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_burrow_handoff(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_burrow_handoff(uuid, uuid) to service_role;
grant execute on function public.claim_burrow_handoff(uuid, text) to service_role;
