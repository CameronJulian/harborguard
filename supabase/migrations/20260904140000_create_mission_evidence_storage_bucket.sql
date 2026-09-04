-- HarborGuard mission evidence private Storage foundation.
--
-- Security contract:
--   * bucket is PRIVATE;
--   * authenticated users may upload only into:
--       missions/<mission-id>/...
--   * the mission must belong to the user's current organization;
--   * authenticated users may read only objects belonging to missions
--     in their current organization;
--   * public/anonymous object access is intentionally NOT granted;
--   * application retrieval should use authenticated access or
--     short-lived signed URLs.
--
-- This migration does NOT:
--   * make evidence public;
--   * grant anonymous access;
--   * grant UPDATE or DELETE access;
--   * alter mission_evidence table RLS;
--   * alter dispatch_missions RLS.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mission-evidence',
  'mission-evidence',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists
  "mission_evidence_storage_insert_own_org"
on storage.objects;

create policy
  "mission_evidence_storage_insert_own_org"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mission-evidence'
  and (storage.foldername(name))[1] = 'missions'
  and array_length(storage.foldername(name), 1) >= 2
  and exists (
    select 1
    from public.dispatch_missions dm
    where
      dm.id::text = (storage.foldername(name))[2]
      and dm.organization_id = public.current_user_org_id()
  )
);


drop policy if exists
  "mission_evidence_storage_select_own_org"
on storage.objects;

create policy
  "mission_evidence_storage_select_own_org"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mission-evidence'
  and (storage.foldername(name))[1] = 'missions'
  and array_length(storage.foldername(name), 1) >= 2
  and exists (
    select 1
    from public.dispatch_missions dm
    where
      dm.id::text = (storage.foldername(name))[2]
      and dm.organization_id = public.current_user_org_id()
  )
);
