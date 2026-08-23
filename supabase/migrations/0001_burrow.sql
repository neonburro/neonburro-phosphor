-- supabase/migrations/0001_burrow.sql
--
-- The burrow's first tables, on the studio's shared project
-- sspbripimqvfdkfbpubq. Two tables, a settings drawer and the holders.
--
-- WHY THE GATE LIVES IN THE DATABASE
-- The front end sends people back to the door, but the front end is a
-- courtesy. Row level security here is the gate. Every table the room grows
-- (threads, replies, sigils) must carry a policy that checks the caller's
-- holder row is eligible, using the is_burrow_eligible() helper below, so a
-- wallet under the line cannot read the room no matter what it runs.
--
-- THE THRESHOLD IS A ROW, NOT A CONSTANT
-- burrow_settings.min_balance is the dial. Pulse edits it, the door reads it
-- through holder-check.js, nothing redeploys. Seeded at five million, Tyler's
-- number, lower it from Pulse if the room feels empty.
--
-- Idempotent, safe to rerun. Apply through the connector or the dashboard SQL
-- editor, the ledger row at the bottom records it either way.
-- No oxford commas, no em dashes.

create table if not exists public.burrow_settings (
  key text primary key,
  value text not null,
  note text,
  updated_at timestamptz not null default now()
);

insert into public.burrow_settings (key, value, note)
values ('min_balance', '5000000', 'whole NEONBURRO a wallet must hold for the door to open')
on conflict (key) do nothing;

create table if not exists public.burrow_holders (
  wallet text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  handle text unique,
  lang text,
  avatar text,
  balance numeric,
  eligible boolean not null default false,
  first_seen timestamptz not null default now(),
  last_seen timestamptz,
  checked_at timestamptz
);

comment on table public.burrow_holders is
  'Every wallet that has ever signed into the burrow at burros.neonburro.com. eligible is the gate, set only by holder-check and holder-sweep from the chain. handle is assigned once and never changes.';

create index if not exists burrow_holders_user_idx on public.burrow_holders (user_id);
create index if not exists burrow_holders_eligible_idx on public.burrow_holders (eligible);

alter table public.burrow_settings enable row level security;
alter table public.burrow_holders enable row level security;

-- The threshold is public. The door quotes it to a wallet under the line and
-- there is nothing secret about a number painted on a door.
drop policy if exists "burrow settings public read" on public.burrow_settings;
create policy "burrow settings public read"
  on public.burrow_settings for select
  to anon, authenticated
  using (key = 'min_balance');

-- A holder reads their own row. Writes come only through the service role in
-- the functions, there is no insert or update policy on purpose.
drop policy if exists "burrow holders read own" on public.burrow_holders;
create policy "burrow holders read own"
  on public.burrow_holders for select
  to authenticated
  using (user_id = (select auth.uid()));

-- The helper every room table's policy will call. Security definer so it can
-- read burrow_holders regardless of the caller's own policies.
create or replace function public.is_burrow_eligible()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select eligible from public.burrow_holders where user_id = auth.uid() limit 1),
    false
  );
$$;

revoke all on function public.is_burrow_eligible() from public;
grant execute on function public.is_burrow_eligible() to authenticated;

insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
select '20260823020000', 'burrow_holders_and_settings', array['see neonburro-burros/supabase/migrations/0001_burrow.sql'], 'tyler@neonburro.com'
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = 'burrow_holders_and_settings'
);
