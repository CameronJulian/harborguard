-- C-1D3: privacy-separated Crowd Intelligence journey pipeline receipts.
--
-- Each row records the most recent Crowd Intelligence processing outcome
-- for one anonymous completed-trip token.
--
-- The table intentionally excludes raw trip, vehicle, user,
-- organization and coordinate identifiers.
--
-- This observability primitive does not define statistical sufficiency,
-- confidence, reliability, representativeness, or Route Safety scoring.

create table if not exists public.crowd_journey_pipeline_receipts (
  trip_token text primary key
    check (length(trim(trip_token)) = 64),

  observed_date date not null,

  outcome text not null
    check (
      outcome in (
        'accepted',
        'skipped',
        'failed'
      )
    ),

  reason text
    check (
      reason is null
      or reason in (
        'trip_not_delivered',
        'invalid_trip_time_order',
        'insufficient_location_points',
        'no_movement_segments',
        'processing_error'
      )
    ),

  traversal_row_count integer not null default 0
    check (traversal_row_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  crowd_journey_pipeline_receipts_observed_date_idx
on public.crowd_journey_pipeline_receipts (
  observed_date desc,
  outcome
);

alter table public.crowd_journey_pipeline_receipts
  enable row level security;

revoke all
on table public.crowd_journey_pipeline_receipts
from public, anon, authenticated;

grant all
on table public.crowd_journey_pipeline_receipts
to service_role;

create or replace function public.upsert_crowd_journey_pipeline_receipt(
  p_trip_token text,
  p_observed_date date,
  p_outcome text,
  p_reason text,
  p_traversal_row_count integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (
    p_trip_token is null
    or length(trim(p_trip_token)) <> 64
  ) then
    raise exception 'p_trip_token must be a 64-character token';
  end if;

  if p_observed_date is null then
    raise exception 'p_observed_date is required';
  end if;

  if p_outcome not in (
    'accepted',
    'skipped',
    'failed'
  ) then
    raise exception 'Unsupported pipeline outcome';
  end if;

  if (
    p_reason is not null
    and p_reason not in (
      'trip_not_delivered',
      'invalid_trip_time_order',
      'insufficient_location_points',
      'no_movement_segments',
      'processing_error'
    )
  ) then
    raise exception 'Unsupported pipeline reason';
  end if;

  if (
    p_traversal_row_count is null
    or p_traversal_row_count < 0
  ) then
    raise exception 'p_traversal_row_count must be non-negative';
  end if;

  insert into public.crowd_journey_pipeline_receipts (
    trip_token,
    observed_date,
    outcome,
    reason,
    traversal_row_count,
    updated_at
  )
  values (
    p_trip_token,
    p_observed_date,
    p_outcome,
    p_reason,
    p_traversal_row_count,
    now()
  )
  on conflict (trip_token)
  do update
  set
    observed_date = excluded.observed_date,
    outcome = excluded.outcome,
    reason = excluded.reason,
    traversal_row_count = excluded.traversal_row_count,
    updated_at = now();
end;
$$;

revoke all
on function public.upsert_crowd_journey_pipeline_receipt(
  text,
  date,
  text,
  text,
  integer
)
from public, anon, authenticated;

grant execute
on function public.upsert_crowd_journey_pipeline_receipt(
  text,
  date,
  text,
  text,
  integer
)
to service_role;

comment on table public.crowd_journey_pipeline_receipts is
  'C-1D3 privacy-separated per-journey Crowd Intelligence processing receipt keyed only by the same anonymous SHA-256 trip token used by crowd_segment_traversals.';

comment on column public.crowd_journey_pipeline_receipts.trip_token is
  'One-way anonymous trip token. Raw trip, vehicle, user and organization identifiers are intentionally excluded.';

comment on column public.crowd_journey_pipeline_receipts.outcome is
  'Latest Crowd Intelligence processing outcome: accepted, skipped or failed.';

comment on column public.crowd_journey_pipeline_receipts.reason is
  'Deterministic C-1A skip/failure reason when applicable; null for accepted processing.';

comment on column public.crowd_journey_pipeline_receipts.traversal_row_count is
  'Number of anonymous crowd_segment_traversals rows produced by the processing attempt.';
