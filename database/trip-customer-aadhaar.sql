insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-customer-aadhaar',
  'trip-customer-aadhaar',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can read trip customer Aadhaar files" on storage.objects;
create policy "Owners can read trip customer Aadhaar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners can upload trip customer Aadhaar files" on storage.objects;
create policy "Owners can upload trip customer Aadhaar files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners can delete trip customer Aadhaar files" on storage.objects;
create policy "Owners can delete trip customer Aadhaar files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-customer-aadhaar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
