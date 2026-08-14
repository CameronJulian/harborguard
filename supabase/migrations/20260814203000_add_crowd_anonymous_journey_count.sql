-- C-1D5: privacy-safe anonymous journey diversity primitive.
--
-- This migration adds a descriptive count of distinct anonymous
-- completed journeys contributing to each existing Crowd Intelligence
-- exposure bucket.
--
-- Interpretation boundary:
--   - anonymous_journey_count means distinct anonymous completed journeys
--     within one segment/direction/hour/date exposure bucket.
--   - It does NOT mean distinct drivers.
--   - It does NOT mean distinct vehicles.
--   - It does NOT mean distinct customers or organizations.
--   - It does NOT establish statistical independence.
--   - It does NOT establish evidence sufficiency or confidence.
--   - It does NOT affect Route Safety production scoring.

alter table public.crowd_segment_exposure_stats
  add column if not exists anonymous_journey_count bigint;

create or replace function public.aggregate_crowd_segment_exposure_stats(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  aggregated_rows bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_aggregated_rows bigint := 0;
begin
  if (
    p_start_date is not null
    and p_end_date is not null
    and p_end_date < p_start_date
  ) then
    raise exception
      'p_end_date must be greater than or equal to p_start_date';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:crowd_segment_exposure_stats',
      0
    )
  );

  insert into public.crowd_segment_exposure_stats (
    segment_key,
    direction_bucket,
    hour_bucket,
    observed_date,
    traversal_count,
    anonymous_journey_count,
    sample_count,
    first_observed_at,
    last_observed_at,
    updated_at
  )
  select
    traversals.segment_key,
    traversals.direction_bucket,
    traversals.hour_bucket,
    traversals.observed_date,

    count(*)::bigint
      as traversal_count,

    count(
      distinct traversals.trip_token
    )::bigint
      as anonymous_journey_count,

    sum(
      traversals.sample_count
    )::bigint
      as sample_count,

    min(
      traversals.first_seen_at
    )
      as first_observed_at,

    max(
      traversals.last_seen_at
    )
      as last_observed_at,

    now()
      as updated_at

  from public.crowd_segment_traversals
    as traversals

  where
    (
      p_start_date is null
      or traversals.observed_date >=
        p_start_date
    )
    and (
      p_end_date is null
      or traversals.observed_date <=
        p_end_date
    )

  group by
    traversals.segment_key,
    traversals.direction_bucket,
    traversals.hour_bucket,
    traversals.observed_date

  on conflict (
    segment_key,
    direction_bucket,
    hour_bucket,
    observed_date
  )
  do update
  set
    traversal_count =
      excluded.traversal_count,

    anonymous_journey_count =
      excluded.anonymous_journey_count,

    sample_count =
      excluded.sample_count,

    first_observed_at =
      excluded.first_observed_at,

    last_observed_at =
      excluded.last_observed_at,

    updated_at =
      excluded.updated_at;

  get diagnostics
    v_aggregated_rows = row_count;

  return query
  select v_aggregated_rows;
end;
$$;

revoke all
on function public.aggregate_crowd_segment_exposure_stats(
  date,
  date
)
from public, anon, authenticated;

grant execute
on function public.aggregate_crowd_segment_exposure_stats(
  date,
  date
)
to service_role;

-- Recompute all currently materialized exposure buckets so the new
-- descriptive diversity field is populated from the authoritative
-- anonymous traversal evidence.
select *
from public.aggregate_crowd_segment_exposure_stats(
  null,
  null
);

alter table public.crowd_segment_exposure_stats
  alter column anonymous_journey_count
  set not null;

alter table public.crowd_segment_exposure_stats
  drop constraint if exists
    crowd_segment_exposure_stats_anonymous_journey_count_check;

alter table public.crowd_segment_exposure_stats
  add constraint
    crowd_segment_exposure_stats_anonymous_journey_count_check
  check (
    anonymous_journey_count > 0
    and anonymous_journey_count <= traversal_count
  );

comment on column
  public.crowd_segment_exposure_stats.anonymous_journey_count
is
  'Distinct anonymous completed-trip tokens contributing to this segment, direction, UTC hour and observed-date exposure bucket. This is not a count of distinct drivers, vehicles, customers, organizations or statistically independent observations.';

comment on function
  public.aggregate_crowd_segment_exposure_stats(
    date,
    date
  )
is
  'Idempotently recomputes daily anonymous crowd exposure statistics, including descriptive distinct anonymous completed-journey counts, for an optional inclusive observed-date range. Does not define statistical sufficiency, confidence, representativeness or Route Safety production-scoring eligibility.';