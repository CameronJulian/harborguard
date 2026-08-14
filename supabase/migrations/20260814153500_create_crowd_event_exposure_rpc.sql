-- C-1C2: descriptive adverse-event exposure normalization.
--
-- This layer is descriptive only.
-- It does not alter Route Safety scoring, rerouting, prediction, or UI behavior.
--
-- Numerator:
--   road_risk_segment_events grouped by canonical road-risk segment_key,
--   UTC event date, and UTC event hour using durable event_at.
--
-- Denominator:
--   crowd_segment_exposure_stats collapsed across all direction buckets for
--   the same segment_key, observed_date, and UTC hour.
--
-- Missing exposure never implies zero exposure. Rows with events but no
-- denominator return events_per_100_traversals as null.

create or replace function public.get_crowd_event_exposure_stats(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  organization_id uuid,
  segment_key text,
  observed_date date,
  hour_bucket smallint,
  event_count bigint,
  traversal_count bigint,
  sample_count bigint,
  events_per_100_traversals numeric
)
language sql
security invoker
set search_path = public
as $$
  with event_buckets as (
    select
      events.organization_id,
      segments.segment_key,
      (events.event_at at time zone 'UTC')::date as observed_date,
      extract(
        hour from events.event_at at time zone 'UTC'
      )::smallint as hour_bucket,
      count(*)::bigint as event_count
    from public.road_risk_segment_events as events
    join public.road_risk_segments as segments
      on segments.id = events.road_risk_segment_id
    where
      (
        p_start_date is null
        or (events.event_at at time zone 'UTC')::date >= p_start_date
      )
      and (
        p_end_date is null
        or (events.event_at at time zone 'UTC')::date <= p_end_date
      )
    group by
      events.organization_id,
      segments.segment_key,
      (events.event_at at time zone 'UTC')::date,
      extract(
        hour from events.event_at at time zone 'UTC'
      )::smallint
  ),
  exposure_buckets as (
    select
      exposure.segment_key,
      exposure.observed_date,
      exposure.hour_bucket,
      sum(exposure.traversal_count)::bigint as traversal_count,
      sum(exposure.sample_count)::bigint as sample_count
    from public.crowd_segment_exposure_stats as exposure
    where
      (
        p_start_date is null
        or exposure.observed_date >= p_start_date
      )
      and (
        p_end_date is null
        or exposure.observed_date <= p_end_date
      )
    group by
      exposure.segment_key,
      exposure.observed_date,
      exposure.hour_bucket
  ),
  combined as (
    select
      events.organization_id,
      coalesce(
        events.segment_key,
        exposure.segment_key
      ) as segment_key,
      coalesce(
        events.observed_date,
        exposure.observed_date
      ) as observed_date,
      coalesce(
        events.hour_bucket,
        exposure.hour_bucket
      )::smallint as hour_bucket,
      coalesce(events.event_count, 0)::bigint as event_count,
      exposure.traversal_count,
      exposure.sample_count
    from event_buckets as events
    full outer join exposure_buckets as exposure
      on exposure.segment_key = events.segment_key
      and exposure.observed_date = events.observed_date
      and exposure.hour_bucket = events.hour_bucket
  )
  select
    combined.organization_id,
    combined.segment_key,
    combined.observed_date,
    combined.hour_bucket,
    combined.event_count,
    combined.traversal_count,
    combined.sample_count,
    case
      when combined.traversal_count is null
        or combined.traversal_count <= 0
      then null
      else round(
        (
          combined.event_count::numeric
          * 100
        )
        / combined.traversal_count::numeric,
        4
      )
    end as events_per_100_traversals
  from combined
  order by
    combined.observed_date desc,
    combined.hour_bucket desc,
    combined.segment_key asc,
    combined.organization_id asc nulls last;
$$;

revoke all
on function public.get_crowd_event_exposure_stats(
  date,
  date
)
from public, anon, authenticated;

grant execute
on function public.get_crowd_event_exposure_stats(
  date,
  date
)
to service_role;

comment on function public.get_crowd_event_exposure_stats(
  date,
  date
) is
  'C-1C2 descriptive adverse-event exposure normalization by canonical segment key, UTC date, and UTC hour. Exposure is collapsed across direction buckets. Event-only rows return a null normalized rate. This function does not alter Route Safety production scoring.';