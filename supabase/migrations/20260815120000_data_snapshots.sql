-- T-02 : snapshots catalogue (à appliquer sur le projet Supabase TouRose)
-- Lecture publique des snapshots uniquement. Pas de numéros WhatsApp ici.

create table if not exists public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('ok', 'stale', 'unavailable')),
  unique (source, external_id)
);

alter table public.data_snapshots enable row level security;

create policy "anon_read_catalog_snapshots"
  on public.data_snapshots
  for select
  to anon
  using (true);
