-- supabase/migrations/0003_handoffs.sql
--
-- The phone signs for the desktop. A browser with no wallet shows a QR, the
-- phone that already lives in the stacks scans it and approves, and the
-- desktop receives a real session for the same holder. One nonce, three
-- states, ten minutes to live.
--
-- No policies for anon or authenticated on purpose, every touch goes through
-- the service role in netlify/functions/handoff.js. Idempotent, safe to rerun.
-- No oxford commas, no em dashes.

create table if not exists public.burrow_handoffs (
  nonce uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  used_at timestamptz
);

create index if not exists burrow_handoffs_created_idx on public.burrow_handoffs (created_at);

alter table public.burrow_handoffs enable row level security;

insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
select '20260823040000', 'burrow_handoffs', array['see neonburro-burros/supabase/migrations/0003_handoffs.sql'], 'tyler@neonburro.com'
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = 'burrow_handoffs'
);
