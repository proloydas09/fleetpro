create table if not exists public.driver_locations (
  owner_id uuid not null references auth.users (id) on delete cascade,
  driver_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision not null check (accuracy >= 0),
  recorded_at timestamptz not null,
  primary key (owner_id, driver_id)
);

alter table public.driver_locations enable row level security;
revoke all on public.driver_locations from public, anon;
grant select, insert, update on public.driver_locations to authenticated;

drop policy if exists "Admins can read their Driver locations" on public.driver_locations;
create policy "Admins can read their Driver locations"
  on public.driver_locations for select
  to authenticated
  using (
    exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = driver_locations.owner_id
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

drop policy if exists "Drivers can insert their own location" on public.driver_locations;
create policy "Drivers can insert their own location"
  on public.driver_locations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = driver_locations.owner_id
        and access.driver_id = driver_locations.driver_id
        and access.role = 'driver'
    )
  );

drop policy if exists "Drivers can update their own location" on public.driver_locations;
create policy "Drivers can update their own location"
  on public.driver_locations for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = driver_locations.owner_id
        and access.driver_id = driver_locations.driver_id
        and access.role = 'driver'
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = driver_locations.owner_id
        and access.driver_id = driver_locations.driver_id
        and access.role = 'driver'
    )
  );
