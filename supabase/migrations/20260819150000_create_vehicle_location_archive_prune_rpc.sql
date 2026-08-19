-- B6V 4I-2: atomic vehicle-location pruning primitive.
--
-- This function is intentionally NOT a retention policy.
-- It accepts one exact archive manifest id only.
--
-- Safety boundary:
--   * service-role-only execution;
--   * manifest must already be verified;
--   * verified_at must be present;
--   * failure_reason must be null;
--   * manifest ownership/scope metadata must be valid;
--   * the manifest row is locked FOR UPDATE;
--   * vehicle_locations writes are blocked for the transaction while the
--     exact live evidence set is revalidated and deleted;
--   * live row count and exact first/last timestamps must still match
--     the verified manifest;
--   * deletion uses the same organization, vehicle, trip and time bounds;
--   * null-organization legacy telemetry can never match;
--   * no archive object is deleted;
--   * no retention duration or schedule is defined.
--
-- The application-side 4H eligibility boundary remains responsible for
-- re-verifying the immutable object and deterministic SHA-256 evidence
-- before this destructive primitive is ever invoked.

create or replace function public.prune_vehicle_locations_for_verified_archive(
  p_manifest_id uuid
)
returns table (
  manifest_id uuid,
  deleted_row_count bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_manifest
    public.vehicle_location_archive_manifests%rowtype;

  v_live_row_count bigint := 0;

  v_live_first_recorded_at timestamptz;
  v_live_last_recorded_at timestamptz;

  v_deleted_row_count bigint := 0;
begin
  if p_manifest_id is null then
    raise exception
      'p_manifest_id is required';
  end if;

  if auth.role() is distinct from 'service_role' then
    raise exception
      'Permission denied';
  end if;

  /*
   * Serialize repeated prune attempts for this exact manifest.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:vehicle-location-archive-prune:' ||
        p_manifest_id::text,
      0
    )
  );

  /*
   * Lock the lifecycle evidence itself so its state cannot change while
   * this transaction is deciding whether deletion is permissible.
   */
  select *
  into v_manifest
  from public.vehicle_location_archive_manifests
  where id = p_manifest_id
  for update;

  if not found then
    raise exception
      'Vehicle location archive manifest not found';
  end if;

  if v_manifest.status <> 'verified' then
    raise exception
      'Vehicle location archive manifest is not verified';
  end if;

  if v_manifest.verified_at is null then
    raise exception
      'Verified vehicle location archive manifest lacks verified_at';
  end if;

  if v_manifest.failure_reason is not null then
    raise exception
      'Verified vehicle location archive manifest contains failure_reason';
  end if;

  if v_manifest.organization_id is null then
    raise exception
      'Vehicle location archive manifest organization_id is required';
  end if;

  if v_manifest.vehicle_id is null then
    raise exception
      'Vehicle location archive manifest vehicle_id is required';
  end if;

  if v_manifest.archive_format <> 'jsonl_gzip' then
    raise exception
      'Unsupported vehicle location archive format';
  end if;

  if v_manifest.row_count is null
     or v_manifest.row_count <= 0
  then
    raise exception
      'Vehicle location archive manifest row_count must be positive';
  end if;

  if v_manifest.first_recorded_at is null
     or v_manifest.last_recorded_at is null
     or v_manifest.first_recorded_at >
        v_manifest.last_recorded_at
  then
    raise exception
      'Vehicle location archive manifest time range is invalid';
  end if;

  if v_manifest.sha256 is null
     or v_manifest.sha256 !~ '^[0-9a-f]{64}$'
  then
    raise exception
      'Vehicle location archive manifest SHA-256 is invalid';
  end if;

  /*
   * The application does its full object/SHA/live-evidence eligibility
   * check before calling this RPC.
   *
   * Once inside the destructive transaction, prevent concurrent
   * INSERT/UPDATE/DELETE operations from changing vehicle_locations
   * between the final database evidence check and DELETE.
   *
   * SHARE ROW EXCLUSIVE conflicts with normal ROW EXCLUSIVE writer locks.
   */
  lock table public.vehicle_locations
    in share row exclusive mode;

  /*
   * Re-read the exact hot evidence set represented by this manifest.
   *
   * Organization equality deliberately excludes legacy rows whose
   * organization_id is null.
   */
  select
    count(*)::bigint,
    min(locations.recorded_at),
    max(locations.recorded_at)
  into
    v_live_row_count,
    v_live_first_recorded_at,
    v_live_last_recorded_at
  from public.vehicle_locations as locations
  where locations.organization_id =
          v_manifest.organization_id
    and locations.vehicle_id =
          v_manifest.vehicle_id
    and (
      (
        v_manifest.trip_id is null
        and locations.trip_id is null
      )
      or locations.trip_id =
           v_manifest.trip_id
    )
    and locations.recorded_at >=
          v_manifest.first_recorded_at
    and locations.recorded_at <=
          v_manifest.last_recorded_at;

  if v_live_row_count <>
       v_manifest.row_count
  then
    raise exception
      'Vehicle location archive row-count evidence changed';
  end if;

  if v_live_first_recorded_at
       is distinct from
       v_manifest.first_recorded_at
  then
    raise exception
      'Vehicle location archive first timestamp evidence changed';
  end if;

  if v_live_last_recorded_at
       is distinct from
       v_manifest.last_recorded_at
  then
    raise exception
      'Vehicle location archive last timestamp evidence changed';
  end if;

  /*
   * Delete only the exact ownership/trip/time scope just validated above.
   *
   * No caller-supplied organization, vehicle, trip or time range can widen
   * this predicate: every boundary comes from the locked verified manifest.
   */
  delete from public.vehicle_locations as locations
  where locations.organization_id =
          v_manifest.organization_id
    and locations.vehicle_id =
          v_manifest.vehicle_id
    and (
      (
        v_manifest.trip_id is null
        and locations.trip_id is null
      )
      or locations.trip_id =
           v_manifest.trip_id
    )
    and locations.recorded_at >=
          v_manifest.first_recorded_at
    and locations.recorded_at <=
          v_manifest.last_recorded_at;

  get diagnostics
    v_deleted_row_count = row_count;

  if v_deleted_row_count <>
       v_manifest.row_count
  then
    raise exception
      'Atomic vehicle location prune deleted an unexpected row count';
  end if;

  return query
  select
    v_manifest.id,
    v_deleted_row_count;
end;
$$;

revoke all
on function public.prune_vehicle_locations_for_verified_archive(
  uuid
)
from public, anon, authenticated;

grant execute
on function public.prune_vehicle_locations_for_verified_archive(
  uuid
)
to service_role;

comment on function
  public.prune_vehicle_locations_for_verified_archive(
    uuid
  )
is
  'B6V service-role-only atomic deletion primitive for one already-verified vehicle-location archive manifest. Locks and revalidates the exact organization, vehicle, trip and recorded-time evidence before bounded deletion. Does not define retention duration, scheduling, archive-object deletion or ML authority.';
