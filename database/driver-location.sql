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
revoke insert, update on public.driver_locations from authenticated;
grant select on public.driver_locations to authenticated;

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
drop policy if exists "Drivers can update their own location" on public.driver_locations;

create or replace function public.driver_update_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision,
  p_recorded_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_driver_id text;
  v_active_driver boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a Driver to share location.';
  end if;

  select access.owner_id, access.driver_id
    into v_owner_id, v_driver_id
  from public.fleet_access access
  where access.user_id = auth.uid()
    and access.role = 'driver';

  if not found then
    raise exception 'This account does not have an active Driver role.';
  end if;

  if p_latitude is null or p_latitude < -90 or p_latitude > 90
      or p_longitude is null or p_longitude < -180 or p_longitude > 180
      or p_accuracy is null or p_accuracy < 0
      or p_recorded_at is null then
    raise exception 'Driver location details are invalid.';
  end if;

  select exists (
    select 1
    from public.fleet_data fleet
    cross join lateral jsonb_array_elements(
      coalesce(fleet.payload->'drivers', '[]'::jsonb)
    ) as driver(value)
    where fleet.owner_id = v_owner_id
      and driver.value->>'id' = v_driver_id
      and driver.value->>'status' = 'active'
  )
    into v_active_driver;

  if not v_active_driver then
    raise exception 'The linked Driver record is missing or inactive.';
  end if;

  insert into public.driver_locations (
    owner_id,
    driver_id,
    user_id,
    latitude,
    longitude,
    accuracy,
    recorded_at
  )
  values (
    v_owner_id,
    v_driver_id,
    auth.uid(),
    p_latitude,
    p_longitude,
    p_accuracy,
    p_recorded_at
  )
  on conflict (owner_id, driver_id) do update
  set user_id = excluded.user_id,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy = excluded.accuracy,
      recorded_at = excluded.recorded_at;
end;
$$;

revoke all on function public.driver_update_location(double precision, double precision, double precision, timestamptz)
  from public, anon, authenticated;
grant execute on function public.driver_update_location(double precision, double precision, double precision, timestamptz)
  to authenticated;
