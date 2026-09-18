-- supabase/migrations/20260918033701_phosphor_holder_gate_hardening.sql
--
-- The one-million holder gate and its database guardrails. This migration
-- changes the ruled threshold, gives the bounded sweep a cursor and makes the
-- current Phosphor Data API privileges explicit. It also enforces the server
-- rule that one auth user owns at most one holder wallet.
--
-- The duplicate check fails the migration before the unique index if old data
-- needs a human ruling. Never delete or merge holder history automatically.
-- Idempotent where practical. No oxford commas, no em dashes.

insert into public.burrow_settings (key, value, note, updated_at)
values (
  'min_balance',
  '1000000',
  'whole NEONBURRO a wallet must hold for the Phosphor door to open',
  now()
)
on conflict (key) do update
set value = excluded.value,
    note = excluded.note,
    updated_at = excluded.updated_at;

insert into public.burrow_settings (key, value, note, updated_at)
values (
  'holder_sweep_cursor',
  '',
  'last wallet visited by the bounded Phosphor holder sweep',
  now()
)
on conflict (key) do nothing;

do $$
begin
  if exists (
    select user_id
    from public.burrow_holders
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception using
      message = 'burrow_holders has duplicate user_id values',
      hint = 'Resolve each user to one verified wallet before applying this migration.';
  end if;
end;
$$;

create unique index if not exists burrow_holders_user_unique_idx
  on public.burrow_holders (user_id)
  where user_id is not null;

grant usage on schema public to anon, authenticated, service_role;

revoke all privileges on table public.burrow_settings from anon, authenticated;
revoke all privileges on table public.burrow_holders from anon, authenticated;
revoke all privileges on table public.burrow_rooms from anon, authenticated;
revoke all privileges on table public.burrow_messages from anon, authenticated;
revoke all privileges on table public.burrow_handoffs from anon, authenticated;
revoke all privileges on table public.burrow_grants from anon, authenticated;

grant select on table public.burrow_settings to anon, authenticated;
grant select on table public.burrow_holders to authenticated;
grant select on table public.burrow_rooms to authenticated;
grant select, insert on table public.burrow_messages to authenticated;
grant usage, select on sequence public.burrow_messages_id_seq to authenticated;

grant all privileges on table public.burrow_settings to service_role;
grant all privileges on table public.burrow_holders to service_role;
grant all privileges on table public.burrow_rooms to service_role;
grant all privileges on table public.burrow_messages to service_role;
grant all privileges on table public.burrow_handoffs to service_role;
grant all privileges on table public.burrow_grants to service_role;
grant all privileges on sequence public.burrow_messages_id_seq to service_role;

revoke execute on function public.is_burrow_eligible() from public, anon;
grant execute on function public.is_burrow_eligible() to authenticated, service_role;

revoke execute on function public.stamp_burrow_message() from public, anon, authenticated;
grant execute on function public.stamp_burrow_message() to service_role;
