-- B6V 4I-3: durable vehicle-location prune completion evidence.
--
-- Archive integrity state and hot-row pruning state remain separate.
--
-- `status = verified` continues to mean that the immutable archive object
-- was independently verified. A successful hot-row prune is recorded by
-- `pruned_at` + `pruned_row_count`.
--
-- Safety properties:
--   * service-role-only execution remains unchanged;
--   * the exact manifest advisory lock remains unchanged;
--   * the manifest row remains locked FOR UPDATE;
--   * vehicle_locations writers remain blocked during final revalidation
--     and deletion;
--   * prune completion evidence is written in the SAME transaction as the
--     exact hot-row deletion;
--   * durable pruned_row_count must equal the verified manifest row_count;
--   * an exact retry after successful pruning returns the already-recorded
--     durable result and performs no second deletion;
--   * no retention duration or scheduler is introduced here;
--   * no archive object is deleted;
--   * no Crowd Intelligence or ML authority is changed.

alter table public.vehicle_location_archive_manifests
  add column if not exists pruned_at timestamptz,
  add column if not exists pruned_row_count bigint;

alter table public.vehicle_location_archive_manifests
  drop constraint if exists
    vehicle_location_archive_manifests_prune_completion_check;

alter table public.vehicle_location_archive_manifests
  add constraint
    vehicle_location_archive_manifests_prune_completion_check
  check (
    (
      pruned_at is null
      and pruned_row_count is null
    )
    or
    (
      pruned_at is not null
      and pruned_row_count is not null
      and pruned_row_count > 0
      and pruned_row_count = row_count
      and status = 'verified'
      and verified_at is not null
      and failure_reason is null
      and pruned_at >= verified_at
    )
  );

comment on column
  public.vehicle_location_archive_manifests.pruned_at
is
  'Timestamp at which the exact verified hot vehicle-location evidence set was successfully deleted. Null means no completed prune is durably recorded.';

comment on column
  public.vehicle_location_archive_manifests.pruned_row_count
is
  'Exact number of hot vehicle-location rows deleted by the atomic prune transaction. When present it must equal the verified manifest row_count.';


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
   * Serialize every initial or repeated prune attempt for this exact
   * manifest identity.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:vehicle-location-archive-prune:' ||
        p_manifest_id::text,
      0
    )
  );

  /*
   * The manifest is the durable lifecycle authority for both archive
   * verification and prune-completion evidence.
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
   * Exact retry after a previously committed successful prune.
   *
   * Because deletion evidence was persisted atomically with the original
   * DELETE, the absence of hot rows is expected here and must not be
   * interpreted as archive-evidence drift.
   */
  if v_manifest.pruned_at is not null then
    if v_manifest.pruned_row_count is null
       or v_manifest.pruned_row_count <>
          v_manifest.row_count
    then
      raise exception
        'Vehicle location archive durable prune evidence is inconsistent';
    end if;

    return query
    select
      v_manifest.id,
      v_manifest.pruned_row_count;

    return;
  end if;

  if v_manifest.pruned_row_count is not null then
    raise exception
      'Vehicle location archive durable prune evidence is incomplete';
  end if;

  /*
   * Once the application-side eligibility boundary has independently
   * reverified the immutable archive object and SHA evidence, freeze live
   * telemetry writers while the database performs its final evidence
   * revalidation and exact deletion.
   */
  lock table public.vehicle_locations
    in share row exclusive mode;

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

  /*
   * Persist deletion evidence before this transaction may commit.
   *
   * If any statement below fails, PostgreSQL rolls back BOTH the DELETE
   * and this lifecycle transition.
   */
  update public.vehicle_location_archive_manifests
  set
    pruned_at = now(),
    pruned_row_count = v_deleted_row_count,
    updated_at = now()
  where id = v_manifest.id
    and pruned_at is null
    and pruned_row_count is null;

  if not found then
    raise exception
      'Vehicle location archive prune completion could not be recorded';
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
  'B6V service-role-only atomic deletion primitive for one already-verified vehicle-location archive manifest. Revalidates and deletes the exact hot evidence set, persists pruned_at plus pruned_row_count in the same transaction, and returns durable prior completion evidence on exact retry. Defines no retention duration, scheduler, archive-object deletion or ML authority.';
