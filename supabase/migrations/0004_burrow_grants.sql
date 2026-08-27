-- supabase/migrations/0004_burrow_grants.sql
--
-- THE GUEST LIST. A wallet on this table walks through the door no matter
-- what its balance says. Built 2026-08-26 for the send a burro hundred, the
-- open call winners were promised instant phosphor access and the door only
-- knew how to count NEONBURRO, so this is the second way in.
--
-- ── HOW IT IS ENFORCED ──────────────────────────────────────────────────────
-- holder-check.js and holder-sweep.js both read this table and OR it into
-- eligible. The RLS gate on every room table stays is_burrow_eligible(),
-- which reads burrow_holders.eligible, so a grant flows through the same
-- flag as a balance and no policy changes. Without the sweep carve out a
-- grant would be revoked within the hour, which is exactly what happened to
-- a hand set eligible flag before this table existed.
--
-- ── WHO WRITES ──────────────────────────────────────────────────────────────
-- Service role only, RLS on with zero policies. Rows are seeded by hand or
-- by the studio at decision time, one insert per winner wallet with the
-- reason written down, so the guest list reads as a record.
--
-- Idempotent, safe to run twice. No oxford commas, no em dashes.

create table if not exists public.burrow_grants (
  wallet text primary key,
  reason text not null,
  granted_at timestamptz not null default now()
);

alter table public.burrow_grants enable row level security;

comment on table public.burrow_grants is
  'The guest list. A wallet here is eligible for phosphor regardless of balance. Service role only, read by holder-check and holder-sweep in the neonburro-phosphor repo.';

insert into supabase_migrations.schema_migrations (version, name)
  values ('0004', 'burrow_grants')
  on conflict (version) do nothing;
