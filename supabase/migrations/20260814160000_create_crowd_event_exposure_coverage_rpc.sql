-- C-1C3A: descriptive crowd event/exposure evidence coverage.
--
-- This function exposes evidence volume and overlap structure only.
-- It deliberately does not define:
--   - minimum evidence,
--   - statistical sufficiency,
--   - confidence intervals,
--   - reliability thresholds,
--   - representativeness thresholds,
--   - production scoring eligibility.
--
-- Route Safety production scoring remains unchanged.

create or replace function public.get_crowd_event_exposure_coverage(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  total_bucket_count bigint,
  event_exposure_bucket_count bigint,
  exposure_only_bucket_count bigint,
  event_only_bucket_count bigint,
  calculable_rate_bucket_count bigint,
  positive_calculable_rate_bucket_count bigint,
  unique_exposure_segment_count bigint,
  unique_event_segment_count bigint,
  exposure_day_count bigint,
  event_day_count bigint,
  has_event_exposure_overlap boolean
)
language sql
security invoker
set search_path = public
as $$
  with stats as (
    select *
    from public.get_crowd_event_exposure_stats(
      p_start_date,
      p_end_date
    )
  )
  select
    count(*)::bigint as total_bucket_count,

    count(*) filter (
      where event_count > 0
        and traversal_count is not null
    )::bigint as event_exposure_bucket_count,

    count(*) filter (
      where event_count = 0
        and traversal_count is not null
    )::bigint as exposure_only_bucket_count,

    count(*) filter (
      where event_count > 0
        and traversal_count is null
    )::bigint as event_only_bucket_count,

    count(*) filter (
      where events_per_100_traversals is not null
    )::bigint as calculable_rate_bucket_count,

    count(*) filter (
      where event_count > 0
        and events_per_100_traversals is not null
    )::bigint as positive_calculable_rate_bucket_count,

    count(distinct segment_key) filter (
      where traversal_count is not null
    )::bigint as unique_exposure_segment_count,

    count(distinct segment_key) filter (
      where event_count > 0
    )::bigint as unique_event_segment_count,

    count(distinct observed_date) filter (
      where traversal_count is not null
    )::bigint as exposure_day_count,

    count(distinct observed_date) filter (
      where event_count > 0
    )::bigint as event_day_count,

    (
      count(*) filter (
        where event_count > 0
          and traversal_count is not null
      ) > 0
    ) as has_event_exposure_overlap

  from stats;
$$;

revoke all
on function public.get_crowd_event_exposure_coverage(
  date,
  date
)
from public, anon, authenticated;

grant execute
on function public.get_crowd_event_exposure_coverage(
  date,
  date
)
to service_role;

comment on function public.get_crowd_event_exposure_coverage(
  date,
  date
) is
  'C-1C3A descriptive coverage summary for crowd event/exposure evidence. Reports bucket, segment, day, and overlap counts only. Does not define evidence sufficiency, statistical confidence, representativeness, reliability, or Route Safety production-scoring eligibility.';