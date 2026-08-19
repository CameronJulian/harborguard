-- B6V: raw vehicle-location archive manifest foundation.
--
-- This table records durable archive metadata only.
--
-- It does NOT:
--   * upload raw telemetry;
--   * delete vehicle_locations;
--   * establish a retention duration;
--   * schedule archival;
--   * grant historical telemetry access;
--   * change Crowd Intelligence or ML lifecycle behavior.
--
-- A future archive writer may create a pending manifest while producing
-- an external immutable archive object. Only a successfully validated
-- archive may transition to verified.
--
-- A later retention implementation must treat verified archive state as
-- a necessary condition for hot-row pruning, never the Crowd pipeline
-- receipt alone.

create table if not exists public.vehicle_location_archive_manifests (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  vehicle_id uuid not null
    references public.vehicles(id)
    on delete cascade,

  trip_id uuid
    references public.vehicle_trips(id)
    on delete set null,

  archive_format text not null
    check (
      archive_format in (
        'jsonl_gzip',
        'parquet'
      )
    ),

  object_key text not null
    check (
      length(trim(object_key)) > 0
    ),

  first_recorded_at timestamptz not null,

  last_recorded_at timestamptz not null,

  row_count bigint not null
    check (row_count > 0),

  sha256 text not null
    check (
      sha256 ~ '^[0-9a-f]{64}$'
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'verified',
        'failed'
      )
    ),

  verified_at timestamptz,

  failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_location_archive_manifests_time_order_check
    check (
      first_recorded_at <= last_recorded_at
    ),

  constraint vehicle_location_archive_manifests_verified_state_check
    check (
      (
        status = 'verified'
        and verified_at is not null
        and failure_reason is null
      )
      or (
        status = 'pending'
        and verified_at is null
        and failure_reason is null
      )
      or (
        status = 'failed'
        and verified_at is null
        and failure_reason is not null
        and length(trim(failure_reason)) > 0
      )
    ),

  constraint vehicle_location_archive_manifests_object_key_key
    unique (object_key)
);

create index if not exists
  vehicle_location_archive_manifests_org_time_idx
on public.vehicle_location_archive_manifests (
  organization_id,
  first_recorded_at,
  last_recorded_at
);

create index if not exists
  vehicle_location_archive_manifests_vehicle_time_idx
on public.vehicle_location_archive_manifests (
  vehicle_id,
  first_recorded_at,
  last_recorded_at
);

create index if not exists
  vehicle_location_archive_manifests_trip_idx
on public.vehicle_location_archive_manifests (
  trip_id
)
where trip_id is not null;

create index if not exists
  vehicle_location_archive_manifests_status_idx
on public.vehicle_location_archive_manifests (
  status,
  created_at
);

alter table public.vehicle_location_archive_manifests
  enable row level security;

revoke all
on table public.vehicle_location_archive_manifests
from public, anon, authenticated;

grant all
on table public.vehicle_location_archive_manifests
to service_role;

comment on table public.vehicle_location_archive_manifests is
  'Service-role-only B6V manifest describing raw vehicle-location archive objects. A verified manifest is intended to become a necessary future precondition for hot telemetry pruning.';

comment on column public.vehicle_location_archive_manifests.object_key is
  'Provider-independent immutable archive object identifier/path. This migration does not create or upload the object itself.';

comment on column public.vehicle_location_archive_manifests.sha256 is
  'Lowercase SHA-256 checksum of the complete archived telemetry object used for deterministic integrity verification.';

comment on column public.vehicle_location_archive_manifests.status is
  'Archive lifecycle metadata only: pending, verified or failed. This status does not itself delete or mutate vehicle_locations.';
