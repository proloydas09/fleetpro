create table if not exists public.fleet_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'driver')),
  driver_id text,
  constraint fleet_access_role_link_check check (
    (role = 'admin' and driver_id is null and owner_id = user_id)
    or (role = 'driver' and driver_id is not null and owner_id <> user_id)
  )
);

alter table public.fleet_access enable row level security;
revoke all on public.fleet_access from public, anon, authenticated;
grant select on public.fleet_access to authenticated;

drop policy if exists "Users can read their own fleet access" on public.fleet_access;
create policy "Users can read their own fleet access"
  on public.fleet_access for select
  to authenticated
  using (auth.uid() = user_id);

alter table public.fleet_data enable row level security;

drop policy if exists "Owners can read their fleet data" on public.fleet_data;
drop policy if exists "Admins can read their fleet data" on public.fleet_data;
create policy "Admins can read their fleet data"
  on public.fleet_data for select
  to authenticated
  using (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

drop policy if exists "Owners can create their fleet data" on public.fleet_data;
drop policy if exists "Admins can create their fleet data" on public.fleet_data;
create policy "Admins can create their fleet data"
  on public.fleet_data for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

drop policy if exists "Owners can update their fleet data" on public.fleet_data;
drop policy if exists "Admins can update their fleet data" on public.fleet_data;
create policy "Admins can update their fleet data"
  on public.fleet_data for update
  to authenticated
  using (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

grant select, insert, update on public.fleet_data to authenticated;
revoke all on public.fleet_data from public, anon;

create or replace function public.touch_fleet_data_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );
  return new;
end;
$$;

revoke all on function public.touch_fleet_data_updated_at() from public, anon, authenticated;
drop trigger if exists touch_fleet_data_updated_at on public.fleet_data;
create trigger touch_fleet_data_updated_at
  before update on public.fleet_data
  for each row
  execute function public.touch_fleet_data_updated_at();

drop policy if exists "Owners can read trip customer Aadhaar files" on storage.objects;
drop policy if exists "Owners can upload trip customer Aadhaar files" on storage.objects;
drop policy if exists "Owners can delete trip customer Aadhaar files" on storage.objects;
drop policy if exists "Admins can read trip customer Aadhaar files" on storage.objects;
drop policy if exists "Admins can upload trip customer Aadhaar files" on storage.objects;
drop policy if exists "Admins can delete trip customer Aadhaar files" on storage.objects;

create policy "Admins can read trip customer Aadhaar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

create policy "Admins can upload trip customer Aadhaar files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

create policy "Admins can delete trip customer Aadhaar files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.fleet_access access
      where access.user_id = auth.uid()
        and access.owner_id = auth.uid()
        and access.role = 'admin'
    )
  );

create or replace function public.driver_fleet_context()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_driver_id text;
  v_payload jsonb;
  v_owner jsonb;
  v_driver jsonb;
  v_car jsonb;
  v_trips jsonb;
  v_expenses jsonb;
begin
  select access.owner_id, access.driver_id
    into v_owner_id, v_driver_id
  from public.fleet_access access
  where access.user_id = auth.uid()
    and access.role = 'driver';

  if not found then
    raise exception 'This account does not have an active driver role.';
  end if;

  select fleet.payload
    into v_payload
  from public.fleet_data fleet
  where fleet.owner_id = v_owner_id;

  if not found then
    raise exception 'The fleet account is not initialized.';
  end if;

  select driver.value
    into v_driver
  from jsonb_array_elements(coalesce(v_payload->'drivers', '[]'::jsonb)) as driver(value)
  where driver.value->>'id' = v_driver_id
    and driver.value->>'status' = 'active'
  limit 1;

  if v_driver is null then
    raise exception 'The linked driver record is missing or inactive.';
  end if;

  select car.value
    into v_car
  from jsonb_array_elements(coalesce(v_payload->'cars', '[]'::jsonb)) as car(value)
  where car.value->>'id' = v_driver->>'carId'
    and car.value->>'driverId' = v_driver_id
  limit 1;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', trip.value->'id',
      'carId', trip.value->'carId',
      'driverId', trip.value->'driverId',
      'from', trip.value->'from',
      'to', trip.value->'to',
      'distance', trip.value->'distance',
      'fare', trip.value->'fare',
      'date', trip.value->'date',
      'time', trip.value->'time',
      'status', trip.value->'status',
      'notes', trip.value->'notes',
      'startKm', trip.value->'startKm',
      'endKm', trip.value->'endKm',
      'startOdometerPhoto', trip.value->'startOdometerPhoto',
      'endOdometerPhoto', trip.value->'endOdometerPhoto',
      'customerName', trip.value->'customerName',
      'customerPhone', trip.value->'customerPhone'
    ) order by trip.ordinality desc),
    '[]'::jsonb
  )
    into v_trips
  from jsonb_array_elements(coalesce(v_payload->'trips', '[]'::jsonb))
    with ordinality as trip(value, ordinality)
  where trip.value->>'driverId' = v_driver_id;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', expense.value->'id',
      'carId', expense.value->'carId',
      'driverId', expense.value->'driverId',
      'category', expense.value->'category',
      'amount', expense.value->'amount',
      'date', expense.value->'date',
      'description', expense.value->'description',
      'status', expense.value->'status',
      'hasImage', expense.value->'hasImage',
      'imageUrl', expense.value->'imageUrl',
      'submittedBy', expense.value->'submittedBy'
    ) order by expense.ordinality),
    '[]'::jsonb
  )
    into v_expenses
  from jsonb_array_elements(coalesce(v_payload->'expenses', '[]'::jsonb))
    with ordinality as expense(value, ordinality)
  where expense.value->>'driverId' = v_driver_id;

  v_owner := jsonb_build_object(
    'name', coalesce(v_payload->'owner'->>'name', 'Fleet Owner'),
    'business', coalesce(v_payload->'owner'->>'business', 'Fleet'),
    'initials', coalesce(v_payload->'owner'->>'initials', 'FO')
  );

  return jsonb_build_object(
    'owner', v_owner,
    'cars', case
      when v_car is null then '[]'::jsonb
      else jsonb_build_array(jsonb_build_object(
        'id', v_car->'id',
        'plate', v_car->'plate',
        'make', v_car->'make',
        'model', v_car->'model',
        'emoji', v_car->'emoji',
        'status', v_car->'status',
        'driverId', v_car->'driverId',
        'fuelType', v_car->'fuelType',
        'kmReading', v_car->'kmReading'
      ))
    end,
    'drivers', jsonb_build_array(jsonb_build_object(
      'id', v_driver->'id',
      'name', v_driver->'name',
      'phone', v_driver->'phone',
      'initials', v_driver->'initials',
      'status', v_driver->'status',
      'carId', v_driver->'carId',
      'commissionPct', v_driver->'commissionPct'
    )),
    'trips', v_trips,
    'expenses', v_expenses,
    'maintenance', '[]'::jsonb,
    'notifications', '[]'::jsonb,
    'monthlyData', '[]'::jsonb
  );
end;
$$;

create or replace function public.driver_create_trip(p_trip jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_driver_id text;
  v_payload jsonb;
  v_driver jsonb;
  v_car jsonb;
  v_car_index integer;
  v_from text;
  v_to text;
  v_distance numeric;
  v_fare numeric;
  v_start_km numeric;
  v_end_km numeric;
  v_date date;
  v_time time;
  v_start_photo text;
  v_end_photo text;
  v_trip jsonb;
begin
  if p_trip is null or jsonb_typeof(p_trip) <> 'object' then
    raise exception 'Trip details are invalid.';
  end if;

  select access.owner_id, access.driver_id
    into v_owner_id, v_driver_id
  from public.fleet_access access
  where access.user_id = auth.uid()
    and access.role = 'driver';

  if not found then
    raise exception 'This account does not have an active driver role.';
  end if;

  select fleet.payload
    into v_payload
  from public.fleet_data fleet
  where fleet.owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'The fleet account is not initialized.';
  end if;

  select driver.value
    into v_driver
  from jsonb_array_elements(coalesce(v_payload->'drivers', '[]'::jsonb)) as driver(value)
  where driver.value->>'id' = v_driver_id
    and driver.value->>'status' = 'active'
  limit 1;

  if v_driver is null then
    raise exception 'The linked driver record is missing or inactive.';
  end if;

  if nullif(v_driver->>'carId', '') is null
      or p_trip->>'carId' is distinct from v_driver->>'carId' then
    raise exception 'Trips can only be logged for your assigned car.';
  end if;

  select car.value, (car.ordinality - 1)::integer
    into v_car, v_car_index
  from jsonb_array_elements(coalesce(v_payload->'cars', '[]'::jsonb))
    with ordinality as car(value, ordinality)
  where car.value->>'id' = v_driver->>'carId'
    and car.value->>'driverId' = v_driver_id
  limit 1;

  if v_car is null or v_car->>'status' <> 'active' then
    raise exception 'Your assigned car is unavailable for new trips.';
  end if;

  v_from := nullif(btrim(p_trip->>'from'), '');
  v_to := nullif(btrim(p_trip->>'to'), '');
  if v_from is null or v_to is null or length(v_from) > 200 or length(v_to) > 200 then
    raise exception 'Enter a valid trip origin and destination.';
  end if;

  if coalesce(p_trip->>'distance', '') !~ '^[0-9]+([.][0-9]+)?$'
      or coalesce(p_trip->>'fare', '') !~ '^[0-9]+([.][0-9]+)?$'
      or coalesce(p_trip->>'startKm', '') !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Trip distance, fare, and starting odometer must be valid numbers.';
  end if;

  v_distance := (p_trip->>'distance')::numeric;
  v_fare := (p_trip->>'fare')::numeric;
  v_start_km := (p_trip->>'startKm')::numeric;
  if v_distance <= 0 or v_fare <= 0 or v_start_km < 0 then
    raise exception 'Trip distance and fare must be positive, and starting odometer cannot be negative.';
  end if;

  if nullif(p_trip->>'endKm', '') is null then
    v_end_km := null;
  else
    if (p_trip->>'endKm') !~ '^[0-9]+([.][0-9]+)?$' then
      raise exception 'Ending odometer must be a valid number.';
    end if;
    v_end_km := (p_trip->>'endKm')::numeric;
    if v_end_km < v_start_km then
      raise exception 'Ending odometer cannot be less than the starting odometer.';
    end if;
  end if;

  begin
    v_date := (p_trip->>'date')::date;
    v_time := (p_trip->>'time')::time;
  exception when others then
    raise exception 'Enter a valid trip date and time.';
  end;

  if length(coalesce(p_trip->>'customerName', '')) > 200
      or length(coalesce(p_trip->>'customerPhone', '')) > 50
      or length(coalesce(p_trip->>'notes', '')) > 2000 then
    raise exception 'Trip customer details or notes are too long.';
  end if;

  v_start_photo := nullif(p_trip->>'startOdometerPhoto', '');
  v_end_photo := nullif(p_trip->>'endOdometerPhoto', '');
  if (v_start_photo is not null and (
        length(v_start_photo) > 6990550
        or v_start_photo !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
      ))
      or (v_end_photo is not null and (
        length(v_end_photo) > 6990550
        or v_end_photo !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
      )) then
    raise exception 'Odometer photos must be JPEG, PNG, or WebP images no larger than 5 MB.';
  end if;

  v_trip := jsonb_build_object(
    'id', 't' || replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    'carId', v_driver->>'carId',
    'driverId', v_driver_id,
    'from', v_from,
    'to', v_to,
    'distance', v_distance,
    'fare', v_fare,
    'startKm', v_start_km,
    'endKm', v_end_km,
    'startOdometerPhoto', v_start_photo,
    'endOdometerPhoto', v_end_photo,
    'customerName', nullif(btrim(p_trip->>'customerName'), ''),
    'customerPhone', nullif(btrim(p_trip->>'customerPhone'), ''),
    'date', v_date::text,
    'time', to_char(v_time, 'HH24:MI'),
    'status', 'current',
    'createdBy', 'driver',
    'notes', nullif(btrim(p_trip->>'notes'), '')
  );

  v_payload := jsonb_set(
    v_payload,
    '{trips}',
    coalesce(v_payload->'trips', '[]'::jsonb) || jsonb_build_array(v_trip),
    true
  );
  v_payload := jsonb_set(
    v_payload,
    array['cars', v_car_index::text, 'totalEarnings'],
    to_jsonb(coalesce(nullif(v_car->>'totalEarnings', '')::numeric, 0) + v_fare),
    true
  );

  update public.fleet_data
  set payload = v_payload,
      updated_at = pg_catalog.now()
  where owner_id = v_owner_id;
end;
$$;

create or replace function public.driver_create_expense(p_expense jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_driver_id text;
  v_payload jsonb;
  v_driver jsonb;
  v_car jsonb;
  v_amount numeric;
  v_date date;
  v_category text;
  v_description text;
  v_image text;
  v_expense jsonb;
  v_notification jsonb;
begin
  if p_expense is null or jsonb_typeof(p_expense) <> 'object' then
    raise exception 'Expense details are invalid.';
  end if;

  select access.owner_id, access.driver_id
    into v_owner_id, v_driver_id
  from public.fleet_access access
  where access.user_id = auth.uid()
    and access.role = 'driver';

  if not found then
    raise exception 'This account does not have an active driver role.';
  end if;

  select fleet.payload
    into v_payload
  from public.fleet_data fleet
  where fleet.owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'The fleet account is not initialized.';
  end if;

  select driver.value
    into v_driver
  from jsonb_array_elements(coalesce(v_payload->'drivers', '[]'::jsonb)) as driver(value)
  where driver.value->>'id' = v_driver_id
    and driver.value->>'status' = 'active'
  limit 1;

  if v_driver is null or nullif(v_driver->>'carId', '') is null then
    raise exception 'An active driver record with an assigned car is required.';
  end if;

  select car.value
    into v_car
  from jsonb_array_elements(coalesce(v_payload->'cars', '[]'::jsonb)) as car(value)
  where car.value->>'id' = v_driver->>'carId'
    and car.value->>'driverId' = v_driver_id
    and car.value->>'status' = 'active'
  limit 1;

  if v_car is null then
    raise exception 'Your assigned car is unavailable for expenses.';
  end if;

  v_category := p_expense->>'category';
  if v_category is null or v_category not in ('Fuel', 'Maintenance', 'Insurance', 'Permit', 'Toll', 'Washing', 'Other') then
    raise exception 'Choose a valid expense category.';
  end if;

  if coalesce(p_expense->>'amount', '') !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Expense amount must be a valid positive number.';
  end if;
  v_amount := (p_expense->>'amount')::numeric;
  if v_amount <= 0 then
    raise exception 'Expense amount must be greater than zero.';
  end if;

  v_description := nullif(btrim(p_expense->>'description'), '');
  if v_description is null or length(v_description) > 500 then
    raise exception 'Enter an expense description of 500 characters or fewer.';
  end if;

  begin
    v_date := (p_expense->>'date')::date;
  exception when others then
    raise exception 'Enter a valid expense date.';
  end;

  v_image := nullif(p_expense->>'imageUrl', '');
  if v_image is not null and (
      length(v_image) > 6990550
      or v_image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    ) then
    raise exception 'Receipt must be a JPEG, PNG, or WebP image no larger than 5 MB.';
  end if;

  v_expense := jsonb_build_object(
    'id', 'e' || replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    'carId', v_driver->>'carId',
    'driverId', v_driver_id,
    'category', v_category,
    'amount', v_amount,
    'date', v_date::text,
    'description', v_description,
    'status', 'pending',
    'hasImage', v_image is not null,
    'imageUrl', v_image,
    'submittedBy', 'driver'
  );
  v_notification := jsonb_build_object(
    'id', 'n' || replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    'title', 'Driver expense awaiting approval',
    'text', v_driver->>'name' || ' submitted ' || v_amount::text || ' for ' || v_description || '.',
    'time', to_char(pg_catalog.now(), 'HH12:MI AM'),
    'read', false,
    'type', 'expense',
    'refId', v_expense->>'id'
  );

  v_payload := jsonb_set(
    v_payload,
    '{expenses}',
    coalesce(v_payload->'expenses', '[]'::jsonb) || jsonb_build_array(v_expense),
    true
  );
  v_payload := jsonb_set(
    v_payload,
    '{notifications}',
    coalesce(v_payload->'notifications', '[]'::jsonb) || jsonb_build_array(v_notification),
    true
  );

  update public.fleet_data
  set payload = v_payload,
      updated_at = pg_catalog.now()
  where owner_id = v_owner_id;
end;
$$;

revoke all on function public.driver_fleet_context() from public, anon;
revoke all on function public.driver_create_trip(jsonb) from public, anon;
revoke all on function public.driver_create_expense(jsonb) from public, anon;
grant execute on function public.driver_fleet_context() to authenticated;
grant execute on function public.driver_create_trip(jsonb) to authenticated;
grant execute on function public.driver_create_expense(jsonb) to authenticated;
