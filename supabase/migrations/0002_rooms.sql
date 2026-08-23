-- supabase/migrations/0002_rooms.sql
--
-- The rooms and the messages. The burrow reads like a messenger, rooms down
-- the left, the talk on the right, so the schema is a messenger's schema and
-- nothing more. Three rooms to start. The commons for everything, the coin
-- where Epoch sits, the trail for the treasure hunt when it wakes.
--
-- THE GATE, AGAIN, BECAUSE IT MATTERS
-- Every policy here calls is_burrow_eligible() from 0001. A wallet under the
-- line reads nothing and writes nothing, whatever the front end says.
--
-- THE HANDLE IS STAMPED, NEVER TRUSTED
-- A message row carries the speaker's handle so the room renders without a
-- join, but the client does not get to claim one. A trigger reads it off
-- burrow_holders at insert and overwrites whatever was sent.
--
-- REALTIME
-- burrow_messages joins the supabase_realtime publication so the room hears
-- new rows as they land. Postgres changes respect row level security, so the
-- feed is gated by the same policy as the read.
--
-- Idempotent, safe to rerun. No oxford commas, no em dashes.

create table if not exists public.burrow_rooms (
  slug text primary key,
  name text not null,
  line text,
  position integer not null default 100,
  created_at timestamptz not null default now()
);

insert into public.burrow_rooms (slug, name, line, position) values
  ('commons', 'the commons', 'the room for everything. start here.', 10),
  ('the-coin', 'the coin', 'epoch''s desk. ask about NEONBURRO, nothing else opens him.', 20),
  ('the-trail', 'the trail', 'the treasure hunt. quiet until it is not.', 30)
on conflict (slug) do nothing;

create table if not exists public.burrow_messages (
  id bigint generated always as identity primary key,
  room text not null references public.burrow_rooms (slug) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  handle text,
  body text not null,
  lang text,
  created_at timestamptz not null default now()
);

create index if not exists burrow_messages_room_id_idx on public.burrow_messages (room, id desc);

alter table public.burrow_rooms enable row level security;
alter table public.burrow_messages enable row level security;

drop policy if exists "burrow rooms read" on public.burrow_rooms;
create policy "burrow rooms read"
  on public.burrow_rooms for select
  to authenticated
  using (public.is_burrow_eligible());

drop policy if exists "burrow messages read" on public.burrow_messages;
create policy "burrow messages read"
  on public.burrow_messages for select
  to authenticated
  using (public.is_burrow_eligible());

drop policy if exists "burrow messages write own" on public.burrow_messages;
create policy "burrow messages write own"
  on public.burrow_messages for insert
  to authenticated
  with check (
    public.is_burrow_eligible()
    and user_id = (select auth.uid())
    and char_length(body) between 1 and 2000
  );

-- The stamp. Handle and language come from the holder row, not the client.
create or replace function public.stamp_burrow_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select h.handle, coalesce(new.lang, h.lang)
    into new.handle, new.lang
  from public.burrow_holders h
  where h.user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists stamp_burrow_message on public.burrow_messages;
create trigger stamp_burrow_message
  before insert on public.burrow_messages
  for each row execute function public.stamp_burrow_message();

-- Realtime, added only if not already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'burrow_messages'
  ) then
    alter publication supabase_realtime add table public.burrow_messages;
  end if;
end;
$$;

insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
select '20260823030000', 'burrow_rooms_and_messages', array['see neonburro-burros/supabase/migrations/0002_rooms.sql'], 'tyler@neonburro.com'
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = 'burrow_rooms_and_messages'
);
