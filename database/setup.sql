create table if not exists public.fleet_data (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.fleet_data enable row level security;

drop policy if exists "Owners can read their fleet data" on public.fleet_data;
create policy "Owners can read their fleet data"
  on public.fleet_data for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Owners can create their fleet data" on public.fleet_data;
create policy "Owners can create their fleet data"
  on public.fleet_data for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their fleet data" on public.fleet_data;
create policy "Owners can update their fleet data"
  on public.fleet_data for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update on public.fleet_data to authenticated;
revoke all on public.fleet_data from public, anon;
