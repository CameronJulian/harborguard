-- B6V: private Storage bucket foundation for raw vehicle-location archives.
--
-- This migration establishes only the storage namespace used by the
-- deterministic archive pipeline.
--
-- It does NOT:
--   * upload archive objects;
--   * create archive manifests;
--   * mark archive manifests verified;
--   * delete or prune vehicle_locations;
--   * expose archived telemetry publicly;
--   * establish a retention duration;
--   * change Crowd Intelligence or ML authority.
--
-- Application access is intended to occur only through HarborGuard
-- server-side service-role execution. No authenticated/anonymous
-- storage.objects policies are introduced here.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-location-archives',
  'vehicle-location-archives',
  false,
  null,
  array[
    'application/gzip'
  ]::text[]
)
on conflict (id) do nothing;
